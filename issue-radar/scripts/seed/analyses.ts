// 분석 300건(data/feedback_analyses.json)을 만든다. 원문과 1:1이다.
//
// summary를 샘플에 미리 채워 두는 이유는 앱 실행에 API 키가 한 개도 필요 없게 하기
// 위해서다(SPEC 3.3). 화면은 이 값을 표시만 하고, 표시할 때 "참고용 분석 결과"임을
// 밝힌다(SPEC 5.6). 나중에 LLM 키가 생기면 analysis_method를 llm으로 바꾸고
// 이 필드를 채우는 쪽만 갈아끼우면 된다.
//
// 실행: node scripts/seed/analyses.ts

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  FeedbackAnalysis,
  FeedbackItem,
  IssueSubcategory,
  Sentiment,
  SourceType,
} from '../../lib/types.ts';
import { SOURCES } from '../../lib/sources.ts';
import { PRODUCT_IDS, TOTAL_COUNT, type ProductId } from './plan.ts';
import { buildDailyCells } from './dates.ts';
import { assignCategories, type SeedRecord } from './categories.ts';
import { buildItems } from './items.ts';
import { issueNoun, withJosa } from './templates.ts';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const ANALYSES_PATH = resolve(scriptDirectory, '..', '..', 'data', 'feedback_analyses.json');

const PRODUCT_NAME: Record<ProductId, string> = {
  'P-001': '루멘 폰 X',
  'P-002': '아틀라스 탭 11',
  'P-003': '클리어뷰 모니터 27',
};

const SENTIMENT_LABEL: Record<Sentiment, string> = {
  negative: '부정',
  neutral: '중립',
  positive: '긍정',
};

const SOURCE_TYPE_BY_ID = new Map(SOURCES.map((source) => [source.id, source.source_type]));

/**
 * 요약 문장에 쓰는 출처 표현. 뱃지에 쓰는 `SOURCE_TYPE_LABEL`을 그대로 넣으면
 * "영상 글로"처럼 어색해져서, 문장용 표현을 따로 둔다.
 */
const SOURCE_PHRASE: Record<SourceType, string> = {
  news: '뉴스 기사',
  community: '커뮤니티 글',
  video: '영상 게시물',
};

/**
 * 요약에 들어갈 핵심 한 마디. 세부 이슈 × 감성으로 고른다.
 * 요약이 "부정 반응입니다" 수준이면 원문을 열어 보지 않고는 아무것도 알 수 없어,
 * 원문 추적성 말고는 쓸모가 없어진다.
 */
const KEY_POINT: Record<IssueSubcategory, Record<Sentiment, string>> = {
  '색 균일도': {
    negative: '화면 일부만 색이 다르게 뜬다는 지적',
    neutral: '색 차이가 정상 범위인지 판단을 미룬 관찰',
    positive: '화면 전체 색이 고르게 유지된다는 평가',
  },
  번인: {
    negative: '오래 띄운 화면의 자국이 지워지지 않는다는 지적',
    neutral: '자국이 생기는지 기간을 두고 지켜보는 기록',
    positive: '장시간 사용에도 자국이 남지 않는다는 평가',
  },
  플리커: {
    negative: '낮은 밝기에서 화면이 떨려 눈이 피로하다는 지적',
    neutral: '저휘도 깜빡임 정도를 재 본 관찰',
    positive: '최저 밝기에서도 깜빡임이 없다는 평가',
  },
  밝기: {
    negative: '실외에서 화면이 잘 보이지 않는다는 지적',
    neutral: '표시된 최대 밝기와 실제 값을 견준 관찰',
    positive: '한낮 실외에서도 화면이 또렷하다는 평가',
  },
  '색 정확도': {
    negative: '화면 색과 실제 색이 다르게 나온다는 지적',
    neutral: '색 프로파일에 따른 차이를 재 본 관찰',
    positive: '기본 설정에서도 색 차이가 적다는 평가',
  },
  '화면 잔상': {
    negative: '빠른 화면에서 잔상이 끌린다는 지적',
    neutral: '잔상이 몇 장면 남는지 재 본 관찰',
    positive: '빠른 화면에서도 잔상이 적다는 평가',
  },
  '응답 속도': {
    negative: '조작에 대한 반응이 늦다는 지적',
    neutral: '업데이트 전후 반응 속도를 견준 관찰',
    positive: '여러 작업에서도 반응이 밀리지 않는다는 평가',
  },
  '배터리 소모': {
    negative: '완충 후 반나절도 못 간다는 지적',
    neutral: '하루 사용량이 조건마다 다르다는 관찰',
    positive: '하루 종일 써도 배터리가 남는다는 평가',
  },
  기타: {
    negative: '같은 증상이 반복돼 불편하다는 지적',
    neutral: '조건에 따라 결과가 갈린다는 관찰',
    positive: '걱정한 부분이 문제가 되지 않았다는 평가',
  },
};

/** 세부 이슈가 `기타`일 때 카테고리로 대신 고르는 핵심 한 마디 */
const CATEGORY_KEY_POINT: Record<string, Record<Sentiment, string>> = {
  가격: {
    negative: '사양에 견줘 값이 높다는 지적',
    neutral: '값이 오르내려 살 시점을 재는 관찰',
    positive: '값에 견줘 구성이 아깝지 않다는 평가',
  },
  내구성: {
    negative: '짧은 사용 기간에 마감이 상했다는 지적',
    neutral: '기간을 두고 마감 변화를 지켜보는 기록',
    positive: '오래 써도 마감이 그대로라는 평가',
  },
  발열: {
    negative: '짧은 사용에도 표면이 뜨거워진다는 지적',
    neutral: '반복 작업 중 표면 온도를 재 본 관찰',
    positive: '오래 써도 열이 심하지 않다는 평가',
  },
  성능: {
    negative: '무거운 작업에서 눈에 띄게 느려진다는 지적',
    neutral: '업데이트 전후 체감 속도를 견준 관찰',
    positive: '무거운 작업에서도 속도가 유지된다는 평가',
  },
  기타: {
    negative: '설명되지 않는 동작이 반복된다는 지적',
    neutral: '쓰면서 알게 된 점을 정리한 기록',
    positive: '세부까지 신경 쓴 흔적이 보인다는 평가',
  },
};

function keyPoint(record: SeedRecord): string {
  if (record.subcategory !== '기타') {
    return KEY_POINT[record.subcategory][record.sentiment];
  }
  return (
    CATEGORY_KEY_POINT[record.category]?.[record.sentiment] ??
    KEY_POINT.기타[record.sentiment]
  );
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

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export const SUMMARY_MIN = 40;
export const SUMMARY_MAX = 100;

function buildSummary(record: SeedRecord, item: FeedbackItem): string {
  const sourceType = SOURCE_TYPE_BY_ID.get(item.source_id);
  if (!sourceType) throw new Error(`출처를 찾을 수 없습니다: ${item.source_id}`);

  const noun = issueNoun(record.category, record.subcategory);
  const point = keyPoint(record);
  const sentiment = SENTIMENT_LABEL[record.sentiment];

  // 부정·중립·긍정 셋 다 받침이 있어 조사는 '으로'로 고정된다
  return `${PRODUCT_NAME[record.product]} ${noun} 관련 ${SOURCE_PHRASE[sourceType]}로, ${withJosa(
    point,
    '이',
  )} 담겨 있다. 감성은 ${sentiment}으로 분류했다.`;
}

function buildKeywords(record: SeedRecord): string[] {
  const noun = issueNoun(record.category, record.subcategory);
  // 중복을 걷어 낸 뒤 2~5개로 맞춘다(SPEC 3.3)
  const candidates = [
    record.category,
    record.subcategory === '기타' ? null : record.subcategory,
    noun === record.category || noun === record.subcategory ? null : noun,
    SENTIMENT_LABEL[record.sentiment],
    PRODUCT_NAME[record.product].split(' ')[0],
  ].filter((value): value is string => value !== null);

  return [...new Set(candidates)].slice(0, 5);
}

export function buildAnalyses(records: SeedRecord[], items: FeedbackItem[]): FeedbackAnalysis[] {
  if (records.length !== items.length) {
    throw new Error(`배분 결과 ${records.length}건 ≠ 원문 ${items.length}건`);
  }

  const random = makeRandom(20260813);

  return records.map((record, index) => {
    const item = items[index];

    // 0.60 ~ 0.98. 감성이 뚜렷한 부정·긍정을 중립보다 조금 높게 둔다
    const floor = record.sentiment === 'neutral' ? 0.6 : 0.72;
    const confidence = Number((floor + random() * (0.98 - floor)).toFixed(2));

    // 분석은 수집 다음 날 돌린 것으로 둔다
    const analyzedAt = `${item.collected_at.slice(0, 10)}T23:30:00+09:00`;

    return {
      id: `FA-${pad(index + 1, 4)}`,
      feedback_item_id: item.id,
      product_id: record.product,
      issue_category: record.category,
      issue_subcategory: record.subcategory,
      sentiment: record.sentiment,
      summary: buildSummary(record, item),
      keywords: buildKeywords(record),
      confidence_score: confidence,
      analysis_method: 'seed',
      analyzed_at: analyzedAt,
    } satisfies FeedbackAnalysis;
  });
}

// ── 자기 검사 ─────────────────────────────────────────────────────────

export function checkAnalyses(analyses: FeedbackAnalysis[], items: FeedbackItem[]): string[] {
  const problems: string[] = [];

  if (analyses.length !== TOTAL_COUNT) {
    problems.push(`총건수: ${analyses.length} ≠ SPEC ${TOTAL_COUNT}`);
  }

  const analysisIds = new Set(analyses.map((analysis) => analysis.id));
  if (analysisIds.size !== analyses.length) {
    problems.push(`분석 id 중복: ${analyses.length - analysisIds.size}건`);
  }
  if (
    analyses[0]?.id !== 'FA-0001' ||
    analyses[analyses.length - 1]?.id !== `FA-${pad(TOTAL_COUNT, 4)}`
  ) {
    problems.push(`분석 id 범위: ${analyses[0]?.id} ~ ${analyses[analyses.length - 1]?.id}`);
  }

  // 1:1 대응 — 빠지거나 겹치는 원문 id가 없어야 한다
  const itemIds = new Set(items.map((item) => item.id));
  const linked = new Set<string>();
  for (const analysis of analyses) {
    if (!itemIds.has(analysis.feedback_item_id)) {
      problems.push(`${analysis.id}: 없는 원문을 가리킵니다 — ${analysis.feedback_item_id}`);
    }
    if (linked.has(analysis.feedback_item_id)) {
      problems.push(`${analysis.feedback_item_id}에 분석이 둘 이상 붙었습니다`);
    }
    linked.add(analysis.feedback_item_id);
  }
  for (const item of items) {
    if (!linked.has(item.id)) {
      problems.push(`${item.id}에 분석이 없습니다`);
    }
  }

  for (const analysis of analyses) {
    if (analysis.analysis_method !== 'seed') {
      problems.push(`${analysis.id}: analysis_method가 seed가 아닙니다 — ${analysis.analysis_method}`);
    }
    if (analysis.confidence_score < 0.6 || analysis.confidence_score > 0.98) {
      problems.push(`${analysis.id}: confidence_score ${analysis.confidence_score} (0.60~0.98)`);
    }
    if (analysis.keywords.length < 2 || analysis.keywords.length > 5) {
      problems.push(`${analysis.id}: keywords ${analysis.keywords.length}개 (2~5)`);
    }
    if (analysis.summary.length < SUMMARY_MIN || analysis.summary.length > SUMMARY_MAX) {
      problems.push(
        `${analysis.id}: summary ${analysis.summary.length}자 (${SUMMARY_MIN}~${SUMMARY_MAX}) — ${analysis.summary}`,
      );
    }
    if (!PRODUCT_IDS.includes(analysis.product_id as ProductId)) {
      problems.push(`${analysis.id}: 모르는 제품 ${analysis.product_id}`);
    }
  }

  return problems;
}

// ── 실행 ──────────────────────────────────────────────────────────────

function report(analyses: FeedbackAnalysis[], items: FeedbackItem[]): void {
  console.log(`분석 ${analyses.length}건 — ${analyses[0].id} ~ ${analyses[analyses.length - 1].id}\n`);

  const lengths = analyses.map((analysis) => analysis.summary.length);
  console.log(`summary 길이 ${Math.min(...lengths)}~${Math.max(...lengths)}자`);
  const scores = analyses.map((analysis) => analysis.confidence_score);
  console.log(`confidence_score ${Math.min(...scores)}~${Math.max(...scores)}`);
  const keywordCounts = analyses.map((analysis) => analysis.keywords.length);
  console.log(`keywords ${Math.min(...keywordCounts)}~${Math.max(...keywordCounts)}개`);
  console.log(`analysis_method가 seed인 건: ${analyses.filter((a) => a.analysis_method === 'seed').length}/${analyses.length}`);

  console.log('\n표본 3건');
  for (const index of [0, 149, analyses.length - 1]) {
    const analysis = analyses[index];
    const item = items.find((candidate) => candidate.id === analysis.feedback_item_id);
    console.log(`  ${analysis.id} ← ${analysis.feedback_item_id}  ${analysis.product_id}  ${analysis.issue_category}/${analysis.issue_subcategory}  ${analysis.sentiment}  ${analysis.confidence_score}`);
    console.log(`    원문: ${item?.title}`);
    console.log(`    요약: ${analysis.summary}`);
    console.log(`    키워드: ${analysis.keywords.join(', ')}`);
  }
}

if (import.meta.main) {
  const records = assignCategories(buildDailyCells());
  const items = buildItems(records);
  const analyses = buildAnalyses(records, items);

  report(analyses, items);

  const problems = checkAnalyses(analyses, items);
  if (problems.length > 0) {
    console.error(`\n검사에서 ${problems.length}건이 걸려 파일을 쓰지 않았습니다:`);
    problems.slice(0, 20).forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }

  writeFileSync(ANALYSES_PATH, `${JSON.stringify(analyses, null, 2)}\n`, 'utf8');
  console.log(`\n검사를 모두 통과해 ${analyses.length}건을 data/feedback_analyses.json 에 썼습니다.`);
}
