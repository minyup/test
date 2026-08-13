// 샘플 300건의 배분표. SPEC 4.2·4.3·4.5 표의 숫자를 그대로 상수로 박아 둔 것이다.
//
// 이 숫자가 곧 SPEC 8.2·8.3 테스트의 기대값이다. 여기서 틀리면 데이터부터 화면까지
// 전부 틀어지므로, 표를 만들자마자 스스로 합계를 검사하고 어긋나면 즉시 실패시킨다.
// 계산해서 채우지 않고 손으로 적은 뒤 검사하는 이유는, 계산으로 만들면 SPEC과 다르게
// 계산해도 자기 자신과는 일치해 통과해 버리기 때문이다.
//
// 실행: node scripts/seed/plan.ts

import { SENTIMENTS, type Sentiment } from '../../lib/types.ts';

// ── 기준 상수 ─────────────────────────────────────────────────────────

/** 기준일 고정. 실행 시각에서 "오늘"을 읽으면 며칠 뒤 테스트가 깨진다(SPEC 4.1) */
export const BASE_DATE = '2026-08-13';

export const TOTAL_COUNT = 300;

export const PRODUCT_IDS = ['P-001', 'P-002', 'P-003'] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

/** SPEC 4.5의 세 구간 */
export const SEGMENTS = ['recent7', 'prev7', 'earlier16'] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_LABEL: Record<Segment, string> = {
  recent7: '최근 7일  (08-07~08-13)',
  prev7: '직전 7일  (07-31~08-06)',
  earlier16: '그 이전 16일 (07-15~07-30)',
};

// ── SPEC 표를 그대로 옮긴 기대값 ──────────────────────────────────────

/** SPEC 4.2 — 제품별 총 건수 */
export const EXPECTED_BY_PRODUCT: Record<ProductId, number> = {
  'P-001': 140,
  'P-002': 90,
  'P-003': 70,
};

/** SPEC 4.2 — 감성별 총 건수 */
export const EXPECTED_BY_SENTIMENT: Record<Sentiment, number> = {
  negative: 135,
  neutral: 105,
  positive: 60,
};

/** SPEC 4.2 — 제품 × 감성 */
export const EXPECTED_PRODUCT_SENTIMENT: Record<ProductId, Record<Sentiment, number>> = {
  'P-001': { negative: 77, neutral: 45, positive: 18 },
  'P-002': { negative: 36, neutral: 33, positive: 21 },
  'P-003': { negative: 22, neutral: 27, positive: 21 },
};

/** SPEC 4.5 — 구간별 총 건수 */
export const EXPECTED_BY_SEGMENT: Record<Segment, number> = {
  recent7: 111,
  prev7: 63,
  earlier16: 126,
};

/** SPEC 4.5 — 구간 × 제품 */
export const EXPECTED_SEGMENT_PRODUCT: Record<Segment, Record<ProductId, number>> = {
  recent7: { 'P-001': 63, 'P-002': 28, 'P-003': 20 },
  prev7: { 'P-001': 26, 'P-002': 20, 'P-003': 17 },
  earlier16: { 'P-001': 51, 'P-002': 42, 'P-003': 33 },
};

/** SPEC 4.5 두 번째 표 — 구간 × 제품의 부정 건수. 급증 구간이 여기서 나온다 */
export const EXPECTED_SEGMENT_PRODUCT_NEGATIVE: Record<Segment, Record<ProductId, number>> = {
  recent7: { 'P-001': 45, 'P-002': 11, 'P-003': 8 },
  prev7: { 'P-001': 12, 'P-002': 8, 'P-003': 5 },
  earlier16: { 'P-001': 20, 'P-002': 17, 'P-003': 9 },
};

/** SPEC 4.5 — 기준일 하루치. "오늘" 필터의 기대값이며 최근 7일에 포함된다 */
export const EXPECTED_TODAY: Record<ProductId, number> = {
  'P-001': 9,
  'P-002': 4,
  'P-003': 3,
};
export const EXPECTED_TODAY_TOTAL = 16;

// ── 배분표 ────────────────────────────────────────────────────────────

/**
 * 구간 × 제품 × 감성. 생성기가 실제로 읽는 표다.
 *
 * 부정은 SPEC 4.5 두 번째 표가 칸마다 값을 정해 두었으므로 그대로 옮겼다.
 * 중립·긍정은 SPEC이 제품 합계(4.2절)만 정하고 구간별로는 정하지 않았으므로
 * 이 파일에서 나눈다. 나눌 때 최근 7일의 긍정을 낮게 잡았다 —
 * P-001에 부정 급증을 심는 구간이라 긍정이 함께 늘면 이야기가 어긋난다.
 */
export const ALLOCATION: Record<Segment, Record<ProductId, Record<Sentiment, number>>> = {
  recent7: {
    'P-001': { negative: 45, neutral: 15, positive: 3 },
    'P-002': { negative: 11, neutral: 10, positive: 7 },
    'P-003': { negative: 8, neutral: 7, positive: 5 },
  },
  prev7: {
    'P-001': { negative: 12, neutral: 10, positive: 4 },
    'P-002': { negative: 8, neutral: 7, positive: 5 },
    'P-003': { negative: 5, neutral: 6, positive: 6 },
  },
  earlier16: {
    'P-001': { negative: 20, neutral: 20, positive: 11 },
    'P-002': { negative: 17, neutral: 16, positive: 9 },
    'P-003': { negative: 9, neutral: 14, positive: 10 },
  },
};

// ── 자기 검사 ─────────────────────────────────────────────────────────

function cell(segment: Segment, product: ProductId): Record<Sentiment, number> {
  return ALLOCATION[segment][product];
}

function cellTotal(segment: Segment, product: ProductId): number {
  const counts = cell(segment, product);
  return SENTIMENTS.reduce((sum, sentiment) => sum + counts[sentiment], 0);
}

/**
 * 배분표가 SPEC 표와 어긋나는 곳을 전부 모아 돌려준다.
 * 첫 어긋남에서 멈추지 않는 이유는, 한 칸을 고치면 다른 칸이 따라 틀어지는 표라
 * 한 번에 전부 보이는 편이 고치기 쉽기 때문이다.
 */
export function checkAllocation(): string[] {
  const problems: string[] = [];

  for (const segment of SEGMENTS) {
    for (const product of PRODUCT_IDS) {
      const actual = cellTotal(segment, product);
      const expected = EXPECTED_SEGMENT_PRODUCT[segment][product];
      if (actual !== expected) {
        problems.push(`구간×제품 ${segment}/${product}: ${actual} ≠ SPEC ${expected}`);
      }

      const actualNegative = cell(segment, product).negative;
      const expectedNegative = EXPECTED_SEGMENT_PRODUCT_NEGATIVE[segment][product];
      if (actualNegative !== expectedNegative) {
        problems.push(
          `구간×제품 부정 ${segment}/${product}: ${actualNegative} ≠ SPEC ${expectedNegative}`,
        );
      }
    }

    const segmentTotal = PRODUCT_IDS.reduce((sum, p) => sum + cellTotal(segment, p), 0);
    if (segmentTotal !== EXPECTED_BY_SEGMENT[segment]) {
      problems.push(`구간 합계 ${segment}: ${segmentTotal} ≠ SPEC ${EXPECTED_BY_SEGMENT[segment]}`);
    }
  }

  for (const product of PRODUCT_IDS) {
    const productTotal = SEGMENTS.reduce((sum, s) => sum + cellTotal(s, product), 0);
    if (productTotal !== EXPECTED_BY_PRODUCT[product]) {
      problems.push(`제품 합계 ${product}: ${productTotal} ≠ SPEC ${EXPECTED_BY_PRODUCT[product]}`);
    }

    for (const sentiment of SENTIMENTS) {
      const actual = SEGMENTS.reduce((sum, s) => sum + cell(s, product)[sentiment], 0);
      const expected = EXPECTED_PRODUCT_SENTIMENT[product][sentiment];
      if (actual !== expected) {
        problems.push(`제품×감성 ${product}/${sentiment}: ${actual} ≠ SPEC ${expected}`);
      }
    }
  }

  for (const sentiment of SENTIMENTS) {
    const actual = SEGMENTS.reduce(
      (sum, s) => sum + PRODUCT_IDS.reduce((inner, p) => inner + cell(s, p)[sentiment], 0),
      0,
    );
    if (actual !== EXPECTED_BY_SENTIMENT[sentiment]) {
      problems.push(`감성 합계 ${sentiment}: ${actual} ≠ SPEC ${EXPECTED_BY_SENTIMENT[sentiment]}`);
    }
  }

  const grandTotal = SEGMENTS.reduce(
    (sum, s) => sum + PRODUCT_IDS.reduce((inner, p) => inner + cellTotal(s, p), 0),
    0,
  );
  if (grandTotal !== TOTAL_COUNT) {
    problems.push(`총합: ${grandTotal} ≠ SPEC ${TOTAL_COUNT}`);
  }

  const todayTotal = PRODUCT_IDS.reduce((sum, p) => sum + EXPECTED_TODAY[p], 0);
  if (todayTotal !== EXPECTED_TODAY_TOTAL) {
    problems.push(`오늘 합계: ${todayTotal} ≠ SPEC ${EXPECTED_TODAY_TOTAL}`);
  }
  for (const product of PRODUCT_IDS) {
    if (EXPECTED_TODAY[product] > EXPECTED_SEGMENT_PRODUCT.recent7[product]) {
      problems.push(
        `오늘 ${product} ${EXPECTED_TODAY[product]}건이 최근 7일 ${EXPECTED_SEGMENT_PRODUCT.recent7[product]}건보다 많다`,
      );
    }
  }

  return problems;
}

/** 어긋나면 던진다. 생성기는 값을 쓰기 전에 반드시 이걸 먼저 부른다. */
export function assertAllocation(): void {
  const problems = checkAllocation();
  if (problems.length > 0) {
    throw new Error(`배분표가 SPEC과 어긋납니다:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
}

// ── 출력 ──────────────────────────────────────────────────────────────

function pad(value: string | number, width: number): string {
  return String(value).padStart(width);
}

function report(): void {
  console.log(`기준일 ${BASE_DATE} · 총 ${TOTAL_COUNT}건\n`);

  console.log('구간 × 제품');
  console.log(`  ${'구간'.padEnd(26)}${pad('P-001', 7)}${pad('P-002', 7)}${pad('P-003', 7)}${pad('합계', 7)}`);
  for (const segment of SEGMENTS) {
    const cells = PRODUCT_IDS.map((p) => cellTotal(segment, p));
    const sum = cells.reduce((a, b) => a + b, 0);
    console.log(
      `  ${SEGMENT_LABEL[segment].padEnd(26)}${cells.map((c) => pad(c, 7)).join('')}${pad(sum, 7)}`,
    );
  }
  const productTotals = PRODUCT_IDS.map((p) => SEGMENTS.reduce((s, seg) => s + cellTotal(seg, p), 0));
  console.log(
    `  ${'합계'.padEnd(26)}${productTotals.map((c) => pad(c, 7)).join('')}${pad(
      productTotals.reduce((a, b) => a + b, 0),
      7,
    )}\n`,
  );

  console.log('제품 × 감성');
  console.log(`  ${'제품'.padEnd(10)}${pad('부정', 7)}${pad('중립', 7)}${pad('긍정', 7)}${pad('합계', 7)}`);
  for (const product of PRODUCT_IDS) {
    const negative = SEGMENTS.reduce((sum, s) => sum + cell(s, product).negative, 0);
    const neutral = SEGMENTS.reduce((sum, s) => sum + cell(s, product).neutral, 0);
    const positive = SEGMENTS.reduce((sum, s) => sum + cell(s, product).positive, 0);
    console.log(
      `  ${product.padEnd(10)}${pad(negative, 7)}${pad(neutral, 7)}${pad(positive, 7)}${pad(
        negative + neutral + positive,
        7,
      )}`,
    );
  }
  const sentimentTotal = (sentiment: Sentiment) =>
    SEGMENTS.reduce(
      (sum, s) => sum + PRODUCT_IDS.reduce((inner, p) => inner + cell(s, p)[sentiment], 0),
      0,
    );
  const negativeTotal = sentimentTotal('negative');
  const neutralTotal = sentimentTotal('neutral');
  const positiveTotal = sentimentTotal('positive');
  console.log(
    `  ${'합계'.padEnd(10)}${pad(negativeTotal, 7)}${pad(neutralTotal, 7)}${pad(positiveTotal, 7)}${pad(
      negativeTotal + neutralTotal + positiveTotal,
      7,
    )}\n`,
  );

  console.log('부정 급증 구간 (SPEC 4.5)');
  const recent = EXPECTED_SEGMENT_PRODUCT_NEGATIVE.recent7['P-001'];
  const previous = EXPECTED_SEGMENT_PRODUCT_NEGATIVE.prev7['P-001'];
  const growth = ((recent - previous) / previous) * 100;
  console.log(`  P-001 부정  최근 7일 ${recent}건 / 직전 7일 ${previous}건 → +${growth.toFixed(1)}%`);
  const recentNegative = PRODUCT_IDS.reduce(
    (sum, p) => sum + EXPECTED_SEGMENT_PRODUCT_NEGATIVE.recent7[p],
    0,
  );
  console.log(
    `  전체 최근 7일 부정 비율  ${recentNegative}/${EXPECTED_BY_SEGMENT.recent7} = ${(
      (recentNegative / EXPECTED_BY_SEGMENT.recent7) *
      100
    ).toFixed(1)}%\n`,
  );

  console.log(
    `오늘(${BASE_DATE}) ${EXPECTED_TODAY_TOTAL}건 — ` +
      PRODUCT_IDS.map((p) => `${p} ${EXPECTED_TODAY[p]}`).join(' · '),
  );
}

if (import.meta.main) {
  report();
  const problems = checkAllocation();
  if (problems.length > 0) {
    console.error('\n배분표가 SPEC과 어긋납니다:');
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }
  console.log('\n배분표가 SPEC 4.2·4.5 표와 모두 일치합니다.');
}
