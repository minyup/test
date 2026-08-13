import { ChartSmokeTest } from './components/chart-smoke-test';

export default function DashboardPage() {
  return (
    <main>
      <h1>디스플레이 시장 이슈 조기 감지</h1>
      {/* LB-103 시험용. LB-121에서 진짜 분포 차트로 바뀐다 */}
      <ChartSmokeTest />
    </main>
  );
}
