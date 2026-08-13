import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FeedbackAnalysis, FeedbackItem, FeedbackRecord, Product } from './types';
import {
  validateAnalyses,
  validateItems,
  validatePairing,
  validateProducts,
} from './validate';

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

  const rows = readJsonArray(PRODUCTS_FILE);
  validateOrThrow(PRODUCTS_FILE, validateProducts(PRODUCTS_FILE, rows));

  productCache = rows as Product[];
  return productCache;
}

/**
 * 원문과 분석을 1:1로 이어 붙여 돌려준다.
 * 화면과 집계는 이 타입만 보고, 두 파일로 나뉘어 있다는 것을 알지 못한다.
 */
export function loadFeedback(): FeedbackRecord[] {
  if (feedbackCache) return feedbackCache;

  const itemRows = readJsonArray(ITEMS_FILE);
  const analysisRows = readJsonArray(ANALYSES_FILE);

  // 파일별로 따로 본다. 두 파일의 문제를 한 덩어리로 던지면 어느 파일을 열어야
  // 하는지가 메시지에서 사라진다
  validateOrThrow(ITEMS_FILE, validateItems(ITEMS_FILE, itemRows));
  validateOrThrow(ANALYSES_FILE, validateAnalyses(ANALYSES_FILE, analysisRows));

  const items = itemRows as FeedbackItem[];
  const analyses = analysisRows as FeedbackAnalysis[];

  // 1:1이 깨진 채로 이어 붙이면 화면 건수가 조용히 300건이 아니게 된다
  validateOrThrow(ANALYSES_FILE, validatePairing(items, analyses));

  const analysisByItemId = new Map(analyses.map((analysis) => [analysis.feedback_item_id, analysis]));
  const records = items.map((item) => ({
    ...item,
    // 위 검증을 통과했으므로 짝이 반드시 있다
    analysis: analysisByItemId.get(item.id) as FeedbackAnalysis,
  }));

  feedbackCache = records;
  return records;
}

/** 검증에서 나온 문제 목록을 화면이 읽을 수 있는 오류로 바꾼다(SPEC 5.7) */
function validateOrThrow(file: string, problems: string[]): void {
  if (problems.length === 0) return;
  throw new DataError(
    'schema',
    file,
    `데이터가 스키마를 만족하지 않습니다: data/${file}`,
    problems.slice(0, 20),
  );
}
