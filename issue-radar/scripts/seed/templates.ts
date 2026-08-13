// 출처 유형별 문장 템플릿. 뉴스는 기사 제목체, 커뮤니티는 구어체, 영상은 영상 제목체다
// (SPEC 4.6). 세 말투를 섞어 읽어도 어느 출처인지 구분되어야 한다 — SPEC 8.5의
// "샘플 데이터가 그럴듯한가"를 사람이 눈으로 볼 때 이 구분이 기준이 된다.
//
// 실제 제품명·브랜드명·실제 사이트 URL·실명은 문장 안에 절대 넣지 않는다(SPEC 4.7).
// 여기 들어가는 이름은 전부 SPEC 2.1의 가상 이름이다.
//
// 한국어라서 조심할 것이 두 가지 있다.
//  - 조사: `{이슈}` 뒤에 을/를·이/가를 그냥 붙이면 "가격가" "발열를"이 나온다.
//    받침을 보고 고르도록 `{이슈+을}` `{이슈+이}` 형태로 적는다.
//  - 간접인용: 증상 문장은 `-고` `-는`을 붙여 안긴문장으로 들어간다. 그래서 증상은
//    반드시 동사·형용사로 끝내고 `-이다`로 끝내지 않는다. "중이다"에 `-는`을 붙이면
//    "중이다는"이 되어 틀린 말이 되기 때문이다.
//
// 실행: node scripts/seed/templates.ts

import type { IssueCategory, IssueSubcategory, Sentiment, SourceType } from '../../lib/types.ts';

export interface TextInput {
  sourceType: SourceType;
  /** SPEC 2.1의 가상 제품명. 예: 루멘 폰 X */
  productName: string;
  category: IssueCategory;
  subcategory: IssueSubcategory;
  sentiment: Sentiment;
  /** 같은 조합에서도 문장이 겹치지 않게 돌려 쓰기 위한 값 */
  variant: number;
}

export interface GeneratedText {
  title: string;
  excerpt: string;
}

// ── 조사 붙이기 ───────────────────────────────────────────────────────

/** [받침 있을 때, 없을 때] */
const JOSA: Record<string, [string, string]> = {
  을: ['을', '를'],
  이: ['이', '가'],
  은: ['은', '는'],
  과: ['과', '와'],
};

function hasFinalConsonant(word: string): boolean {
  const code = word.charCodeAt(word.length - 1);
  // 한글 음절이 아니면(숫자·영문) 받침 없는 것으로 본다
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

export function withJosa(word: string, key: keyof typeof JOSA | string): string {
  const pair = JOSA[key];
  if (!pair) throw new Error(`모르는 조사입니다: ${key}`);
  return word + (hasFinalConsonant(word) ? pair[0] : pair[1]);
}

// ── 이슈를 부르는 말 ──────────────────────────────────────────────────

/** 세부 이슈를 가리키는 명사. 제목에 그대로 들어간다 */
const SUBCATEGORY_NOUN: Record<IssueSubcategory, string> = {
  '색 균일도': '화면 색 균일도',
  번인: '번인',
  플리커: '화면 깜빡임',
  밝기: '화면 밝기',
  '색 정확도': '색 정확도',
  '화면 잔상': '화면 잔상',
  '응답 속도': '응답 속도',
  '배터리 소모': '배터리 소모',
  기타: '',
};

/** 세부 이슈가 `기타`일 때 대신 쓰는 카테고리 명사 */
const CATEGORY_NOUN: Record<IssueCategory, string> = {
  화질: '화질',
  성능: '성능',
  소비전력: '전력 소비',
  가격: '가격',
  내구성: '내구성',
  발열: '발열',
  기타: '사용성',
};

export function issueNoun(category: IssueCategory, subcategory: IssueSubcategory): string {
  return SUBCATEGORY_NOUN[subcategory] || CATEGORY_NOUN[category];
}

/**
 * 증상 서술. 명사만 갈아 끼우면 "화질 문제가 있습니다" 같은 맹탕 문장만 나오므로,
 * 세부 이슈마다 실제로 눈에 보이는 장면을 적어 둔다.
 * 전부 동사·형용사로 끝난다 — 간접인용 어미가 뒤에 붙기 때문이다.
 */
const SYMPTOM: Record<IssueSubcategory, Record<Sentiment, string[]>> = {
  '색 균일도': {
    negative: [
      '흰 배경을 띄우면 화면 왼쪽 아래만 누렇게 뜬다',
      '회색 화면에서 네 귀퉁이 색이 서로 다르게 보인다',
      '밝은 문서를 볼 때 화면 가운데와 가장자리 색이 확연히 갈린다',
    ],
    neutral: [
      '흰 배경에서 위아래 색이 조금 다르게 보인다',
      '같은 모델을 쓰는 다른 화면과 견줘도 차이가 크지 않다',
    ],
    positive: [
      '흰 배경을 띄워도 네 귀퉁이 색이 고르게 유지된다',
      '색이 튀는 구간 없이 화면 전체가 균일하다',
    ],
  },
  번인: {
    negative: [
      '같은 화면을 오래 띄웠더니 상단 바 자국이 남아 지워지지 않는다',
      '흰 배경으로 바꿔도 이전 화면 윤곽이 희미하게 비친다',
    ],
    neutral: [
      '잔상 방지 기능을 켜 두면 자국이 덜 남는다',
      '한 달 동안 같은 화면을 띄워 두어도 아직 눈에 띄는 변화가 없다',
    ],
    positive: ['하루 종일 같은 화면을 띄워 두어도 자국이 남지 않는다'],
  },
  플리커: {
    negative: [
      '밝기를 낮추면 화면이 미세하게 떨려 눈이 금방 피로해진다',
      '어두운 곳에서 쓰면 깜빡임이 느껴져 오래 보기 힘들다',
    ],
    neutral: ['저휘도에서만 미세한 떨림이 잡힌다'],
    positive: ['밝기를 최저로 낮춰도 깜빡임이 느껴지지 않는다'],
  },
  밝기: {
    negative: [
      '실외에서는 최대 밝기로 올려도 화면이 잘 보이지 않는다',
      '자동 밝기가 실내에서 필요 이상으로 어두워진다',
    ],
    neutral: ['표시된 최대 밝기와 실제 측정값이 크게 다르지 않다'],
    positive: ['한낮 실외에서도 화면이 또렷하게 보인다'],
  },
  '색 정확도': {
    negative: [
      '사진을 옮겨 보면 화면에서 본 색과 실제 색이 다르게 나온다',
      '붉은 계열이 과하게 강조되어 인쇄물과 색이 맞지 않는다',
    ],
    neutral: ['색 프로파일을 바꾸면 결과가 눈에 띄게 달라진다'],
    positive: ['기본 설정에서도 인쇄물과 색 차이가 거의 없다'],
  },
  '화면 잔상': {
    negative: ['빠르게 움직이는 화면에서 잔상이 길게 끌린다', '스크롤을 내릴 때 글자가 번져 보인다'],
    neutral: ['고속 촬영으로 보면 잔상이 두세 장면 정도 남는다'],
    positive: ['빠른 화면에서도 잔상이 거의 느껴지지 않는다'],
  },
  '응답 속도': {
    negative: [
      '터치하고 나서 반응이 한 박자 늦게 온다',
      '앱을 여러 개 띄우면 화면 전환이 눈에 띄게 밀린다',
    ],
    neutral: ['업데이트 이후 반응 속도가 조금 빨라졌다'],
    positive: ['앱을 여러 개 띄워도 화면 전환이 밀리지 않는다'],
  },
  '배터리 소모': {
    negative: [
      '완충하고 나가도 반나절이 지나면 배터리가 바닥난다',
      '화면을 켜 두기만 해도 배터리가 눈에 띄게 줄어든다',
    ],
    neutral: ['같은 조건에서 재 보면 하루 사용량이 들쭉날쭉하다'],
    positive: ['하루 종일 써도 저녁까지 배터리가 넉넉하게 남는다'],
  },
  기타: {
    negative: ['같은 증상이 반복돼 사용에 불편이 있다'],
    neutral: ['같은 조건에서 쓰는 다른 사용자와 결과가 조금 다르다'],
    positive: ['걱정했던 부분이 실제로는 문제가 되지 않았다'],
  },
};

/** 카테고리가 세부 이슈로 설명되지 않는 경우(가격·내구성 등)에 쓰는 서술 */
const CATEGORY_SYMPTOM: Partial<Record<IssueCategory, Record<Sentiment, string[]>>> = {
  가격: {
    negative: [
      '같은 사양의 다른 제품과 비교하면 값이 지나치게 높다',
      '출시 두 달 만에 값이 크게 떨어져 먼저 산 쪽이 손해를 봤다',
    ],
    neutral: ['두 달 사이 값이 오르내려 살 시점을 잡기 어렵다'],
    positive: ['이 값에 이 정도 구성이면 아깝지 않다'],
  },
  내구성: {
    negative: [
      '두 달 만에 모서리 마감이 들뜨기 시작했다',
      '가방에 넣고 다녔을 뿐인데 화면 보호층에 흠집이 생겼다',
    ],
    neutral: ['반년쯤 쓰면 마감이 조금씩 달라진다'],
    positive: ['반년을 들고 다녔는데도 마감이 처음과 크게 다르지 않다'],
  },
  발열: {
    negative: [
      '영상 통화를 20분만 해도 손에 닿는 부분이 뜨거워진다',
      '충전하면서 쓰면 열이 올라 화면 밝기가 저절로 낮아진다',
    ],
    neutral: ['같은 작업을 반복하면 표면 온도가 서서히 오른다'],
    positive: ['오래 써도 손에 닿는 부분이 미지근한 정도에 그친다'],
  },
  성능: {
    negative: ['무거운 작업을 돌리면 중간에 눈에 띄게 느려진다'],
    neutral: ['업데이트 전후로 체감 속도가 조금 달라졌다'],
    positive: ['무거운 작업을 돌려도 속도가 크게 떨어지지 않는다'],
  },
  기타: {
    negative: ['설명서에 없는 동작이 반복돼 원인을 찾지 못했다'],
    neutral: ['쓰면서 알게 된 점이 몇 가지 있다'],
    positive: ['사소한 부분까지 신경 쓴 흔적이 느껴진다'],
  },
};

function pick<T>(list: T[], variant: number): T {
  return list[variant % list.length];
}

function symptom(input: TextInput): string {
  const bySubcategory = SYMPTOM[input.subcategory][input.sentiment];
  if (input.subcategory !== '기타' && bySubcategory.length > 0) {
    return pick(bySubcategory, input.variant);
  }
  const byCategory = CATEGORY_SYMPTOM[input.category]?.[input.sentiment];
  if (byCategory && byCategory.length > 0) {
    return pick(byCategory, input.variant);
  }
  return pick(bySubcategory, input.variant);
}

// ── 제목 ──────────────────────────────────────────────────────────────

/**
 * 출처 유형 × 감성별 제목 틀. `{제품}`과 `{이슈}`만 갈아 끼운다.
 * 길이는 SPEC 3.2의 12~40자를 지켜야 하며, 생성 직후 스스로 검사한다.
 */
const TITLE: Record<SourceType, Record<Sentiment, string[]>> = {
  // 기사 제목체 — 명사로 끝내고 조사를 줄인다
  news: {
    negative: [
      '{제품} {이슈} 지적 잇따라',
      '{제품} 사용자 {이슈} 불만 확산',
      '"{이슈} 문제" {제품} 구매자 목소리',
      '{제품}, {이슈} 논란에 대응 요구 커져',
    ],
    neutral: [
      '{제품} {이슈} 실사용 리포트',
      '{제품} {이슈}, 어디까지가 정상인가',
      '{제품} {이슈} 두고 엇갈리는 평가',
    ],
    positive: [
      '{제품} {이슈} 개선 평가 나와',
      '{제품}, {이슈}에서 호평 이어져',
      '{제품} {이슈} 만족도 높다는 평가',
    ],
  },
  // 구어체 — 말 걸듯 쓰고 물음표·감탄을 허용한다
  community: {
    negative: [
      '{제품} {이슈} 저만 이런가요',
      '{제품} 쓰는데 {이슈} 때문에 답답하네요',
      '{제품} {이슈} 이거 교환 사유 될까요',
      '{제품} {이슈} 참다가 결국 글 남깁니다',
    ],
    neutral: [
      '{제품} {이슈} 다들 어떠신가요',
      '{제품} {이슈} 궁금해서 물어봅니다',
      '{제품} {이슈} 한 달 써 본 느낌',
    ],
    positive: [
      '{제품} {이슈} 생각보다 괜찮네요',
      '{제품} {이슈} 걱정했는데 만족합니다',
      '{제품} {이슈} 이 정도면 잘 나왔어요',
    ],
  },
  // 영상 제목체 — 대괄호 태그와 회차·기간을 붙인다
  video: {
    negative: [
      '[실측] {제품} {이슈} 문제 확인',
      '{제품} {이슈}, 직접 찍어 봤습니다',
      '[3주 사용] {제품} {이슈} 그대로입니다',
    ],
    neutral: [
      '[리뷰] {제품} {이슈} 측정해 봤습니다',
      '{제품} {이슈} 비교 실험 기록',
      '[한 달 기록] {제품} {이슈} 정리',
    ],
    positive: [
      '[실측] {제품} {이슈} 기대 이상',
      '{제품} {이슈} 확인해 봤습니다',
      '[장기 사용] {제품} {이슈} 합격점',
    ],
  },
};

// ── 본문 ──────────────────────────────────────────────────────────────

/**
 * 본문 틀. `{증상}`이 간접인용으로 안겨 들어간다.
 * 뉴스는 평서체, 커뮤니티는 해요체, 영상은 합쇼체로 끝까지 맞춘다 —
 * 한 글 안에서 말투가 섞이면 어느 출처인지 구분이 흐려진다.
 * 길이는 SPEC 3.2의 60~240자다.
 */
const BODY: Record<SourceType, Record<Sentiment, string[]>> = {
  news: {
    negative: [
      '{제품} 구매자들 사이에서 같은 지적이 반복되고 있다. 이용자들은 {증상}고 밝혔다. 제조사는 별도 입장을 내놓지 않았다.',
      '{제품}의 {이슈+을} 두고 불만이 이어지고 있다. 여러 이용자가 {증상}는 점을 문제로 꼽았다. 교환 기준을 명확히 해 달라는 요구도 나온다.',
    ],
    neutral: [
      '{제품}의 {이슈}에 대한 평가가 엇갈린다. 일부 이용자는 {증상}고 전했다. 사용 환경에 따라 체감 차이가 크다는 분석이 나온다.',
      '{제품} 이용자들의 {이슈} 관련 후기를 모았다. {증상}는 기록이 여러 건 확인됐다.',
    ],
    positive: [
      '{제품}의 {이슈+이} 이전 세대보다 나아졌다는 평가가 나온다. 이용자들은 {증상}고 전했다.',
      '{제품} {이슈}에 대한 호평이 이어지고 있다. 실사용자들은 {증상}는 점을 공통으로 꼽았다.',
    ],
  },
  community: {
    negative: [
      '{제품} 산 지 얼마 안 됐는데요, {증상}는 점이 계속 걸려요. 저만 그런 건지 궁금해서 글 남겨 봅니다. 같은 증상 있으신 분 계신가요.',
      '{제품} 쓰면서 신경 쓰이는 게 있어요. {증상}고 느낀 게 한두 번이 아니에요. 초기 불량인지 원래 이런 건지 판단이 안 서네요.',
    ],
    neutral: [
      '{제품} 한 달 정도 써 본 기록입니다. {증상}고 보시면 될 것 같아요. 다른 분들 환경에서는 어떤지 궁금해서 남겨 둡니다.',
      '{제품} {이슈} 관련해서 궁금한 게 있어요. {증상}는데, 비슷한 조건에서 쓰시는 분들 의견 듣고 싶습니다.',
    ],
    positive: [
      '{제품} 한동안 쓰면서 느낀 점 남깁니다. {증상}고 말할 수 있어요. 걱정했던 부분이라 더 만족스럽네요.',
      '{제품} 고민하다 샀는데 잘한 것 같아요. {증상}는 점이 특히 마음에 듭니다. 비슷한 고민 하시는 분들께 도움 되면 좋겠습니다.',
    ],
  },
  video: {
    negative: [
      '{제품}의 {이슈+을} 3주 동안 기록했습니다. 영상에서 보시는 것처럼 {증상}는 결과가 나왔습니다. 측정 조건은 설명란에 정리해 두었습니다.',
      '{제품} {이슈} 관련 제보가 많아 직접 확인해 봤습니다. {증상}고 판단할 만한 장면을 담았습니다. 같은 조건에서 두 번 반복했고 결과는 같았습니다.',
    ],
    neutral: [
      '{제품}의 {이슈+을} 같은 조건에서 측정한 기록입니다. {증상}는 결과였습니다. 수치는 영상 후반부에 표로 정리했습니다.',
      '{제품} {이슈+을} 한 달 동안 지켜본 기록입니다. {증상}고 정리할 수 있겠습니다. 판단은 보시는 분들께 맡기겠습니다.',
    ],
    positive: [
      '{제품}의 {이슈+을} 장기간 확인해 봤습니다. {증상}고 말씀드릴 수 있습니다. 이전 모델과 비교한 화면도 함께 담았습니다.',
      '{제품} {이슈+이} 실제로 어떤지 측정했습니다. {증상}는 결과가 나왔습니다. 기대보다 좋아 기록으로 남깁니다.',
    ],
  },
};

/**
 * 본문 끝에 붙이는 사용 조건 한 문장.
 *
 * 제목·본문·증상은 모두 같은 variant로 골라 함께 움직이기 때문에, 조합 수가 금세
 * 바닥나 본문이 글자 하나까지 똑같은 레코드가 생긴다. 그러면 중복 판별용
 * `content_hash`가 실제로 겹쳐 Phase 7의 중복 처리가 헛돌게 된다.
 * 그래서 이 문장만 다른 주기로 골라 조합 수를 늘린다.
 */
const DETAIL: Record<SourceType, string[]> = {
  news: [
    '제보자들의 사용 기간은 2주에서 3개월 사이였다.',
    '같은 지적은 다른 커뮤니티에서도 확인됐다.',
    '표본이 많지 않아 일반화하기는 이르다.',
    '제조사 측 공식 답변은 아직 나오지 않았다.',
    '유통사는 개별 문의로 확인해 달라고 밝혔다.',
    '비슷한 사례가 지난달에도 보고된 바 있다.',
    '취재 과정에서 확인한 제보는 모두 익명 처리했다.',
  ],
  community: [
    '참고로 구매한 지 3주 정도 됐어요.',
    '설정은 거의 기본값 그대로 쓰고 있어요.',
    '펌웨어는 최신으로 올린 상태입니다.',
    '주로 실내에서만 쓰는 편이에요.',
    '전에 쓰던 기기랑 비교해서 적은 거예요.',
    '혹시 몰라 초기화도 한 번 해 봤습니다.',
    '사진은 따로 올리지 않았는데 필요하면 말씀해 주세요.',
  ],
  video: [
    '측정은 같은 조명 아래에서 진행했습니다.',
    '비교 대상은 직전 세대 모델입니다.',
    '촬영 설정은 고정값으로 두었습니다.',
    '샘플은 두 대로 나눠 확인했습니다.',
    '자세한 수치는 고정 댓글에 정리했습니다.',
    '재현 조건은 영상 마지막에 정리했습니다.',
    '협찬 없이 직접 구매해 촬영했습니다.',
  ],
};

/** 본문이 60자에 못 미칠 때 뒤에 붙이는 문장. 그 출처의 말투를 유지한다 */
const FILLER: Record<SourceType, string[]> = {
  news: [
    '해당 내용은 이용자 제보를 바탕으로 정리한 것이다.',
    '구체적인 사용 조건은 이용자마다 달랐다.',
  ],
  community: [
    '혹시 해결하신 분 계시면 방법 공유 부탁드려요.',
    '조건 더 필요하시면 댓글 남겨 주세요.',
  ],
  video: ['자세한 측정 조건은 설명란을 참고해 주세요.', '다음 영상에서 후속 결과를 다루겠습니다.'],
};

// ── 생성 ──────────────────────────────────────────────────────────────

export const TITLE_MIN = 12;
export const TITLE_MAX = 40;
export const EXCERPT_MIN = 60;
export const EXCERPT_MAX = 240;

/** `{이슈+을}`처럼 조사를 지정한 자리를 받침에 맞춰 채운다 */
function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (whole, token: string) => {
    const [name, josaKey] = token.split('+');
    const value = values[name];
    if (value === undefined) return whole;
    return josaKey ? withJosa(value, josaKey) : value;
  });
}

export function buildText(input: TextInput): GeneratedText {
  const noun = issueNoun(input.category, input.subcategory);
  const values = { 제품: input.productName, 이슈: noun, 증상: symptom(input) };

  let title = fillTemplate(pick(TITLE[input.sourceType][input.sentiment], input.variant), values);
  // 12자에 못 미치는 조합은 없어야 하지만, 있으면 이슈 명사를 덧붙여 채운다
  if (title.length < TITLE_MIN) {
    title = `${title} ${noun}`.trim();
  }
  if (title.length > TITLE_MAX) {
    title = title.slice(0, TITLE_MAX);
  }

  let excerpt = fillTemplate(pick(BODY[input.sourceType][input.sentiment], input.variant), values);
  // 본문 틀과 다른 주기로 골라 같은 문장이 통째로 겹치는 것을 막는다.
  // 7개를 3칸씩 건너뛰며 고른다 — 본문 틀(2개)·증상(최대 3개)의 주기와 서로소라
  // 세 가지가 같이 되돌아오기까지 42건이 걸린다.
  const details = DETAIL[input.sourceType];
  excerpt = `${excerpt} ${details[(input.variant * 3) % details.length]}`;

  let fillerIndex = 0;
  while (excerpt.length < EXCERPT_MIN && fillerIndex < FILLER[input.sourceType].length) {
    excerpt = `${excerpt} ${FILLER[input.sourceType][fillerIndex]}`;
    fillerIndex += 1;
  }
  if (excerpt.length > EXCERPT_MAX) {
    excerpt = `${excerpt.slice(0, EXCERPT_MAX - 1).trimEnd()}…`;
  }

  return { title, excerpt };
}

// ── 출력 ──────────────────────────────────────────────────────────────

const SOURCE_TYPE_SAMPLE: Record<SourceType, string> = {
  news: 'S-01·S-02 가상 IT 뉴스 — 기사 제목체',
  community: 'S-03·S-04 가상 사용자 커뮤니티 — 구어체',
  video: 'S-05 가상 영상 채널 — 영상 제목체',
};

function report(): void {
  const cases: { category: IssueCategory; subcategory: IssueSubcategory; sentiment: Sentiment }[] = [
    { category: '화질', subcategory: '색 균일도', sentiment: 'negative' },
    { category: '발열', subcategory: '기타', sentiment: 'neutral' },
    { category: '가격', subcategory: '기타', sentiment: 'positive' },
  ];
  const products = ['루멘 폰 X', '아틀라스 탭 11', '클리어뷰 모니터 27'];
  const sourceTypes: SourceType[] = ['news', 'community', 'video'];

  for (const sourceType of sourceTypes) {
    console.log(`■ ${SOURCE_TYPE_SAMPLE[sourceType]}`);
    cases.forEach((testCase, index) => {
      const text = buildText({
        sourceType,
        productName: products[index],
        variant: index,
        ...testCase,
      });
      console.log(`  [${testCase.sentiment}] ${text.title}  (${text.title.length}자)`);
      console.log(`    ${text.excerpt}`);
      console.log(`    (본문 ${text.excerpt.length}자)`);
    });
    console.log();
  }

  // 모든 조합을 한 번씩 돌려 길이 규칙과 조사 오류를 본다
  const allSubcategories = Object.keys(SUBCATEGORY_NOUN) as IssueSubcategory[];
  const allCategories = Object.keys(CATEGORY_NOUN) as IssueCategory[];
  const sentiments: Sentiment[] = ['negative', 'neutral', 'positive'];
  const failures: string[] = [];
  // 받침 유무를 잘못 골랐을 때만 생기는 짝. 하나라도 나오면 조사 로직이 틀린 것이다
  const badJosa = ['질를', '능를', '격를', '성를', '열를', '인를', '임를', '상를', '질가', '능가', '격가', '성가', '열가', '인가 실제로', '중이다는', '중이다고'];
  let checked = 0;

  for (const sourceType of sourceTypes) {
    for (const category of allCategories) {
      for (const subcategory of allSubcategories) {
        for (const sentiment of sentiments) {
          for (let variant = 0; variant < 4; variant += 1) {
            const text = buildText({
              sourceType,
              productName: '클리어뷰 모니터 27',
              category,
              subcategory,
              sentiment,
              variant,
            });
            checked += 1;
            if (text.title.length < TITLE_MIN || text.title.length > TITLE_MAX) {
              failures.push(`제목 ${text.title.length}자: ${text.title}`);
            }
            if (text.excerpt.length < EXCERPT_MIN || text.excerpt.length > EXCERPT_MAX) {
              failures.push(`본문 ${text.excerpt.length}자: ${text.excerpt.slice(0, 30)}…`);
            }
            for (const bad of badJosa) {
              if (text.excerpt.includes(bad) || text.title.includes(bad)) {
                failures.push(`조사 오류 '${bad}': ${text.excerpt.slice(0, 40)}…`);
              }
            }
          }
        }
      }
    }
  }

  console.log(
    `조합 ${checked}건을 돌려 길이 규칙(제목 ${TITLE_MIN}~${TITLE_MAX}자 · 본문 ${EXCERPT_MIN}~${EXCERPT_MAX}자)과 조사를 확인했다.`,
  );
  if (failures.length > 0) {
    console.error(`\n문제가 있는 문장 ${failures.length}건:`);
    [...new Set(failures)].slice(0, 10).forEach((failure) => console.error(`  - ${failure}`));
    process.exit(1);
  }
  console.log('문제 없음.');
}

if (import.meta.main) {
  report();
}
