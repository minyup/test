'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SENTIMENT_COLOR, SENTIMENT_LABEL, SENTIMENT_ORDER } from '@/lib/sentiment';
import type { TrendPoint } from '@/lib/metrics';

/** x축에는 연도를 빼고 MM-DD만 쓴다. 30개가 나란히 서므로 짧아야 읽힌다 */
function shortDate(date: string): string {
  return date.slice(5);
}

/**
 * 날짜별 언급량·감성 추세(SPEC 5.3).
 *
 * `interval={0}`이 핵심이다. 기본값에서 Recharts는 축이 좁으면 눈금을 스스로 솎아 내,
 * 30일을 골랐는데 눈금이 5~6개만 남는다. Phase 3 검증이 눈금 수를 세므로
 * 솎아 내지 않도록 못 박아 둔다.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ee" />
        <XAxis
          dataKey="date"
          interval={0}
          tickFormatter={shortDate}
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={54}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={36} />
        <Tooltip />
        <Legend verticalAlign="top" height={28} />
        {SENTIMENT_ORDER.map((sentiment) => (
          <Line
            key={sentiment}
            type="monotone"
            dataKey={sentiment}
            name={SENTIMENT_LABEL[sentiment]}
            stroke={SENTIMENT_COLOR[sentiment]}
            strokeWidth={2}
            // 하루짜리 기간에서는 잇는 선이 없어 점을 켜지 않으면 아무것도 안 보인다.
            // 30일에서는 점이 서른 개씩 세 줄이라 오히려 선을 가린다
            dot={points.length <= 7 ? { r: 3 } : false}
            activeDot={{ r: 4 }}
            // 그리기 애니메이션을 끈다. 켜 두면 stroke-dasharray가 0에서 시작하는데,
            // 탭이 뒤에 있거나 필터를 연달아 누르면 그 상태로 멈춰 선이 아예 안 보인다.
            // Phase 3 검증이 DOM을 세는 방식이라, 다 그려질 때까지 기다려야 하는 그림은 곤란하다
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
