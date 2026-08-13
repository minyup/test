// 원문 300건(data/feedback_items.json)을 만든다.
//
// 앞의 네 단계가 정한 것을 그대로 받아 쓴다: plan.ts가 건수를, dates.ts가 날짜를,
// categories.ts가 카테고리를, templates.ts가 문장을 정했다. 이 파일은 거기에
// 식별자·출처·작성자·URL을 붙여 레코드로 만들 뿐이다.
//
// 파일로 쓰기 전에 총건수와 구간 합계를 다시 확인하고, 어긋나면 쓰지 않는다.
// 잘못된 데이터가 파일에 남으면 그 뒤 모든 검증이 그 위에서 돌기 때문이다.
//
// 실행: node scripts/seed/items.ts

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FeedbackItem } from '../../lib/types.ts';
import { SOURCES } from '../../lib/sources.ts';
import { EXPECTED_BY_SEGMENT, PRODUCT_IDS, TOTAL_COUNT, type ProductId } from './plan.ts';
import { ALL_DATES, SEGMENT_DATES, buildDailyCells } from './dates.ts';
import { assignCategories, type SeedRecord } from './categories.ts';
import { EXCERPT_MAX, EXCERPT_MIN, TITLE_MAX, TITLE_MIN, buildText } from './templates.ts';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const ITEMS_PATH = resolve(scriptDirectory, '..', '..', 'data', 'feedback_items.json');

/** SPEC 2.1의 가상 제품명. 실제 제품명·브랜드명은 쓰지 않는다 */
const PRODUCT_NAME: Record<ProductId, string> = {
  'P-001': '루멘 폰 X',
  'P-002': '아틀라스 탭 11',
  'P-003': '클리어뷰 모니터 27',
};

/**
 * 출처별 비중. 커뮤니티 글이 뉴스·영상보다 많은 것이 자연스럽다.
 * 합이 100이 되도록 두고, 0~99 사이의 값이 어느 구간에 떨어지는지로 고른다.
 */
const SOURCE_SHARE: { id: string; share: number }[] = [
  { id: 'S-01', share: 18 },
  { id: 'S-02', share: 15 },
  { id: 'S-03', share: 25 },
  { id: 'S-04', share: 24 },
  { id: 'S-05', share: 18 },
];

const SOURCE_TYPE_BY_ID = new Map(SOURCES.map((source) => [source.id, source.source_type]));

/** 출처 안에서 쓸 external_id 접두어. 지어낸 값이다 */
const EXTERNAL_PREFIX: Record<string, string> = {
  'S-01': 'nwsa',
  'S-02': 'nwsb',
  'S-03': 'cmta',
  'S-04': 'cmtb',
  'S-05': 'vidz',
};

/** URL 경로도 출처마다 다르게 둔다. 도메인은 반드시 example.com이다(SPEC 4.7) */
const URL_PATH: Record<string, string> = {
  'S-01': 'news-a/articles',
  'S-02': 'news-b/articles',
  'S-03': 'community-a/posts',
  'S-04': 'community-b/posts',
  'S-05': 'video/watch',
};

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

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

function pickSource(roll: number): string {
  let cursor = 0;
  for (const entry of SOURCE_SHARE) {
    cursor += entry.share;
    if (roll < cursor) return entry.id;
  }
  return SOURCE_SHARE[SOURCE_SHARE.length - 1].id;
}

function shiftDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * 한국 시간대로 고정한다. 화면과 필터는 앞 10글자(날짜)만 보므로,
 * 시각은 사람이 읽을 때 그럴듯해 보이라고 붙이는 값이다.
 */
function timestamp(date: string, hour: number, minute: number): string {
  return `${date}T${pad(hour, 2)}:${pad(minute, 2)}:00+09:00`;
}

export function buildItems(records: SeedRecord[]): FeedbackItem[] {
  const random = makeRandom(20260715);

  return records.map((record, index) => {
    const sourceId = pickSource(Math.floor(random() * 100));
    const sourceType = SOURCE_TYPE_BY_ID.get(sourceId);
    if (!sourceType) throw new Error(`출처를 찾을 수 없습니다: ${sourceId}`);

    const { title, excerpt } = buildText({
      sourceType,
      productName: PRODUCT_NAME[record.product],
      category: record.category,
      subcategory: record.subcategory,
      sentiment: record.sentiment,
      variant: index,
    });

    const serial = index + 1;
    const externalId = `${EXTERNAL_PREFIX[sourceId]}-${pad(10000 + Math.floor(random() * 89999), 5)}`;

    // 글이 올라오는 시각은 오전 7시~밤 11시 사이로 둔다
    const hour = 7 + Math.floor(random() * 17);
    const minute = Math.floor(random() * 60);
    const publishedAt = timestamp(record.date, hour, minute);

    // 수집은 게시 후 0~2일 안에 이뤄진 것으로 둔다(SPEC 3.2)
    const collectDelay = Math.floor(random() * 3);
    const collectedAt = timestamp(shiftDate(record.date, collectDelay), (hour + 2) % 24, minute);

    return {
      id: `FI-${pad(serial, 4)}`,
      source_id: sourceId,
      external_id: externalId,
      title,
      content_excerpt: excerpt,
      original_url: `https://example.com/${URL_PATH[sourceId]}/${externalId}`,
      // 실명을 만들지 않는다. 익명1~익명40만 쓴다(SPEC 4.7)
      author_name: `익명${(index % 40) + 1}`,
      published_at: publishedAt,
      collected_at: collectedAt,
      language: 'ko',
      content_hash: createHash('sha256').update(`${title}\n${excerpt}`).digest('hex').slice(0, 16),
    } satisfies FeedbackItem;
  });
}

// ── 자기 검사 ─────────────────────────────────────────────────────────

export function checkItems(items: FeedbackItem[], records: SeedRecord[]): string[] {
  const problems: string[] = [];

  if (items.length !== TOTAL_COUNT) {
    problems.push(`총건수: ${items.length} ≠ SPEC ${TOTAL_COUNT}`);
  }
  if (items.length !== records.length) {
    problems.push(`원문 ${items.length}건 ≠ 배분 결과 ${records.length}건`);
  }

  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) {
    problems.push(`id가 중복됩니다: ${items.length - ids.size}건`);
  }
  if (items[0]?.id !== 'FI-0001' || items[items.length - 1]?.id !== `FI-${pad(TOTAL_COUNT, 4)}`) {
    problems.push(`id 범위: ${items[0]?.id} ~ ${items[items.length - 1]?.id}`);
  }

  const byDate = new Map<string, number>();
  for (const item of items) {
    const date = item.published_at.slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + 1);
  }
  for (const date of ALL_DATES) {
    if ((byDate.get(date) ?? 0) < 1) {
      problems.push(`${date}: 0건 — 30일 모두 최소 1건이어야 한다`);
    }
  }
  for (const [date] of byDate) {
    if (!ALL_DATES.includes(date)) {
      problems.push(`기간 밖 날짜: ${date}`);
    }
  }

  for (const [segment, dates] of Object.entries(SEGMENT_DATES)) {
    const actual = dates.reduce((sum, date) => sum + (byDate.get(date) ?? 0), 0);
    const expected = EXPECTED_BY_SEGMENT[segment as keyof typeof EXPECTED_BY_SEGMENT];
    if (actual !== expected) {
      problems.push(`구간 합계 ${segment}: ${actual} ≠ SPEC ${expected}`);
    }
  }

  for (const item of items) {
    if (!item.original_url.startsWith('https://example.com/')) {
      problems.push(`${item.id}: URL이 https://example.com/ 으로 시작하지 않습니다 — ${item.original_url}`);
    }
    if (!/^익명([1-9]|[1-3][0-9]|40)$/.test(item.author_name)) {
      problems.push(`${item.id}: 작성자가 익명N이 아닙니다 — ${item.author_name}`);
    }
    if (item.language !== 'ko') {
      problems.push(`${item.id}: language가 ko가 아닙니다 — ${item.language}`);
    }
    if (item.title.length < TITLE_MIN || item.title.length > TITLE_MAX) {
      problems.push(`${item.id}: 제목 ${item.title.length}자 (${TITLE_MIN}~${TITLE_MAX})`);
    }
    if (item.content_excerpt.length < EXCERPT_MIN || item.content_excerpt.length > EXCERPT_MAX) {
      problems.push(`${item.id}: 본문 ${item.content_excerpt.length}자 (${EXCERPT_MIN}~${EXCERPT_MAX})`);
    }
    if (!SOURCE_TYPE_BY_ID.has(item.source_id)) {
      problems.push(`${item.id}: 모르는 출처 ${item.source_id}`);
    }

    const published = item.published_at.slice(0, 10);
    const collected = item.collected_at.slice(0, 10);
    const gap =
      (Date.parse(`${collected}T00:00:00Z`) - Date.parse(`${published}T00:00:00Z`)) / 86_400_000;
    if (gap < 0 || gap > 2) {
      problems.push(`${item.id}: collected_at이 published_at + 0~2일을 벗어납니다 (${gap}일)`);
    }
  }

  return problems;
}

// ── 실행 ──────────────────────────────────────────────────────────────

function report(items: FeedbackItem[]): void {
  console.log(`원문 ${items.length}건 — ${items[0].id} ~ ${items[items.length - 1].id}\n`);

  const bySource = new Map<string, number>();
  for (const item of items) bySource.set(item.source_id, (bySource.get(item.source_id) ?? 0) + 1);
  console.log('출처별 건수');
  for (const source of SOURCES) {
    console.log(`  ${source.id} ${source.name.padEnd(14)} ${String(bySource.get(source.id) ?? 0).padStart(3)}건`);
  }

  const authors = new Set(items.map((item) => item.author_name));
  console.log(`\n작성자 ${authors.size}명 (익명1~익명40)`);
  console.log(
    `URL이 https://example.com/ 으로 시작하는 건: ${
      items.filter((item) => item.original_url.startsWith('https://example.com/')).length
    }/${items.length}`,
  );

  console.log('\n표본 3건');
  for (const index of [0, 149, items.length - 1]) {
    const item = items[index];
    console.log(`  ${item.id}  ${item.published_at}  ${item.source_id}  ${item.author_name}`);
    console.log(`    ${item.title}`);
    console.log(`    ${item.original_url}`);
  }
}

if (import.meta.main) {
  const records = assignCategories(buildDailyCells());
  const items = buildItems(records);

  report(items);

  const problems = checkItems(items, records);
  if (problems.length > 0) {
    console.error(`\n검사에서 ${problems.length}건이 걸려 파일을 쓰지 않았습니다:`);
    problems.slice(0, 20).forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }

  mkdirSync(dirname(ITEMS_PATH), { recursive: true });
  writeFileSync(ITEMS_PATH, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  console.log(`\n검사를 모두 통과해 ${items.length}건을 data/feedback_items.json 에 썼습니다.`);
}
