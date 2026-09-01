import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryStat } from '../../types'
import { formatAmount } from '../../utils/format'
import { CATEGORY_ICONS } from '../../constants/categories'

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#4f46e5', '#7c3aed', '#6d28d9',
]

interface CategoryChartProps {
  data: CategoryStat[]
  currency: string
}

export function CategoryChart({ data, currency }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="chart-empty">
        <p>Нет расходов по категориям</p>
      </div>
    )
  }

  return (
    <div className="category-chart">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const item = payload[0].payload as CategoryStat
              return (
                <div className="chart-tooltip">
                  <span>{CATEGORY_ICONS[item.category] ?? '📦'} {item.category}</span>
                  <span className="chart-tooltip__value">
                    {formatAmount(item.amount, currency)} ({item.percentage.toFixed(0)}%)
                  </span>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="category-chart__legend">
        {data.slice(0, 5).map((item, i) => (
          <div key={item.category} className="category-chart__legend-item">
            <span
              className="category-chart__dot"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="category-chart__legend-label">
              {CATEGORY_ICONS[item.category]} {item.category}
            </span>
            <span className="category-chart__legend-value">
              {item.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
