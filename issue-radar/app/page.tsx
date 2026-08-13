import { ChartSmokeTest } from './components/chart-smoke-test';

// 대시보드는 이 화면 하나뿐이다. 별도 라우트를 만들지 않는다(SPEC 5장).
// 다섯 영역을 위에서 아래 순서로 둔다: 필터 바 · 지표 카드 · 추세 그래프 · 분포 차트 · 원문 목록.
// 지금은 자리만 잡은 뼈대이고, 내용은 LB-118~123에서 하나씩 채운다.
export default function DashboardPage() {
  return (
    <main className="dashboard">
      <header>
        <h1 className="dashboard-title">디스플레이 시장 이슈 조기 감지</h1>
        <p className="dashboard-subtitle">기준일 2026-08-13 · 최근 30일 · 전체 제품</p>
      </header>

      {/* 1. 필터 바 — 아래 네 영역이 전부 같은 필터 상태 하나를 본다 */}
      <section className="panel filter-bar" aria-labelledby="filter-bar-heading">
        <h2 className="panel-heading" id="filter-bar-heading">
          필터
        </h2>
        <div className="placeholder">기간 3종 · 제품 4종 (LB-118)</div>
      </section>

      {/* 2. 지표 카드 2개 */}
      <section className="metric-cards" aria-label="지표">
        <article className="panel metric-card">
          <div>
            {/* "신규 수집 건수"가 아니다 — 1단계에는 수집이 없다(SPEC 5.2) */}
            <p className="metric-card-label">언급 건수</p>
            <div className="metric-card-value">—</div>
          </div>
          {/* Phase 5 급증 배지가 들어올 자리. 이번 범위에서는 렌더하지 않는다 */}
          <div className="surge-badge-slot" aria-hidden="true" />
        </article>

        <article className="panel metric-card">
          <div>
            <p className="metric-card-label">부정 반응 비율</p>
            <div className="metric-card-value">—</div>
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
          {/* LB-103 시험용. LB-120·121에서 진짜 차트로 바뀐다 */}
          <ChartSmokeTest />
        </div>
      </section>

      {/* 4. 카테고리별 분포 차트 */}
      <section className="panel" aria-labelledby="distribution-heading">
        <h2 className="panel-heading" id="distribution-heading">
          카테고리별 분포
        </h2>
        <div className="placeholder chart-body">조각 7개 (LB-121)</div>
      </section>

      {/* 5. 원문 목록 — 원문 추적성이 이 영역의 존재 이유다 */}
      <section className="panel" aria-labelledby="feedback-list-heading">
        <h2 className="panel-heading" id="feedback-list-heading">
          원문 목록
        </h2>
        <div className="placeholder">최신순 20건 · 더 보기 (LB-122·123)</div>
      </section>
    </main>
  );
}
