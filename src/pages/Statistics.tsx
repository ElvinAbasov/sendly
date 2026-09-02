import { TrendingUp, TrendingDown, PiggyBank, BarChart2, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Card } from '../components/ui/Card'
import { BalanceChart } from '../components/charts/BalanceChart'
import { CategoryChart } from '../components/charts/CategoryChart'
import { useI18n } from '../i18n/I18nContext'
import { formatAmount, formatPercent } from '../utils/format'

function ComparisonBadge({
  value,
  hasPrevious,
}: {
  value: number
  hasPrevious: boolean
}) {
  if (!hasPrevious) return null
  const isUp = value >= 0
  return (
    <span className={`comparison-badge ${isUp ? 'comparison-badge--up' : 'comparison-badge--down'}`}>
      {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {formatPercent(value)}
    </span>
  )
}

export function Statistics() {
  const { t } = useI18n()
  const navigate = useNavigate()
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
          <h1 className="page__title">{t('statistics.title')}</h1>
        </header>
        <Card>
          <p className="empty-text">{t('statistics.noData')}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="page stats-page">
      <header className="page__header page__header--row">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate('/')}
          aria-label={t('common.back')}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="stats-page__titles">
          <h1 className="page__title">{t('statistics.title')}</h1>
          <p className="page__subtitle">{activePeriod.name}</p>
        </div>
      </header>

      <div className="stats-overview">
        <Card className="stats-overview__card">
          <div className="stats-overview__header">
            <TrendingUp size={20} className="stats-overview__icon stats-overview__icon--income" />
            <span>{t('statistics.income')}</span>
            <ComparisonBadge value={comparison?.incomeChange ?? 0} hasPrevious={!!previousStats} />
          </div>
          <span className="stats-overview__value stats-overview__value--income">
            {formatAmount(stats.totalIncome, user.currency)}
          </span>
        </Card>

        <Card className="stats-overview__card">
          <div className="stats-overview__header">
            <TrendingDown size={20} className="stats-overview__icon stats-overview__icon--expense" />
            <span>{t('statistics.expenses')}</span>
            <ComparisonBadge value={comparison?.expenseChange ?? 0} hasPrevious={!!previousStats} />
          </div>
          <span className="stats-overview__value stats-overview__value--expense">
            {formatAmount(stats.totalExpenses, user.currency)}
          </span>
        </Card>

        <Card className="stats-overview__card">
          <div className="stats-overview__header">
            <PiggyBank size={20} className="stats-overview__icon" />
            <span>{t('statistics.profit')}</span>
            <ComparisonBadge value={comparison?.profitChange ?? 0} hasPrevious={!!previousStats} />
          </div>
          <span className={`stats-overview__value ${stats.profit >= 0 ? 'stats-overview__value--income' : 'stats-overview__value--expense'}`}>
            {formatAmount(stats.profit, user.currency)}
          </span>
        </Card>
      </div>

      <div className="stats-grid stats-grid--2col">
        <Card padding="sm" className="stat-card">
          <BarChart2 size={18} className="stat-card__icon stat-card__icon--neutral" />
          <span className="stat-card__label">{t('statistics.averageExpense')}</span>
          <span className="stat-card__value">
            {formatAmount(stats.averageExpense, user.currency)}
          </span>
        </Card>
        <Card padding="sm" className="stat-card">
          <TrendingDown size={18} className="stat-card__icon stat-card__icon--expense" />
          <span className="stat-card__label">{t('statistics.maxExpense')}</span>
          <span className="stat-card__value stat-card__value--expense">
            {formatAmount(stats.maxExpense, user.currency)}
          </span>
        </Card>
      </div>

      {previousStats && (
        <Card>
          <h3 className="section-title">{t('statistics.comparePrevious')}</h3>
          <div className="comparison-table">
            <div className="comparison-row">
              <span>{t('statistics.available')}</span>
              <span>{formatAmount(stats.availableBalance, user.currency)}</span>
              <span className="comparison-prev">{formatAmount(previousStats.availableBalance, user.currency)}</span>
            </div>
            <div className="comparison-row">
              <span>{t('statistics.totalCapital')}</span>
              <span>{formatAmount(stats.totalCapital, user.currency)}</span>
              <span className="comparison-prev">{formatAmount(previousStats.totalCapital, user.currency)}</span>
            </div>
            <div className="comparison-row">
              <span>{t('statistics.income')}</span>
              <span>{formatAmount(stats.totalIncome, user.currency)}</span>
              <span className="comparison-prev">{formatAmount(previousStats.totalIncome, user.currency)}</span>
            </div>
            <div className="comparison-row">
              <span>{t('statistics.expenses')}</span>
              <span>{formatAmount(stats.totalExpenses, user.currency)}</span>
              <span className="comparison-prev">{formatAmount(previousStats.totalExpenses, user.currency)}</span>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="section-title">{t('statistics.balanceDynamics')}</h3>
        <BalanceChart data={balanceHistory} currency={user.currency} />
      </Card>

      <Card>
        <h3 className="section-title">{t('statistics.expensesByCategory')}</h3>
        <CategoryChart data={expenseCategories} currency={user.currency} />
      </Card>

      {incomeCategories.length > 0 && (
        <Card>
          <h3 className="section-title">{t('statistics.incomeByCategory')}</h3>
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
