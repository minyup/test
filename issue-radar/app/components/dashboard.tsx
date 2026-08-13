'use client';

import { useMemo, useState } from 'react';

import { PERIOD_LABEL, applyFilter, periodRange } from '@/lib/filter';
import { countTotal, distributionByCategory, negativeRatio, trendBySentiment } from '@/lib/metrics';
import type { FeedbackRecord, FilterState, Period, Product } from '@/lib/types';

import { DistributionChart } from './distribution-chart';
import { FeedbackList } from './feedback-list';
import { TrendChart } from './trend-chart';

/** 원문 목록은 한 번에 20건씩 보여 준다(SPEC 5.5) */
const PAGE_SIZE = 20;

const PERIODS: Period[] = ['today', '7d', '30d'];

/**
 * 부정 반응 비율을 화면 글자로 바꾼다.
 * 0건이면 `null`이 오고, 그때는 `0.0%`가 아니라 `—`를 쓴다(SPEC 6.3).
 * 0%로 쓰면 "부정이 하나도 없다"는 거짓말이 되기 때문이다.
 */
function formatRatio(ratio: number | null): string {
  return ratio === null ? '—' : `${ratio.toFixed(1)}%`;
}

/**
 * 대시보드 전체가 이 컴포넌트 하나의 필터 상태를 본다(SPEC 5.1).
 * 영역마다 상태를 따로 두면 지표 카드와 원문 목록이 서로 다른 기간을 보게 된다.
 *
 * 데이터는 서버에서 한 번 읽어 통째로 넘긴다. 화면은 그것이 어디서 왔는지 모른다.
 */
export function Dashboard({
  products,
  records,
}: {
  products: Product[];
  records: FeedbackRecord[];
}) {
  const [filter, setFilter] = useState<FilterState>({ period: '30d', productId: 'all' });

  // 원문 목록이 지금 몇 건까지 나와 있는지. 더 보기를 누를 때마다 20건씩 늘어난다
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /**
   * 필터를 바꿀 때는 반드시 이 함수를 쓴다.
   * 더 보기로 늘려 둔 개수를 20건으로 되돌리지 않으면 이전 필터의 개수를 물고 있어서
   * "필터를 걸면 목록 건수도 함께 바뀐다"(SPEC 5.5)가 깨진다.
   */
  const changeFilter = (patch: Partial<FilterState>) => {
    setFilter((current) => ({ ...current, ...patch }));
    setVisibleCount(PAGE_SIZE);
  };

  // is_active가 false인 제품은 목록에 아예 나오지 않는다(SPEC 5.1)
  const activeProducts = products.filter((product) => product.is_active);

  // 다섯 영역이 전부 이 결과 하나를 본다. 영역마다 다시 거르지 않는다
  const filtered = useMemo(() => applyFilter(records, filter), [records, filter]);

  // 눈금 수는 기간이 정한다 — 오늘 1 · 7일 7 · 30일 30
  const trend = useMemo(() => {
    const { from, to } = periodRange(filter.period);
    return trendBySentiment(filtered, from, to);
  }, [filtered, filter.period]);

  // 어떤 필터에서도 길이는 항상 7이다
  const distribution = useMemo(() => distributionByCategory(filtered), [filtered]);

  return (
    <>
      {/* 1. 필터 바 — 아래 네 영역이 전부 이 상태 하나를 본다 */}
      <section className="panel filter-bar" aria-labelledby="filter-bar-heading">
        <h2 className="panel-heading" id="filter-bar-heading">
          필터
        </h2>

        <div className="filter-group" role="group" aria-label="기간">
          <span className="filter-group-label">기간</span>
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              className="filter-chip"
              aria-pressed={filter.period === period}
              onClick={() => changeFilter({ period })}
            >
              {PERIOD_LABEL[period]}
            </button>
          ))}
        </div>

        <div className="filter-group" role="group" aria-label="제품">
          <span className="filter-group-label">제품</span>
          <button
            type="button"
            className="filter-chip"
            aria-pressed={filter.productId === 'all'}
            onClick={() => changeFilter({ productId: 'all' })}
          >
            전체
          </button>
          {activeProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              className="filter-chip"
              aria-pressed={filter.productId === product.id}
              onClick={() => changeFilter({ productId: product.id })}
            >
              {product.name}
            </button>
          ))}
        </div>
      </section>

      {/* 2. 지표 카드 2개 */}
      <section className="metric-cards" aria-label="지표">
        <article className="panel metric-card">
          <div>
            {/* "신규 수집 건수"가 아니다 — 1단계에는 수집이 없다(SPEC 5.2) */}
            <p className="metric-card-label">언급 건수</p>
            <div className="metric-card-value">{countTotal(filtered).toLocaleString('ko-KR')}</div>
          </div>
          {/* Phase 5 급증 배지가 들어올 자리. 이번 범위에서는 렌더하지 않는다 */}
          <div className="surge-badge-slot" aria-hidden="true" />
        </article>

        <article className="panel metric-card">
          <div>
            <p className="metric-card-label">부정 반응 비율</p>
            <div className="metric-card-value">{formatRatio(negativeRatio(filtered))}</div>
          </div>
          <div className="surge-badge-slot" aria-hidden="true" />
        </article>
      </section>

      {/* 3. 날짜별 언급량·감성 추세 그래프 */}
      <section className="panel" aria-labelledby="trend-heading">
        <h2 className="panel-heading" id="trend-heading">
          날짜별 언급량·감성 추세
        </h2>
        <div className="chart-body">
          <TrendChart points={trend} />
        </div>
      </section>

      {/* 4. 카테고리별 분포 차트 */}
      <section className="panel" aria-labelledby="distribution-heading">
        <h2 className="panel-heading" id="distribution-heading">
          카테고리별 분포
        </h2>
        <div className="chart-body">
          <DistributionChart counts={distribution} />
        </div>
      </section>

      {/* 5. 원문 목록 — 원문 추적성이 이 영역의 존재 이유다 */}
      <section className="panel" aria-labelledby="feedback-list-heading">
        <h2 className="panel-heading" id="feedback-list-heading">
          원문 목록
        </h2>
        <FeedbackList
          records={filtered}
          products={products}
          limit={visibleCount}
          onShowMore={() => setVisibleCount((current) => current + PAGE_SIZE)}
        />
      </section>
    </>
  );
}
