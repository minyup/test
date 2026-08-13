'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { CategoryCount } from '@/lib/metrics';
import type { IssueCategory } from '@/lib/types';

/**
 * 카테고리 7종의 색. 감성 3색(`lib/sentiment.ts`)과 겹치지 않게 골랐다 —
 * 같은 화면에서 빨강이 어떤 데는 부정, 어떤 데는 화질을 뜻하면 읽는 사람이 헷갈린다.
 */
const CATEGORY_COLOR: Record<IssueCategory, string> = {
  화질: '#3d5a80',
  성능: '#ee6c4d',
  소비전력: '#98c1d9',
  가격: '#e0a458',
  내구성: '#7d8f69',
  발열: '#c1666b',
  기타: '#9a8c98',
};

/**
 * 카테고리별 분포(SPEC 5.4).
 *
 * 들어오는 배열은 언제나 길이 7이다. 건수가 0인 카테고리도 그대로 그린다 —
 * 조각은 각도 0이라 눈에 보이지 않지만 범례에는 남아야, 사라진 카테고리가
 * 원래 없는 것인지 이번 조건에서 0인 것인지 구분된다.
 */
export function DistributionChart({ counts }: { counts: CategoryCount[] }) {
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);
  const countByCategory = new Map(counts.map((entry) => [entry.category, entry.count]));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={counts}
          dataKey="count"
          nameKey="category"
          cx="38%"
          outerRadius={110}
          // 애니메이션을 켜 두면 조각이 다 그려질 때까지 화면이 비어 보인다(LB-120과 같은 이유)
          isAnimationActive={false}
        >
          {counts.map((entry) => (
            <Cell key={entry.category} fill={CATEGORY_COLOR[entry.category]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value ?? 0}건`} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          // 범례에 건수를 같이 적는다. 조각만으로는 27과 30을 구별할 수 없다
          formatter={(value: string) => {
            const count = countByCategory.get(value as IssueCategory) ?? 0;
            const share = total === 0 ? '0.0' : ((count / total) * 100).toFixed(1);
            return `${value} ${count}건 (${share}%)`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
