import { loadFeedback, loadProducts } from '@/lib/loader';

import { Dashboard } from './components/dashboard';

// 대시보드는 이 화면 하나뿐이다. 별도 라우트를 만들지 않는다(SPEC 5장).
//
// 이 파일은 서버에서 데이터를 읽어 넘기는 일만 한다. 필터 상태와 다섯 영역은
// Dashboard가 들고 있다 — 필터를 누를 때마다 서버를 다시 다녀오지 않게 하기 위해서다.
export default function DashboardPage() {
  const products = loadProducts();
  const records = loadFeedback();

  return (
    <main className="dashboard">
      <header>
        <h1 className="dashboard-title">디스플레이 시장 이슈 조기 감지</h1>
        <p className="dashboard-subtitle">기준일 2026-08-13 · 샘플 데이터 300건</p>
      </header>

      <Dashboard products={products} records={records} />
    </main>
  );
}
