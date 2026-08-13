import { DataError, loadFeedback, loadProducts } from '@/lib/loader';

import { DataErrorScreen } from './components/data-error-screen';
import { Dashboard } from './components/dashboard';

// JSON 파일은 실행 중에도 사람이 고칠 수 있다. 빌드 때 읽은 결과를 고정하지 않고
// 요청마다 서버에서 현재 파일 상태를 확인한다.
export const dynamic = 'force-dynamic';

// 대시보드는 이 화면 하나뿐이다. 별도 라우트를 만들지 않는다(SPEC 5장).
//
// 이 파일은 서버에서 데이터를 읽어 넘기는 일만 한다. 필터 상태와 다섯 영역은
// Dashboard가 들고 있다 — 필터를 누를 때마다 서버를 다시 다녀오지 않게 하기 위해서다.
export default function DashboardPage() {
  try {
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
  } catch (error) {
    // 데이터 파일 문제는 운영자가 고칠 수 있는 예상 오류다. 서버 오류 경계로 넘기면
    // 프로덕션에서 상세 메시지가 숨겨지므로 여기서 안전한 DataError 정보만 보여 준다.
    if (error instanceof DataError) return <DataErrorScreen error={error} />;
    throw error;
  }
}
