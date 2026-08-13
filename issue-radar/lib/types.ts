// 도메인 값 집합과 데이터 모델. SPEC 2.2 · 3장을 그대로 옮긴 것이다.
//
// 열거형은 문자열 리터럴 유니온으로 둔다 — 오타가 실행 중이 아니라 컴파일에서 걸리게
// 하기 위해서다. 값 목록은 `as const` 배열 하나에만 적고 타입은 거기서 파생시킨다.
// 검증기(lib/validate.ts)와 분포 집계(lib/metrics.ts)는 런타임에 이 배열을 읽으므로,
// 목록과 타입이 따로 놀 자리를 만들지 않는다.

// ── 열거형 7종 (SPEC 2.2) ─────────────────────────────────────────────

/** 제품군 */
export const PRODUCT_CATEGORIES = ['스마트폰', '태블릿', '노트북', '모니터', 'TV'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** 이슈 카테고리 — 정확히 7개. 이 길이가 곧 분포 차트 조각 수이고 8절 검증 기대값이다. */
export const ISSUE_CATEGORIES = [
  '화질',
  '성능',
  '소비전력',
  '가격',
  '내구성',
  '발열',
  '기타',
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

/** 세부 이슈 */
export const ISSUE_SUBCATEGORIES = [
  '색 균일도',
  '번인',
  '플리커',
  '밝기',
  '색 정확도',
  '화면 잔상',
  '응답 속도',
  '배터리 소모',
  '기타',
] as const;
export type IssueSubcategory = (typeof ISSUE_SUBCATEGORIES)[number];

/** 감성 — 3개 */
export const SENTIMENTS = ['positive', 'negative', 'neutral'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

/** 출처 유형 — 3개 */
export const SOURCE_TYPES = ['news', 'community', 'video'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** 분석 방법 — seed는 샘플에 미리 채운 값, rule은 Phase 6, llm은 범위 밖 */
export const ANALYSIS_METHODS = ['seed', 'rule', 'llm'] as const;
export type AnalysisMethod = (typeof ANALYSIS_METHODS)[number];

/** 언어 — 이번 범위는 한국어만 다룬다 */
export const LANGUAGES = ['ko'] as const;
export type Language = (typeof LANGUAGES)[number];

// ── 데이터 모델 (SPEC 3장) ────────────────────────────────────────────

/** data/products.json — SPEC 3.1 */
export interface Product {
  /** `P-001` 형식 */
  id: string;
  category: ProductCategory;
  brand: string;
  name: string;
  /** 이번 범위에서는 화면에 쓰이지 않는다. Phase 6 분류기의 입력 */
  aliases: string[];
  search_keywords: string[];
  exclude_keywords: string[];
  /** false면 필터 목록과 차트에서 제외한다 */
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** data/feedback_items.json — SPEC 3.2, 300건 */
export interface FeedbackItem {
  /** `FI-0001` ~ `FI-0300` */
  id: string;
  /** `S-01` ~ `S-05` */
  source_id: string;
  /** 출처 내 고유값 */
  external_id: string;
  /** 한국어 12~40자 */
  title: string;
  /** 한국어 60~240자 */
  content_excerpt: string;
  /** `https://example.com/...` 형식의 가짜 URL. 실제 사이트를 가리키지 않는다 */
  original_url: string;
  /** 비식별 값 고정 — `익명1` ~ `익명40` */
  author_name: string;
  /** ISO 8601. 2026-07-15 ~ 2026-08-13 */
  published_at: string;
  /** ISO 8601. published_at + 0~2일 */
  collected_at: string;
  language: Language;
  /** 중복 판별용. 이번 범위에서는 값만 들어 있고 쓰이지 않는다 */
  content_hash: string;
}

/** data/feedback_analyses.json — SPEC 3.3, 300건, 원문과 1:1 */
export interface FeedbackAnalysis {
  /** `FA-0001` ~ `FA-0300` */
  id: string;
  /** FeedbackItem.id와 1:1 */
  feedback_item_id: string;
  /** `P-001` ~ `P-003` */
  product_id: string;
  issue_category: IssueCategory;
  issue_subcategory: IssueSubcategory;
  sentiment: Sentiment;
  /**
   * 한국어 40~100자. 샘플에 미리 채워 둔다 — 앱 실행에 API 키가 한 개도 필요 없게
   * 하기 위해서다. 화면은 이 값을 "참고용 분석 결과"로 표시한다(SPEC 5.6).
   */
  summary: string;
  /** 2~5개 */
  keywords: string[];
  /** 0.60 ~ 0.98 */
  confidence_score: number;
  analysis_method: AnalysisMethod;
  analyzed_at: string;
}

/**
 * 출처 — SPEC 3.4에 따라 이번 범위에서는 파일을 만들지 않고 lib/sources.ts의 상수로 둔다.
 * Phase 7(수집)에서 파일로 승격한다.
 */
export interface Source {
  /** `S-01` ~ `S-05` */
  id: string;
  name: string;
  source_type: SourceType;
}

// ── 조합 타입 (SPEC 7 모듈 경계) ──────────────────────────────────────

/** 로더가 돌려주는 단위. 화면과 집계는 이 타입만 보고 저장소를 알지 못한다. */
export type FeedbackRecord = FeedbackItem & { analysis: FeedbackAnalysis };

/** 기간 필터 값 */
export type Period = 'today' | '7d' | '30d';

/** 두 필터는 AND로 동시에 걸린다(SPEC 5.1) */
export interface FilterState {
  period: Period;
  productId: string | 'all';
}
