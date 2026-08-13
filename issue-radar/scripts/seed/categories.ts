// 300건에 이슈 카테고리와 세부 이슈를 붙인다.
//
// 카테고리 합계는 SPEC 4.3 표에 박혀 있고(화질 96 · 성능 54 · 발열 39 · 소비전력 33 ·
// 내구성 30 · 가격 27 · 기타 21), 7개 모두 0보다 커야 한다. 하나라도 0이 되면 분포 차트
// 조각이 7개가 아니게 되므로 생성 단계에서 막는다.
//
// 최근 7일 P-001의 부정 45건은 화질/색 균일도에 몰아 둔다 — 디스플레이 개발자가 볼
// 이야기여야 하기 때문이다(SPEC 4.5).
//
// 실행: node scripts/seed/categories.ts

import { ISSUE_CATEGORIES, type IssueCategory, type IssueSubcategory, type Sentiment } from '../../lib/types.ts';
import { PRODUCT_IDS, type ProductId, type Segment } from './plan.ts';
import { ALL_DATES, buildDailyCells, type DailyCell } from './dates.ts';

// ── SPEC 4.3 기대값 ───────────────────────────────────────────────────

export const EXPECTED_BY_CATEGORY: Record<IssueCategory, number> = {
  화질: 96,
  성능: 54,
  발열: 39,
  소비전력: 33,
  내구성: 30,
  가격: 27,
  기타: 21,
};

/**
 * 제품 × 카테고리. 행 합계는 SPEC 4.2 제품별 건수, 열 합계는 SPEC 4.3 카테고리 건수다.
 * SPEC이 정하지 않은 칸이라 여기서 나눴고, 제품 성격에 맞춰 기울였다 —
 * 스마트폰은 발열·성능, 모니터는 화질·가격 쪽 이야기가 많은 것이 자연스럽다.
 */
export const PRODUCT_CATEGORY: Record<ProductId, Record<IssueCategory, number>> = {
  'P-001': { 화질: 56, 성능: 26, 발열: 22, 소비전력: 14, 내구성: 12, 가격: 6, 기타: 4 },
  'P-002': { 화질: 18, 성능: 20, 발열: 13, 소비전력: 13, 내구성: 10, 가격: 9, 기타: 7 },
  'P-003': { 화질: 22, 성능: 8, 발열: 4, 소비전력: 6, 내구성: 8, 가격: 12, 기타: 10 },
};

/**
 * 급증 구간에 심을 카테고리. 최근 7일 P-001 부정 45건 중 38건을 화질로 둔다.
 * 45건 전부를 화질로 만들지 않은 이유는, 한 카테고리만 나오면 데이터가 손으로 만든 티가 나고
 * 분포 차트에서 급증 구간이 지나치게 단조로워 보이기 때문이다.
 */
export const SPIKE_CATEGORY: Record<IssueCategory, number> = {
  화질: 38,
  발열: 4,
  성능: 3,
  소비전력: 0,
  내구성: 0,
  가격: 0,
  기타: 0,
};

// ── 감성별 카테고리 선호도 ────────────────────────────────────────────

/**
 * 어느 감성에 어느 카테고리가 붙기 쉬운지. 합계를 맞추는 것은 예산이 하고,
 * 이 가중치는 같은 예산 안에서 어느 칸으로 먼저 나갈지만 정한다.
 * 가격 불만이 부정에 몰리지 않게 한 이유는, 가격은 칭찬으로도 자주 나오기 때문이다.
 */
const PREFERENCE: Record<Sentiment, Record<IssueCategory, number>> = {
  negative: { 화질: 1.4, 성능: 1.2, 발열: 1.5, 소비전력: 1.1, 내구성: 1.2, 가격: 0.5, 기타: 0.6 },
  neutral: { 화질: 1.0, 성능: 1.0, 발열: 0.8, 소비전력: 1.0, 내구성: 0.9, 가격: 1.2, 기타: 1.3 },
  positive: { 화질: 1.1, 성능: 1.2, 발열: 0.4, 소비전력: 0.9, 내구성: 1.0, 가격: 1.6, 기타: 1.0 },
};

/** 카테고리마다 쓸 수 있는 세부 이슈. 첫 값이 그 카테고리의 대표다 */
const SUBCATEGORIES: Record<IssueCategory, IssueSubcategory[]> = {
  화질: ['색 균일도', '밝기', '색 정확도', '번인', '플리커'],
  성능: ['응답 속도', '화면 잔상', '기타'],
  소비전력: ['배터리 소모', '기타'],
  가격: ['기타'],
  내구성: ['번인', '기타'],
  발열: ['배터리 소모', '기타'],
  기타: ['기타'],
};

// ── 배분 ──────────────────────────────────────────────────────────────

export interface SeedRecord {
  date: string;
  segment: Segment;
  product: ProductId;
  sentiment: Sentiment;
  category: IssueCategory;
  subcategory: IssueSubcategory;
}

type CellKey = `${Segment}|${Sentiment}`;

function cellKey(segment: Segment, sentiment: Sentiment): CellKey {
  return `${segment}|${sentiment}`;
}

/**
 * 한 제품의 칸(구간×감성)들에 카테고리 예산을 나눠 준다.
 *
 * 칸 하나를 채울 때마다 "남은 예산 × 선호도"가 가장 큰 카테고리를 고른다.
 * 남은 예산을 곱에 넣는 이유는, 예산이 큰 카테고리가 먼저 빠져나가 마지막 칸에
 * 한 카테고리만 남는 일을 막기 위해서다. 예산 합계와 칸 합계가 같으므로
 * 이 방식은 항상 정확히 맞아떨어진다.
 */
function allocateCategories(
  cellSizes: Map<CellKey, number>,
  budget: Record<IssueCategory, number>,
  presetCell: CellKey | null,
  preset: Record<IssueCategory, number> | null,
): Map<CellKey, Record<IssueCategory, number>> {
  const remaining: Record<IssueCategory, number> = { ...budget };
  const result = new Map<CellKey, Record<IssueCategory, number>>();

  const emptyRow = (): Record<IssueCategory, number> =>
    Object.fromEntries(ISSUE_CATEGORIES.map((c) => [c, 0])) as Record<IssueCategory, number>;

  // 급증 구간처럼 SPEC이 이야기를 정해 둔 칸을 먼저 채운다
  if (presetCell && preset) {
    const row = emptyRow();
    for (const category of ISSUE_CATEGORIES) {
      const take = preset[category];
      if (take > remaining[category]) {
        throw new Error(
          `${presetCell}에 ${category} ${take}건을 심으려 했으나 예산이 ${remaining[category]}건뿐입니다`,
        );
      }
      row[category] = take;
      remaining[category] -= take;
    }
    result.set(presetCell, row);
  }

  for (const [key, size] of cellSizes) {
    if (result.has(key)) continue;

    const sentiment = key.split('|')[1] as Sentiment;
    const row = emptyRow();

    for (let i = 0; i < size; i += 1) {
      let best: IssueCategory | null = null;
      let bestScore = -1;
      for (const category of ISSUE_CATEGORIES) {
        if (remaining[category] <= 0) continue;
        const score = remaining[category] * PREFERENCE[sentiment][category];
        if (score > bestScore) {
          bestScore = score;
          best = category;
        }
      }
      if (best === null) {
        throw new Error(`${key}를 채울 예산이 남지 않았습니다`);
      }
      row[best] += 1;
      remaining[best] -= 1;
    }

    result.set(key, row);
  }

  const leftover = ISSUE_CATEGORIES.filter((c) => remaining[c] !== 0);
  if (leftover.length > 0) {
    throw new Error(
      `예산이 남았습니다: ${leftover.map((c) => `${c} ${remaining[c]}`).join(', ')}`,
    );
  }

  return result;
}

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

/** 날짜 배분 결과에 카테고리·세부 이슈를 붙여 300건의 뼈대를 만든다 */
export function assignCategories(cells: DailyCell[]): SeedRecord[] {
  // 1. (구간, 제품, 감성, 날짜) 단위를 한 건씩으로 편다
  const expanded: Omit<SeedRecord, 'category' | 'subcategory'>[] = [];
  for (const cell of cells) {
    for (let i = 0; i < cell.count; i += 1) {
      expanded.push({
        date: cell.date,
        segment: cell.segment,
        product: cell.product,
        sentiment: cell.sentiment,
      });
    }
  }

  const random = makeRandom(19940715);
  const output: SeedRecord[] = [];

  for (const product of PRODUCT_IDS) {
    const mine = expanded.filter((record) => record.product === product);

    const cellSizes = new Map<CellKey, number>();
    for (const record of mine) {
      const key = cellKey(record.segment, record.sentiment);
      cellSizes.set(key, (cellSizes.get(key) ?? 0) + 1);
    }

    const isSpikeProduct = product === 'P-001';
    const allocation = allocateCategories(
      cellSizes,
      PRODUCT_CATEGORY[product],
      isSpikeProduct ? cellKey('recent7', 'negative') : null,
      isSpikeProduct ? SPIKE_CATEGORY : null,
    );

    // 2. 칸마다 배분된 카테고리를 그 칸의 레코드들에 하나씩 나눠 준다
    for (const [key, row] of allocation) {
      const pool: IssueCategory[] = [];
      for (const category of ISSUE_CATEGORIES) {
        for (let i = 0; i < row[category]; i += 1) pool.push(category);
      }

      const members = mine.filter((record) => cellKey(record.segment, record.sentiment) === key);
      if (members.length !== pool.length) {
        throw new Error(`${product} ${key}: 레코드 ${members.length}건 ≠ 카테고리 ${pool.length}건`);
      }

      members.forEach((record, index) => {
        const category = pool[index];
        const isSpikeCell = isSpikeProduct && key === cellKey('recent7', 'negative');
        // 급증 구간의 화질은 전부 색 균일도로 둔다 — 한 가지 증상이 번지는 그림이어야 한다
        const subcategory =
          isSpikeCell && category === '화질'
            ? '색 균일도'
            : SUBCATEGORIES[category][Math.floor(random() * SUBCATEGORIES[category].length)];
        output.push({ ...record, category, subcategory });
      });
    }
  }

  // 3. 날짜 오름차순으로 정렬해 돌려준다
  const dateOrder = new Map(ALL_DATES.map((date, index) => [date, index]));
  output.sort((a, b) => (dateOrder.get(a.date) ?? 0) - (dateOrder.get(b.date) ?? 0));
  return output;
}

// ── 자기 검사 ─────────────────────────────────────────────────────────

export function countByCategory(records: SeedRecord[]): Record<IssueCategory, number> {
  const counts = Object.fromEntries(ISSUE_CATEGORIES.map((c) => [c, 0])) as Record<
    IssueCategory,
    number
  >;
  for (const record of records) counts[record.category] += 1;
  return counts;
}

export function checkCategories(records: SeedRecord[]): string[] {
  const problems: string[] = [];
  const counts = countByCategory(records);

  for (const category of ISSUE_CATEGORIES) {
    if (counts[category] !== EXPECTED_BY_CATEGORY[category]) {
      problems.push(`${category}: ${counts[category]} ≠ SPEC ${EXPECTED_BY_CATEGORY[category]}`);
    }
    if (counts[category] <= 0) {
      problems.push(`${category}: 0건 — 7개 카테고리는 모두 0보다 커야 분포 차트 조각이 7개가 된다`);
    }
  }

  for (const product of PRODUCT_IDS) {
    for (const category of ISSUE_CATEGORIES) {
      const actual = records.filter((r) => r.product === product && r.category === category).length;
      const expected = PRODUCT_CATEGORY[product][category];
      if (actual !== expected) {
        problems.push(`제품×카테고리 ${product}/${category}: ${actual} ≠ ${expected}`);
      }
    }
  }

  const spike = records.filter(
    (r) => r.product === 'P-001' && r.segment === 'recent7' && r.sentiment === 'negative',
  );
  if (spike.length !== 45) {
    problems.push(`급증 구간 건수: ${spike.length} ≠ SPEC 45`);
  }
  const spikeQuality = spike.filter((r) => r.category === '화질');
  if (spikeQuality.length !== SPIKE_CATEGORY.화질) {
    problems.push(`급증 구간 화질: ${spikeQuality.length} ≠ ${SPIKE_CATEGORY.화질}`);
  }
  const notUniformity = spikeQuality.filter((r) => r.subcategory !== '색 균일도');
  if (notUniformity.length > 0) {
    problems.push(`급증 구간 화질 중 색 균일도가 아닌 건: ${notUniformity.length}건`);
  }

  return problems;
}

// ── 출력 ──────────────────────────────────────────────────────────────

function report(records: SeedRecord[]): void {
  const counts = countByCategory(records);
  const total = records.length;

  console.log(`총 ${total}건\n`);

  console.log('카테고리 집계');
  // 건수 내림차순으로 찍는다 — SPEC 4.3 표와 같은 순서라 눈으로 대조하기 쉽다
  const ordered = [...ISSUE_CATEGORIES].sort((a, b) => counts[b] - counts[a]);
  for (const category of ordered) {
    const expected = EXPECTED_BY_CATEGORY[category];
    const mark = counts[category] === expected ? '' : `  ← SPEC ${expected}`;
    console.log(
      `  ${category.padEnd(6)}${String(counts[category]).padStart(4)}  ${'█'.repeat(
        Math.round(counts[category] / 2),
      )}${mark}`,
    );
  }
  console.log(`  ${'합계'.padEnd(6)}${String(total).padStart(4)}`);
  console.log(`  0건인 카테고리: ${ISSUE_CATEGORIES.filter((c) => counts[c] === 0).length}개\n`);

  console.log('제품 × 카테고리');
  console.log(`  ${'제품'.padEnd(8)}${ISSUE_CATEGORIES.map((c) => c.padStart(7)).join('')}`);
  for (const product of PRODUCT_IDS) {
    const row = ISSUE_CATEGORIES.map((category) =>
      String(records.filter((r) => r.product === product && r.category === category).length).padStart(7),
    );
    console.log(`  ${product.padEnd(8)}${row.join('')}`);
  }
  console.log();

  const spike = records.filter(
    (r) => r.product === 'P-001' && r.segment === 'recent7' && r.sentiment === 'negative',
  );
  console.log('급증 구간 (P-001 · 최근 7일 · 부정)');
  console.log(`  총 ${spike.length}건`);
  const spikeByCategory = new Map<string, number>();
  for (const record of spike) {
    spikeByCategory.set(record.category, (spikeByCategory.get(record.category) ?? 0) + 1);
  }
  for (const [category, count] of [...spikeByCategory].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${category.padEnd(6)}${String(count).padStart(3)}건`);
  }
  const uniformity = spike.filter((r) => r.subcategory === '색 균일도').length;
  console.log(`  세부 이슈 색 균일도 ${uniformity}건`);
}

if (import.meta.main) {
  const records = assignCategories(buildDailyCells());
  report(records);

  const problems = checkCategories(records);
  if (problems.length > 0) {
    console.error('\n카테고리 배분이 SPEC과 어긋납니다:');
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }
  console.log('\n카테고리 배분이 SPEC 4.3·4.5와 모두 일치합니다.');
}
