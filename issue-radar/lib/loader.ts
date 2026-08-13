import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FeedbackAnalysis, FeedbackItem, FeedbackRecord, Product } from './types';

/**
 * 저장소를 바꿀 때 갈아끼우는 유일한 파일이다(SPEC 1.1).
 *
 * 필터·집계·화면은 데이터가 어디서 오는지 모른다. 지금은 `data/` 안의 JSON 파일을
 * 읽지만, SQLite나 PostgreSQL로 가더라도 아래 두 함수의 구현만 갈면 된다.
 * 그러니 이 파일 밖으로 파일 경로나 JSON이라는 사실이 새 나가면 안 된다.
 */

// ── 오류 ──────────────────────────────────────────────────────────────

/** 화면이 무엇이 잘못됐는지 사람 말로 보여 줄 수 있게 원인과 파일명을 함께 낸다(SPEC 5.7) */
export type DataErrorKind = 'missing' | 'parse' | 'schema';

export class DataError extends Error {
  readonly kind: DataErrorKind;
  /** 문제가 된 파일명. 화면에 그대로 찍는다 */
  readonly file: string;
  /** 스키마 검증에서 나온 상세 목록 */
  readonly details: string[];

  constructor(kind: DataErrorKind, file: string, message: string, details: string[] = []) {
    super(message);
    this.name = 'DataError';
    this.kind = kind;
    this.file = file;
    this.details = details;
  }
}

// ── 파일 읽기 ─────────────────────────────────────────────────────────

const PRODUCTS_FILE = 'products.json';
const ITEMS_FILE = 'feedback_items.json';
const ANALYSES_FILE = 'feedback_analyses.json';

/**
 * `process.cwd()` 기준으로 찾는다. 번들된 뒤에는 이 모듈의 위치가 `.next/` 안으로
 * 옮겨 가므로 `import.meta.url`로 잡으면 경로가 어긋난다.
 */
function dataPath(file: string): string {
  return join(process.cwd(), 'data', file);
}

function readJsonArray(file: string): unknown[] {
  let source: string;
  try {
    source = readFileSync(dataPath(file), 'utf8');
  } catch {
    throw new DataError('missing', file, `데이터 파일을 찾을 수 없습니다: data/${file}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new DataError('parse', file, `데이터 파일이 올바른 JSON이 아닙니다: data/${file}`, [reason]);
  }

  if (!Array.isArray(parsed)) {
    throw new DataError('schema', file, `데이터 파일이 배열이 아닙니다: data/${file}`);
  }
  return parsed;
}

// ── 캐시 ──────────────────────────────────────────────────────────────

/**
 * 한 프로세스 안에서 파일을 한 번만 읽는다. 300건짜리 읽기가 무거워서가 아니라,
 * 대시보드의 다섯 영역이 같은 데이터를 봐야 하기 때문이다.
 * 실패는 캐시하지 않는다 — 파일을 고치고 새로고침하면 바로 반영되어야 한다.
 */
let productCache: Product[] | null = null;
let feedbackCache: FeedbackRecord[] | null = null;

/** 테스트와 데이터 오류 확인에서 캐시를 비울 때 쓴다 */
export function clearLoaderCache(): void {
  productCache = null;
  feedbackCache = null;
}

// ── 공개 인터페이스 (SPEC 7) ──────────────────────────────────────────

export function loadProducts(): Product[] {
  if (productCache) return productCache;

  const rows = readJsonArray(PRODUCTS_FILE) as Product[];
  validateOrThrow(PRODUCTS_FILE, rows.length > 0 ? [] : ['제품이 한 건도 없습니다']);

  productCache = rows;
  return rows;
}

/**
 * 원문과 분석을 1:1로 이어 붙여 돌려준다.
 * 화면과 집계는 이 타입만 보고, 두 파일로 나뉘어 있다는 것을 알지 못한다.
 */
export function loadFeedback(): FeedbackRecord[] {
  if (feedbackCache) return feedbackCache;

  const items = readJsonArray(ITEMS_FILE) as FeedbackItem[];
  const analyses = readJsonArray(ANALYSES_FILE) as FeedbackAnalysis[];

  const analysisByItemId = new Map<string, FeedbackAnalysis>();
  const duplicates: string[] = [];
  for (const analysis of analyses) {
    if (analysisByItemId.has(analysis.feedback_item_id)) {
      duplicates.push(`${analysis.feedback_item_id}에 분석이 둘 이상 붙어 있습니다 (${analysis.id})`);
    }
    analysisByItemId.set(analysis.feedback_item_id, analysis);
  }

  const problems = [...duplicates];
  const records: FeedbackRecord[] = [];
  for (const item of items) {
    const analysis = analysisByItemId.get(item.id);
    if (!analysis) {
      problems.push(`${item.id}에 붙은 분석이 없습니다`);
      continue;
    }
    analysisByItemId.delete(item.id);
    records.push({ ...item, analysis });
  }
  for (const orphan of analysisByItemId.values()) {
    problems.push(`${orphan.id}가 없는 원문 ${orphan.feedback_item_id}을(를) 가리킵니다`);
  }

  validateOrThrow(ANALYSES_FILE, problems);

  feedbackCache = records;
  return records;
}

/**
 * 스키마 검증 자리. 지금은 1:1 대응만 보고, 필수 필드와 열거형 검사는
 * LB-126에서 `lib/validate.ts`를 붙이며 여기로 들어온다.
 */
function validateOrThrow(file: string, problems: string[]): void {
  if (problems.length === 0) return;
  throw new DataError(
    'schema',
    file,
    `데이터가 스키마를 만족하지 않습니다: data/${file}`,
    problems.slice(0, 20),
  );
}
