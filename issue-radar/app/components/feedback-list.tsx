'use client';

import { SENTIMENT_COLOR, SENTIMENT_LABEL } from '@/lib/sentiment';
import { SOURCE_TYPE_LABEL, findSource } from '@/lib/sources';
import type { FeedbackRecord, Product } from '@/lib/types';

/**
 * 원문 목록(SPEC 5.5).
 *
 * 이 영역의 존재 이유는 원문 추적성이다 — 모든 행에서 `original_url`로 갈 수 있어야 한다.
 * 그래서 제목은 반드시 링크이고, 새 탭으로 연다.
 *
 * 몇 건까지 보여 줄지(`limit`)는 이 컴포넌트가 아니라 대시보드가 들고 있다.
 * 여기에 두면 필터를 바꿔도 더 보기로 늘려 둔 개수가 남아 건수가 어긋난다(LB-123).
 */
export function FeedbackList({
  records,
  products,
  limit,
  onShowMore,
}: {
  records: FeedbackRecord[];
  products: Product[];
  limit: number;
  onShowMore: () => void;
}) {
  const productName = new Map(products.map((product) => [product.id, product.name]));

  // 정렬 기본값은 최신순이다(SPEC 5.5). 원본 배열을 건드리지 않으려고 복사해서 정렬한다
  const sorted = [...records].sort((a, b) => b.published_at.localeCompare(a.published_at));
  const visible = sorted.slice(0, limit);
  const remaining = sorted.length - visible.length;

  return (
    <>
      <div className="feedback-table-scroll">
        <table className="feedback-table">
          <thead>
            <tr>
              <th scope="col">제목</th>
              <th scope="col">제품</th>
              <th scope="col">카테고리</th>
              <th scope="col">감성</th>
              <th scope="col">출처</th>
              <th scope="col">작성일</th>
              <th scope="col">요약</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((record) => {
              const source = findSource(record.source_id);
              const sentiment = record.analysis.sentiment;

              return (
                <tr key={record.id}>
                  <td>
                    <a
                      className="feedback-title"
                      href={record.original_url}
                      target="_blank"
                      // 새 탭으로 열 때 opener를 넘기지 않는다
                      rel="noreferrer noopener"
                    >
                      {record.title}
                    </a>
                  </td>
                  <td>
                    {productName.get(record.analysis.product_id) ?? record.analysis.product_id}
                  </td>
                  <td>{record.analysis.issue_category}</td>
                  <td>
                    {/* 색만으로 구분하지 않는다. 색을 못 보는 사람에게도 글자가 남는다 */}
                    <span className="sentiment-tag" style={{ color: SENTIMENT_COLOR[sentiment] }}>
                      <span
                        className="sentiment-dot"
                        style={{ background: SENTIMENT_COLOR[sentiment] }}
                      />
                      {SENTIMENT_LABEL[sentiment]}
                    </span>
                  </td>
                  <td>
                    {source?.name ?? record.source_id}
                    {source ? (
                      <span className={`source-badge source-badge-${source.source_type}`}>
                        {SOURCE_TYPE_LABEL[source.source_type]}
                      </span>
                    ) : null}
                  </td>
                  <td className="feedback-date">{record.published_at.slice(0, 10)}</td>
                  <td className="feedback-summary">
                    {/*
                     * summary는 사람이 쓴 사실 기술이 아니라 분석 결과다(SPEC 5.6).
                     * 표시와 원문 링크를 요약 바로 옆에 함께 둔다 — 읽는 사람이
                     * 근거를 확인하려고 행 안에서 눈을 옮길 필요가 없어야 한다.
                     */}
                    <p className="summary-notice">
                      <span className="summary-badge">참고용 분석 결과</span>
                      <a
                        className="summary-source-link"
                        href={record.original_url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        원문 확인
                      </a>
                    </p>
                    <p className="summary-text">{record.analysis.summary}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/*
       * 더 보기(SPEC 5.5). 남은 건수를 버튼에 적어 몇 번을 더 눌러야 하는지 보이게 한다.
       * 끝까지 늘리면 버튼 자체가 사라진다 — 눌러도 아무 일이 없는 버튼을 남겨 두지 않는다.
       */}
      <div className="feedback-list-footer">
        <p className="feedback-list-count" role="status">
          {sorted.length.toLocaleString('ko-KR')}건 중 {visible.length.toLocaleString('ko-KR')}건
        </p>
        {remaining > 0 ? (
          <button type="button" className="show-more-button" onClick={onShowMore}>
            더 보기 (남은 {remaining.toLocaleString('ko-KR')}건)
          </button>
        ) : null}
      </div>
    </>
  );
}
