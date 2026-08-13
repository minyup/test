import type { FeedbackRecord, FilterState, Period } from './types';

/**
 * 기준일은 `2026-08-13` 고정이다(SPEC 4.1).
 *
 * 실행 시각에서 "오늘"을 읽지 않는다. 읽는 순간 며칠 뒤 테스트가 깨지고,
 * 샘플 데이터가 30일 밖으로 밀려나 화면이 비게 된다.
 */
export const BASE_DATE = '2026-08-13';

/** 기간 필터가 보는 날짜 수. 기준일을 포함한 값이다 */
const PERIOD_LENGTH: Record<Period, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
};

export const PERIOD_LABEL: Record<Period, string> = {
  today: '오늘',
  '7d': '최근 7일',
  '30d': '최근 30일',
};

function shiftDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * 기간의 시작·끝 날짜. 경계는 양끝 포함이다(SPEC 6.1).
 *
 * 최근 7일은 08-07~08-13이지 08-06~08-13이 아니다 — 기준일이 7일 안에 들어간다.
 */
export function periodRange(period: Period): { from: string; to: string } {
  return { from: shiftDate(BASE_DATE, -(PERIOD_LENGTH[period] - 1)), to: BASE_DATE };
}

/**
 * ISO 8601 값에서 날짜만 떼어 낸다.
 *
 * `Date`로 파싱하지 않는 이유는, 파싱하면 실행 환경의 시간대가 끼어들어
 * `2026-08-13T02:00:00+09:00`이 하루 앞 날짜로 잡히는 일이 생기기 때문이다.
 * 샘플 데이터의 시각은 전부 `+09:00`이므로 앞 10글자가 곧 그 글이 올라온 날이다.
 */
export function dateOf(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

/**
 * 기간과 제품을 동시에 건다(AND). 어느 하나만 걸리는 경우는 없다(SPEC 5.1).
 *
 * 정렬은 건드리지 않는다 — 목록의 정렬은 화면이 정할 몫이다.
 */
export function applyFilter(records: FeedbackRecord[], filter: FilterState): FeedbackRecord[] {
  const { from, to } = periodRange(filter.period);

  return records.filter((record) => {
    const date = dateOf(record.published_at);
    if (date < from || date > to) return false;
    if (filter.productId !== 'all' && record.analysis.product_id !== filter.productId) return false;
    return true;
  });
}
