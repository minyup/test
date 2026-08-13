'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// LB-103 시험용 차트. Recharts가 실제로 그려지는지, 그리고 x축 눈금을 DOM에서 셀 수
// 있는지 확인하려고 둔 것이다. 진짜 차트(LB-120·121)가 붙으면 이 파일은 지운다.
//
// 너비·높이를 ResponsiveContainer 대신 숫자로 박은 이유: 그래야 서버 렌더 HTML에도
// SVG가 그대로 나와서 브라우저 없이 curl로 눈금 수를 셀 수 있다.
const SAMPLE = [
  { date: '08-11', 부정: 7, 중립: 5, 긍정: 2 },
  { date: '08-12', 부정: 9, 중립: 4, 긍정: 3 },
  { date: '08-13', 부정: 8, 중립: 5, 긍정: 3 },
];

// 조각 7개를 DOM에서 셀 수 있는지 확인하려고 둔 것이다. 값은 SPEC 4.3 카테고리 분포.
const SLICES = [
  { name: '화질', value: 96, color: '#d1495b' },
  { name: '성능', value: 54, color: '#e07a5f' },
  { name: '소비전력', value: 33, color: '#f2cc8f' },
  { name: '가격', value: 27, color: '#81b29a' },
  { name: '내구성', value: 30, color: '#2a9d8f' },
  { name: '발열', value: 39, color: '#3d5a80' },
  { name: '기타', value: 21, color: '#8d99ae' },
];

export function ChartSmokeTest() {
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <BarChart width={480} height={260} data={SAMPLE}>
        <CartesianGrid strokeDasharray="3 3" />
        {/* interval={0}이 없으면 Recharts가 좁은 축에서 눈금을 자동으로 솎아 낸다 */}
        <XAxis dataKey="date" interval={0} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="부정" fill="#d1495b" />
        <Bar dataKey="중립" fill="#8d99ae" />
        <Bar dataKey="긍정" fill="#2a9d8f" />
      </BarChart>

      <PieChart width={360} height={260}>
        <Pie data={SLICES} dataKey="value" nameKey="name" outerRadius={90}>
          {SLICES.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}
