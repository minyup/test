// 300건을 30일에 나눠 놓는다. SPEC 4.5의 구간 합계를 정확히 지키되, 하루 단위로는
// 들쭉날쭉하게 둔다 — 매일 같은 건수면 추세 그래프가 직선이 되어 급증이 보이지 않는다.
//
// 기준일 2026-08-13은 고정 상수다. 실행 시각에서 "오늘"을 읽으면 며칠 뒤 테스트가 깨진다.
// 오늘 하루는 최근 7일 구간에 포함되므로 따로 더하지 않고, 최근 7일 안에서 떼어 낸다.
//
// 실행: node scripts/seed/dates.ts

import { SENTIMENTS, type Sentiment } from '../../lib/types.ts';
import {
  ALLOCATION,
  BASE_DATE,
  EXPECTED_BY_SEGMENT,
  EXPECTED_TODAY,
  EXPECTED_TODAY_TOTAL,
  PRODUCT_IDS,
  SEGMENTS,
  SEGMENT_LABEL,
  TOTAL_COUNT,
  assertAllocation,
  type ProductId,
  type Segment,
} from './plan.ts';

// ── 30일 달력 ─────────────────────────────────────────────────────────

export const PERIOD_DAYS = 30;

/** 구간이 차지하는 날짜 수. 16 + 7 + 7 = 30 */
const SEGMENT_DAYS: Record<Segment, number> = {
  earlier16: 16,
  prev7: 7,
  recent7: 7,
};

function shiftDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/** 2026-07-15 ~ 2026-08-13, 오름차순 30개 */
export const ALL_DATES: string[] = Array.from({ length: PERIOD_DAYS }, (_, index) =>
  shiftDate(BASE_DATE, index - (PERIOD_DAYS - 1)),
);

/** 구간별 날짜. earlier16 → prev7 → recent7 순으로 이어 붙인 것이 ALL_DATES다 */
export const SEGMENT_DATES: Record<Segment, string[]> = {
  earlier16: ALL_DATES.slice(0, 16),
  prev7: ALL_DATES.slice(16, 23),
  recent7: ALL_DATES.slice(23, 30),
};

/** 기준일. 최근 7일의 마지막 날이다 */
export const TODAY = ALL_DATES[PERIOD_DAYS - 1];

// ── 오늘 하루의 감성 배분 ─────────────────────────────────────────────

/**
 * 오늘(2026-08-13)은 "오늘" 필터의 기대값이라 제품별 건수가 SPEC 4.5에 박혀 있다.
 * 감성까지는 SPEC이 정하지 않았으므로 여기서 나눈다.
 * P-001을 부정 쪽으로 기울인 이유는 급증 구간의 마지막 날이기 때문이다.
 */
export const TODAY_SENTIMENT: Record<ProductId, Record<Sentiment, number>> = {
  'P-001': { negative: 7, neutral: 2, positive: 0 },
  'P-002': { negative: 2, neutral: 1, positive: 1 },
  'P-003': { negative: 1, neutral: 1, positive: 1 },
};

// ── 들쭉날쭉하게 나누기 ───────────────────────────────────────────────

/** 고정 시드 난수. 시드가 고정이라 몇 번을 돌려도 같은 배분이 나온다 */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * total을 slots개로 나눈다. 가중치를 흔들어 하루하루 다르게 만들되,
 * 최대 잉여법으로 반올림해 합계는 정확히 total이 되게 한다.
 * 합계를 나중에 보정하지 않는 이유는, 보정이 들어가면 마지막 칸만 튀기 때문이다.
 */
function spread(total: number, slots: number, random: () => number): number[] {
  if (slots <= 0) return [];
  if (total <= 0) return new Array(slots).fill(0);

  // 0.55 ~ 1.45 사이로 흔든다. 이보다 좁으면 평평해 보이고, 넓으면 0인 날이 생긴다
  const weights = Array.from({ length: slots }, () => 0.55 + random() * 0.9);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const exact = weights.map((weight) => (weight / weightSum) * total);
  const counts = exact.map((value) => Math.floor(value));
  let remainder = total - counts.reduce((a, b) => a + b, 0);

  // 소수부가 큰 칸부터 1씩 얹는다
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; remainder > 0; i += 1, remainder -= 1) {
    counts[order[i % slots].index] += 1;
  }

  return counts;
}

// ── 배분 결과 ─────────────────────────────────────────────────────────

/** 날짜 하나에 들어갈 (제품, 감성)별 건수 */
export interface DailyCell {
  date: string;
  segment: Segment;
  product: ProductId;
  sentiment: Sentiment;
  count: number;
}

/**
 * 구간×제품×감성 배분표를 날짜 단위까지 쪼갠다.
 * 오늘 하루는 SPEC이 건수를 정해 두었으므로 먼저 떼어 내고,
 * 최근 7일의 나머지를 앞 6일에 나눈다.
 */
export function buildDailyCells(): DailyCell[] {
  assertAllocation();

  const cells: DailyCell[] = [];
  let seed = 20260813;

  for (const segment of SEGMENTS) {
    const dates = SEGMENT_DATES[segment];

    for (const product of PRODUCT_IDS) {
      for (const sentiment of SENTIMENTS) {
        const planned = ALLOCATION[segment][product][sentiment];

        if (segment !== 'recent7') {
          seed += 1;
          const counts = spread(planned, dates.length, makeRandom(seed));
          dates.forEach((date, index) => {
            cells.push({ date, segment, product, sentiment, count: counts[index] });
          });
          continue;
        }

        // 최근 7일: 마지막 날(오늘)은 고정값, 앞 6일에 나머지를 나눈다
        const todayCount = TODAY_SENTIMENT[product][sentiment];
        const beforeToday = dates.slice(0, dates.length - 1);
        seed += 1;
        const counts = spread(planned - todayCount, beforeToday.length, makeRandom(seed));
        beforeToday.forEach((date, index) => {
          cells.push({ date, segment, product, sentiment, count: counts[index] });
        });
        cells.push({ date: TODAY, segment, product, sentiment, count: todayCount });
      }
    }
  }

  return cells;
}

/** 날짜 → 총 건수 */
export function countByDate(cells: DailyCell[]): Map<string, number> {
  const byDate = new Map<string, number>(ALL_DATES.map((date) => [date, 0]));
  for (const cell of cells) {
    byDate.set(cell.date, (byDate.get(cell.date) ?? 0) + cell.count);
  }
  return byDate;
}

// ── 자기 검사 ─────────────────────────────────────────────────────────

export function checkDailyCells(cells: DailyCell[]): string[] {
  const problems: string[] = [];

  if (ALL_DATES.length !== PERIOD_DAYS) {
    problems.push(`날짜 수: ${ALL_DATES.length} ≠ ${PERIOD_DAYS}`);
  }
  if (ALL_DATES[0] !== '2026-07-15' || ALL_DATES[PERIOD_DAYS - 1] !== BASE_DATE) {
    problems.push(`기간: ${ALL_DATES[0]} ~ ${ALL_DATES[PERIOD_DAYS - 1]} ≠ 2026-07-15 ~ ${BASE_DATE}`);
  }
  for (const segment of SEGMENTS) {
    if (SEGMENT_DATES[segment].length !== SEGMENT_DAYS[segment]) {
      problems.push(
        `구간 날짜 수 ${segment}: ${SEGMENT_DATES[segment].length} ≠ ${SEGMENT_DAYS[segment]}`,
      );
    }
  }

  const byDate = countByDate(cells);
  for (const date of ALL_DATES) {
    const count = byDate.get(date) ?? 0;
    if (count < 1) {
      problems.push(`${date}: ${count}건 — 30일 모두 최소 1건이어야 한다`);
    }
  }

  for (const segment of SEGMENTS) {
    const actual = SEGMENT_DATES[segment].reduce((sum, date) => sum + (byDate.get(date) ?? 0), 0);
    if (actual !== EXPECTED_BY_SEGMENT[segment]) {
      problems.push(`구간 합계 ${segment}: ${actual} ≠ SPEC ${EXPECTED_BY_SEGMENT[segment]}`);
    }
  }

  const total = [...byDate.values()].reduce((a, b) => a + b, 0);
  if (total !== TOTAL_COUNT) {
    problems.push(`총합: ${total} ≠ SPEC ${TOTAL_COUNT}`);
  }

  const todayByProduct = new Map<ProductId, number>(PRODUCT_IDS.map((p) => [p, 0]));
  for (const cell of cells) {
    if (cell.date === TODAY) {
      todayByProduct.set(cell.product, (todayByProduct.get(cell.product) ?? 0) + cell.count);
    }
  }
  for (const product of PRODUCT_IDS) {
    const actual = todayByProduct.get(product) ?? 0;
    if (actual !== EXPECTED_TODAY[product]) {
      problems.push(`오늘 ${product}: ${actual} ≠ SPEC ${EXPECTED_TODAY[product]}`);
    }
  }
  const todayTotal = byDate.get(TODAY) ?? 0;
  if (todayTotal !== EXPECTED_TODAY_TOTAL) {
    problems.push(`오늘 합계: ${todayTotal} ≠ SPEC ${EXPECTED_TODAY_TOTAL}`);
  }

  // 구간×제품×감성이 배분표와 어긋나지 않았는지 되짚는다
  for (const segment of SEGMENTS) {
    for (const product of PRODUCT_IDS) {
      for (const sentiment of SENTIMENTS) {
        const actual = cells
          .filter((c) => c.segment === segment && c.product === product && c.sentiment === sentiment)
          .reduce((sum, c) => sum + c.count, 0);
        const expected = ALLOCATION[segment][product][sentiment];
        if (actual !== expected) {
          problems.push(`${segment}/${product}/${sentiment}: ${actual} ≠ 배분표 ${expected}`);
        }
      }
    }
  }

  return problems;
}

// ── 출력 ──────────────────────────────────────────────────────────────

function report(cells: DailyCell[]): void {
  const byDate = countByDate(cells);

  console.log(`기간 ${ALL_DATES[0]} ~ ${ALL_DATES[PERIOD_DAYS - 1]} · ${PERIOD_DAYS}일\n`);

  console.log('날짜별 건수');
  // 날짜 순으로 읽히도록 오래된 구간부터 찍는다
  for (const segment of ['earlier16', 'prev7', 'recent7'] as const) {
    console.log(`  [${SEGMENT_LABEL[segment]}]`);
    for (const date of SEGMENT_DATES[segment]) {
      const count = byDate.get(date) ?? 0;
      const bar = '█'.repeat(count);
      const mark = date === TODAY ? '  ← 오늘' : '';
      console.log(`    ${date}  ${String(count).padStart(3)}  ${bar}${mark}`);
    }
    const segmentTotal = SEGMENT_DATES[segment].reduce((sum, d) => sum + (byDate.get(d) ?? 0), 0);
    console.log(`    합계 ${segmentTotal}건\n`);
  }

  const total = [...byDate.values()].reduce((a, b) => a + b, 0);
  const min = Math.min(...byDate.values());
  console.log(`총합 ${total}건 · 하루 최소 ${min}건 · 최대 ${Math.max(...byDate.values())}건`);

  const todayCells = cells.filter((c) => c.date === TODAY);
  const todayByProduct = PRODUCT_IDS.map(
    (p) => `${p} ${todayCells.filter((c) => c.product === p).reduce((s, c) => s + c.count, 0)}`,
  );
  console.log(`오늘(${TODAY}) ${byDate.get(TODAY)}건 — ${todayByProduct.join(' · ')}`);
}

if (import.meta.main) {
  const cells = buildDailyCells();
  report(cells);

  const problems = checkDailyCells(cells);
  if (problems.length > 0) {
    console.error('\n날짜 배분이 SPEC과 어긋납니다:');
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }
  console.log('\n날짜 배분이 SPEC 4.1·4.5와 모두 일치합니다.');
}
