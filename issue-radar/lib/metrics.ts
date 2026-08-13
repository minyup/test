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
