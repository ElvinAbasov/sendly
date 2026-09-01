import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BalancePoint } from '../../types'
import { formatAmount, formatDate } from '../../utils/format'

interface BalanceChartProps {
  data: BalancePoint[]
  currency: string
}

export function BalanceChart({ data, currency }: BalanceChartProps) {
  if (data.length < 2) {
    return (
      <div className="chart-empty">
        <p>Добавьте операции, чтобы увидеть график</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDate(d)}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null
            const point = payload[0].payload as BalancePoint
            return (
              <div className="chart-tooltip">
                <span className="chart-tooltip__date">{formatDate(point.date)}</span>
                <span className="chart-tooltip__value">
                  {formatAmount(point.balance, currency)}
                </span>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#balanceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
