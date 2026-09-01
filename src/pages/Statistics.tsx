import { TrendingUp, TrendingDown, PiggyBank, BarChart2, ArrowUp, ArrowDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card } from '../components/ui/Card'
import { BalanceChart } from '../components/charts/BalanceChart'
import { CategoryChart } from '../components/charts/CategoryChart'
import { formatAmount, formatPercent } from '../utils/format'

export function Statistics() {
  const {
    user,
    activePeriod,
    stats,
    previousStats,
    comparison,
    balanceHistory,
    expenseCategories,
    incomeCategories,
  } = useApp()

  if (!user || !activePeriod || !stats) {
    return (
      <div className="page">
        <header className="page__header">
          <h1 className="page__title">Статистика</h1>
        </header>
        <Card>
          <p className="empty-text">Нет данных для отображения</p>
        </Card>
      </div>
    )
  }

  const ComparisonBadge = ({ value }: { value: number }) => {
    if (!previousStats) return null
    const isUp = value >= 0
    return (
      <span className={`comparison-badge ${isUp ? 'comparison-badge--up' : 'comparison-badge--down'}`}>
        {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        {formatPercent(value)}
      </span>
    )
  }

  return (
    <div className="page stats-page">
      <header className="page__header">
        <h1 className="page__title">Статистика</h1>
        <p className="page__subtitle">{activePeriod.name}</p>
      </header>

      <div className="stats-overview">
        <Card className="stats-overview__card">
          <div className="stats-overview__header">
            <TrendingUp size={20} className="stats-overview__icon stats-overview__icon--income" />
            <span>Доходы</span>
            <ComparisonBadge value={comparison?.incomeChange ?? 0} />
          </div>
          <span className="stats-overview__value stats-overview__value--income">
            {formatAmount(stats.totalIncome, user.currency)}
          </span>
        </Card>

        <Card className="stats-overview__card">
          <div className="stats-overview__header">
            <TrendingDown size={20} className="stats-overview__icon stats-overview__icon--expense" />
            <span>Расходы</span>
            <ComparisonBadge value={comparison?.expenseChange ?? 0} />
          </div>
          <span className="stats-overview__value stats-overview__value--expense">
            {formatAmount(stats.totalExpenses, user.currency)}
          </span>
        </Card>

        <Card className="stats-overview__card">
          <div className="stats-overview__header">
            <PiggyBank size={20} className="stats-overview__icon" />
            <span>Прибыль</span>
            <ComparisonBadge value={comparison?.profitChange ?? 0} />
          </div>
          <span className={`stats-overview__value ${stats.profit >= 0 ? 'stats-overview__value--income' : 'stats-overview__value--expense'}`}>
            {formatAmount(stats.profit, user.currency)}
          </span>
        </Card>
      </div>

      <div className="stats-grid stats-grid--2col">
        <Card padding="sm" className="stat-card">
          <BarChart2 size={18} className="stat-card__icon stat-card__icon--neutral" />
          <span className="stat-card__label">Средний расход</span>
          <span className="stat-card__value">
            {formatAmount(stats.averageExpense, user.currency)}
          </span>
        </Card>
        <Card padding="sm" className="stat-card">
          <TrendingDown size={18} className="stat-card__icon stat-card__icon--expense" />
          <span className="stat-card__label">Макс. расход</span>
          <span className="stat-card__value stat-card__value--expense">
            {formatAmount(stats.maxExpense, user.currency)}
          </span>
        </Card>
      </div>

      {previousStats && (
        <Card>
          <h3 className="section-title">Сравнение с прошлым периодом</h3>
          <div className="comparison-table">
            <div className="comparison-row">
              <span>Доступно</span>
              <span>{formatAmount(stats.availableBalance, user.currency)}</span>
              <span className="comparison-prev">{formatAmount(previousStats.availableBalance, user.currency)}</span>
            </div>
            <div className="comparison-row">
              <span>Общий капитал</span>
              <span>{formatAmount(stats.totalCapital, user.currency)}</span>
              <span className="comparison-prev">{formatAmount(previousStats.totalCapital, user.currency)}</span>
            </div>
            <div className="comparison-row">
              <span>Доходы</span>
              <span>{formatAmount(stats.totalIncome, user.currency)}</span>
              <span className="comparison-prev">{formatAmount(previousStats.totalIncome, user.currency)}</span>
            </div>
            <div className="comparison-row">
              <span>Расходы</span>
              <span>{formatAmount(stats.totalExpenses, user.currency)}</span>
              <span className="comparison-prev">{formatAmount(previousStats.totalExpenses, user.currency)}</span>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="section-title">Динамика баланса</h3>
        <BalanceChart data={balanceHistory} currency={user.currency} />
      </Card>

      <Card>
        <h3 className="section-title">Расходы по категориям</h3>
        <CategoryChart data={expenseCategories} currency={user.currency} />
      </Card>

      {incomeCategories.length > 0 && (
        <Card>
          <h3 className="section-title">Доходы по категориям</h3>
          <div className="income-categories">
            {incomeCategories.map((cat) => (
              <div key={cat.category} className="income-cat-row">
                <span>{cat.category}</span>
                <div className="income-cat-bar">
                  <div
                    className="income-cat-bar__fill"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
                <span className="income-cat-amount">
                  {formatAmount(cat.amount, user.currency)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
