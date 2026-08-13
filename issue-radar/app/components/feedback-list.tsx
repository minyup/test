'use client';

import { SENTIMENT_COLOR, SENTIMENT_LABEL } from '@/lib/sentiment';
import { SOURCE_TYPE_LABEL, findSource } from '@/lib/sources';
import type { FeedbackRecord, Product } from '@/lib/types';

/**
 * 원문 목록(SPEC 5.5).
 *
 * 이 영역의 존재 이유는 원문 추적성이다 — 모든 행에서 `original_url`로 갈 수 있어야 한다.
 * 그래서 제목은 반드시 링크이고, 새 탭으로 연다.
 */
export function FeedbackList({
  records,
  products,
  limit,
}: {
  records: FeedbackRecord[];
  products: Product[];
  limit: number;
}) {
  const productName = new Map(products.map((product) => [product.id, product.name]));

  // 정렬 기본값은 최신순이다(SPEC 5.5). 원본 배열을 건드리지 않으려고 복사해서 정렬한다
  const sorted = [...records].sort((a, b) => b.published_at.localeCompare(a.published_at));
  const visible = sorted.slice(0, limit);

  return (
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
                <td>{productName.get(record.analysis.product_id) ?? record.analysis.product_id}</td>
                <td>{record.analysis.issue_category}</td>
                <td>
                  {/* 색만으로 구분하지 않는다. 색을 못 보는 사람에게도 글자가 남는다 */}
                  <span className="sentiment-tag" style={{ color: SENTIMENT_COLOR[sentiment] }}>
                    <span className="sentiment-dot" style={{ background: SENTIMENT_COLOR[sentiment] }} />
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
                <td className="feedback-summary">{record.analysis.summary}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
