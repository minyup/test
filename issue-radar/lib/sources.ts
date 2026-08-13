import type { Source } from './types';

/**
 * 출처 5개 — SPEC 4.4 표 그대로다.
 *
 * `Source`는 이번 범위에서 파일로 만들지 않고 상수로 둔다(SPEC 3.4). 수집이 없어
 * 늘거나 줄지 않기 때문이다. Phase 7에서 수집이 붙으면 `data/sources.json`으로 승격하고
 * 로더 뒤로 옮긴다.
 *
 * 원문 목록(SPEC 5.5)의 출처명과 유형 뱃지가 이 상수를 읽는다.
 * 실제 매체명을 쓰지 않는다 — 전부 지어낸 이름이다.
 */
export const SOURCES: readonly Source[] = [
  { id: 'S-01', name: '가상 IT 뉴스 A', source_type: 'news' },
  { id: 'S-02', name: '가상 IT 뉴스 B', source_type: 'news' },
  { id: 'S-03', name: '가상 사용자 커뮤니티 A', source_type: 'community' },
  { id: 'S-04', name: '가상 사용자 커뮤니티 B', source_type: 'community' },
  { id: 'S-05', name: '가상 영상 채널', source_type: 'video' },
] as const;

const SOURCE_BY_ID = new Map(SOURCES.map((source) => [source.id, source]));

/** 없는 id를 넘기면 undefined다 — 화면이 아니라 스키마 검증기가 잡을 문제이기 때문이다. */
export function findSource(id: string): Source | undefined {
  return SOURCE_BY_ID.get(id);
}

/** 출처 유형 뱃지에 쓸 한국어 이름 */
export const SOURCE_TYPE_LABEL = {
  news: '뉴스',
  community: '커뮤니티',
  video: '영상',
} as const;
