import {
  ANALYSIS_METHODS,
  ISSUE_CATEGORIES,
  ISSUE_SUBCATEGORIES,
  LANGUAGES,
  PRODUCT_CATEGORIES,
  SENTIMENTS,
} from './types';
import type { FeedbackAnalysis, FeedbackItem } from './types';

/**
 * 데이터 스키마 검증기(SPEC 5.7).
 *
 * 잡는 것은 세 가지다 — 필수 필드 누락, 열거형 밖의 값, 원문↔분석 1:1 대응 깨짐.
 *
 * 메시지에는 언제나 **레코드 id와 필드명**을 함께 넣는다. 이 데이터는 사람이 파일을
 * 열어 손으로 고칠 것이라, "검증 실패"만 알리면 어디를 고쳐야 하는지 알 수 없다.
 * id가 없거나 문자열이 아닌 레코드는 고칠 자리를 배열 첨자로 가리킨다.
 *
 * 열거형 목록은 `types.ts`의 `as const` 배열을 그대로 읽는다. 여기에 값을 옮겨 적으면
 * 타입과 검증이 따로 노는 자리가 생긴다.
 */

// ── 필드 명세 ─────────────────────────────────────────────────────────

type FieldKind = 'string' | 'number' | 'boolean' | 'string[]';

interface FieldSpec {
  name: string;
  kind: FieldKind;
  /** 열거형 필드면 허용값 목록. 없으면 값 범위를 보지 않는다 */
  allowed?: readonly string[];
}

/** SPEC 3.1 */
const PRODUCT_FIELDS: FieldSpec[] = [
  { name: 'id', kind: 'string' },
  { name: 'category', kind: 'string', allowed: PRODUCT_CATEGORIES },
  { name: 'brand', kind: 'string' },
  { name: 'name', kind: 'string' },
  { name: 'aliases', kind: 'string[]' },
  { name: 'search_keywords', kind: 'string[]' },
  { name: 'exclude_keywords', kind: 'string[]' },
  { name: 'is_active', kind: 'boolean' },
  { name: 'created_at', kind: 'string' },
  { name: 'updated_at', kind: 'string' },
];

/** SPEC 3.2 */
const ITEM_FIELDS: FieldSpec[] = [
  { name: 'id', kind: 'string' },
  { name: 'source_id', kind: 'string' },
  { name: 'external_id', kind: 'string' },
  { name: 'title', kind: 'string' },
  { name: 'content_excerpt', kind: 'string' },
  { name: 'original_url', kind: 'string' },
  { name: 'author_name', kind: 'string' },
  { name: 'published_at', kind: 'string' },
  { name: 'collected_at', kind: 'string' },
  { name: 'language', kind: 'string', allowed: LANGUAGES },
  { name: 'content_hash', kind: 'string' },
];

/** SPEC 3.3 */
const ANALYSIS_FIELDS: FieldSpec[] = [
  { name: 'id', kind: 'string' },
  { name: 'feedback_item_id', kind: 'string' },
  { name: 'product_id', kind: 'string' },
  { name: 'issue_category', kind: 'string', allowed: ISSUE_CATEGORIES },
  { name: 'issue_subcategory', kind: 'string', allowed: ISSUE_SUBCATEGORIES },
  { name: 'sentiment', kind: 'string', allowed: SENTIMENTS },
  { name: 'summary', kind: 'string' },
  { name: 'keywords', kind: 'string[]' },
  { name: 'confidence_score', kind: 'number' },
  { name: 'analysis_method', kind: 'string', allowed: ANALYSIS_METHODS },
  { name: 'analyzed_at', kind: 'string' },
];

// ── 한 레코드 검사 ────────────────────────────────────────────────────

const KIND_LABEL: Record<FieldKind, string> = {
  string: '문자열',
  number: '숫자',
  boolean: '참/거짓',
  'string[]': '문자열 배열',
};

function matchesKind(value: unknown, kind: FieldKind): boolean {
  switch (kind) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'string[]':
      return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
  }
}

/**
 * 고칠 자리를 가리키는 이름.
 * id를 읽을 수 있으면 id로, 못 읽으면 파일 안 몇 번째인지로 가리킨다.
 */
function label(file: string, row: unknown, index: number): string {
  if (row !== null && typeof row === 'object' && 'id' in row) {
    const id = (row as { id: unknown }).id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return `${file}[${index}]`;
}

function checkRow(file: string, row: unknown, index: number, fields: FieldSpec[]): string[] {
  const where = label(file, row, index);

  if (row === null || typeof row !== 'object' || Array.isArray(row)) {
    return [`${where}: 레코드가 객체가 아닙니다`];
  }

  const problems: string[] = [];
  const record = row as Record<string, unknown>;

  for (const field of fields) {
    // 값이 undefined로 들어 있는 것도 누락으로 본다 — 파일에서 지운 것과 결과가 같다
    if (!Object.hasOwn(record, field.name) || record[field.name] === undefined) {
      problems.push(`${where}: 필수 필드 누락: ${field.name}`);
      continue;
    }

    const value = record[field.name];
    if (!matchesKind(value, field.kind)) {
      problems.push(
        `${where}: ${field.name}은(는) ${KIND_LABEL[field.kind]}이어야 하는데 ${JSON.stringify(value)}입니다`,
      );
      continue;
    }

    if (field.allowed && !field.allowed.includes(value as string)) {
      problems.push(
        `${where}: ${field.name} 값 ${JSON.stringify(value)}은(는) 허용값이 아닙니다 (${field.allowed.join(', ')})`,
      );
    }
  }

  return problems;
}

function checkRows(file: string, rows: unknown[], fields: FieldSpec[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    problems.push(...checkRow(file, row, index, fields));

    const id = (row as { id?: unknown })?.id;
    if (typeof id === 'string') {
      if (seen.has(id)) problems.push(`${id}: 중복된 id입니다`);
      seen.add(id);
    }
  });

  return problems;
}

// ── 공개 함수 ─────────────────────────────────────────────────────────

export function validateProducts(file: string, rows: unknown[]): string[] {
  const problems = checkRows(file, rows, PRODUCT_FIELDS);
  if (rows.length === 0) problems.push('제품이 한 건도 없습니다');
  return problems;
}

export function validateItems(file: string, rows: unknown[]): string[] {
  return checkRows(file, rows, ITEM_FIELDS);
}

export function validateAnalyses(file: string, rows: unknown[]): string[] {
  return checkRows(file, rows, ANALYSIS_FIELDS);
}

/**
 * 원문과 분석의 1:1 대응(SPEC 3.3).
 *
 * 짝이 없는 쪽을 양방향으로 다 잡는다 — 분석이 빠진 원문, 원문이 없는 분석,
 * 한 원문에 둘 이상 붙은 분석. 어느 경우든 화면의 300건이 300건이 아니게 된다.
 */
export function validatePairing(items: FeedbackItem[], analyses: FeedbackAnalysis[]): string[] {
  const problems: string[] = [];
  const analysisByItemId = new Map<string, FeedbackAnalysis>();

  for (const analysis of analyses) {
    const itemId = analysis.feedback_item_id;
    if (analysisByItemId.has(itemId)) {
      problems.push(
        `${analysis.id}: feedback_item_id ${itemId}에 분석이 둘 이상 붙어 있습니다 (${analysisByItemId.get(itemId)?.id}와 중복)`,
      );
      continue;
    }
    analysisByItemId.set(itemId, analysis);
  }

  const matched = new Set<string>();
  for (const item of items) {
    if (analysisByItemId.has(item.id)) {
      matched.add(item.id);
    } else {
      problems.push(`${item.id}: 이 원문에 붙은 분석이 없습니다`);
    }
  }

  for (const [itemId, analysis] of analysisByItemId) {
    if (!matched.has(itemId)) {
      problems.push(`${analysis.id}: feedback_item_id ${itemId}에 해당하는 원문이 없습니다`);
    }
  }

  return problems;
}
