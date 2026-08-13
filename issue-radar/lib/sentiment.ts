import type { Sentiment } from './types';

/**
 * 감성 3종의 한국어 이름과 색.
 *
 * 추세 그래프의 계열, 원문 목록의 감성 표시, 범례가 모두 이 값을 읽는다.
 * 한 곳에 두는 이유는 화면마다 색이 달라지면 같은 부정 반응이 어떤 영역에서는
 * 빨강, 어떤 영역에서는 회색으로 보이기 때문이다.
 *
 * 값은 `app/globals.css`의 `--negative`·`--neutral`·`--positive`와 같다.
 * SVG 안에서는 CSS 변수를 쓰기 어려워 여기에 한 벌 더 적어 둔다.
 */
export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  negative: '부정',
  neutral: '중립',
  positive: '긍정',
};

export const SENTIMENT_COLOR: Record<Sentiment, string> = {
  negative: '#d1495b',
  neutral: '#8d99ae',
  positive: '#2a9d8f',
};

/** 범례와 계열을 그릴 순서. 부정을 앞에 두어 먼저 눈에 들어오게 한다 */
export const SENTIMENT_ORDER: Sentiment[] = ['negative', 'neutral', 'positive'];
