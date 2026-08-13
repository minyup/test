// 확장자를 붙여 적는다. 타입이 아닌 값을 가져오는 import는 확장자가 없으면
// `node lib/...ts`로 바로 돌려 볼 때 해석되지 않는다.
import { dateOf } from './filter.ts';
import type { FeedbackRecord } from './types';

/**
 * 지표 집계. 입력은 이미 필터가 걸린 레코드 배열이다 —
 * 집계 함수가 필터를 다시 걸지 않는다. 두 곳에서 거르면 어느 쪽이 틀렸는지 알 수 없다.
 */

/** 언급량 = 조건을 만족하는 게시물의 수(SPEC 6.2) */
export function countTotal(records: FeedbackRecord[]): number {
  return records.length;
}

/**
 * 부정 반응 비율(SPEC 6.3). 소수점 첫째 자리까지 반올림한다.
 *
 * 건수가 0이면 0이 아니라 `null`을 돌려준다. 0%로 쓰면 "부정이 하나도 없다"는
 * 거짓말이 되기 때문이다. 화면은 `null`을 `—`로 표시한다.
 */
export function negativeRatio(records: FeedbackRecord[]): number | null {
  if (records.length === 0) return null;

  const negative = records.filter((record) => record.analysis.sentiment === 'negative').length;
  return Math.round((negative / records.length) * 1000) / 10;
}

/** 추세 그래프의 한 눈금 */
export interface TrendPoint {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

function shiftDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * 날짜별 감성 추세(SPEC 5.3).
 *
 * `from`~`to` 전 범위를 하루도 빠짐없이 채워 오름차순으로 돌려준다.
 * 데이터가 없는 날을 건너뛰면 x축 눈금 수가 기간과 어긋나 — 30일을 골랐는데
 * 눈금이 27개가 되는 — 검증이 깨진다. 빈 날은 세 계열 모두 0이다.
 */
export function trendBySentiment(
  records: FeedbackRecord[],
  from: string,
  to: string,
): TrendPoint[] {
  const points = new Map<string, TrendPoint>();
  for (let date = from; date <= to; date = shiftDate(date, 1)) {
    points.set(date, { date, positive: 0, negative: 0, neutral: 0 });
  }

  for (const record of records) {
    const point = points.get(dateOf(record.published_at));
    // 기간 밖의 레코드는 무시한다. 거르는 일은 applyFilter의 몫이다
    if (!point) continue;
    point[record.analysis.sentiment] += 1;
  }

  return [...points.values()];
}
