import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart2,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card } from '../components/ui/Card'
import { BalanceChart } from '../components/charts/BalanceChart'
import { CategoryChart } from '../components/charts/CategoryChart'
import { TransactionItem } from '../components/transactions/TransactionItem'
import { SavingCard } from '../components/savings/SavingCard'
import { AutoDepositPrompt } from '../components/savings/AutoDepositPrompt'
import { Button } from '../components/ui/Button'
import { DashboardSkeleton } from '../components/ui/Skeleton'
import { useI18n } from '../i18n/I18nContext'
import { getErrorMessage } from '../utils/errorMessage'
import { formatAmount, formatPercent, formatCompactDate, toInputDate } from '../utils/format'

function useTodayCompactDate() {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setToday(new Date())
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return today
}

export function Dashboard() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const {
    loading,
    user,
    activePeriod,
    stats,
    transactions,
    savingGoals,
    balanceHistory,
    expenseCategories,
    pendingAutoDeposits,
    operationInProgress,
    confirmAutoDeposit,
    skipAutoDeposit,
  } = useApp()

  const [autoDepositError, setAutoDepositError] = useState('')
  const today = useTodayCompactDate()

  if (loading) return <DashboardSkeleton />

  if (!user || !activePeriod || !stats) {
    return null
  }

  const recentTx = transactions.slice(0, 5)
  const topSavings = savingGoals.slice(0, 3)
  const isPositive = stats.changePercent >= 0

  return (
    <div className="page dashboard">
      {pendingAutoDeposits.slice(0, 1).map((goal) => (
        <AutoDepositPrompt
          key={goal.id}
          goal={goal}
          currency={user.currency}
          loading={operationInProgress}
          error={autoDepositError}
          onConfirm={async () => {
            try {
              setAutoDepositError('')
              await confirmAutoDeposit(goal.id)
            } catch (err) {
              setAutoDepositError(getErrorMessage(err, t, 'dashboard.autoDepositFailed'))
            }
          }}
          onSkip={() => skipAutoDeposit(goal.id)}
        />
      ))}

      <Card className="capital-hero" padding="lg">
        <div className="capital-hero__main">
          <div className="capital-hero__top">
            <p className="capital-hero__label">💰 {t('dashboard.totalCapital')}</p>
            <button
              type="button"
              className="capital-hero__date"
              onClick={() => navigate('/add')}
              aria-label={t('common.addTodayAria', { date: formatCompactDate(today) })}
            >
              <time dateTime={toInputDate(today)}>{formatCompactDate(today)}</time>
            </button>
          </div>
          <h2 className="capital-hero__amount">
            {formatAmount(stats.totalCapital, user.currency)}
          </h2>
          <div
            className={`capital-hero__change ${isPositive ? 'capital-hero__change--up' : 'capital-hero__change--down'}`}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{formatPercent(stats.changePercent)}</span>
          </div>
        </div>
        <div className="capital-hero__split">
          <div className="capital-hero__item">
            <CreditCard size={16} />
            <span className="capital-hero__item-label">{t('dashboard.available')}</span>
            <span className="capital-hero__item-value">
              {formatAmount(stats.availableBalance, user.currency)}
            </span>
          </div>
          <div className="capital-hero__divider" />
          <div className="capital-hero__item">
            <Wallet size={16} />
            <span className="capital-hero__item-label">{t('dashboard.saved')}</span>
            <span className="capital-hero__item-value">
              {formatAmount(stats.totalInSavings, user.currency)}
            </span>
          </div>
        </div>
      </Card>

      <div className="stats-grid">
        <Card padding="sm" className="stat-card">
          <Wallet size={18} className="stat-card__icon stat-card__icon--neutral" />
          <span className="stat-card__label">{t('dashboard.initial')}</span>
          <span className="stat-card__value">
            {formatAmount(stats.initialCapital, user.currency)}
          </span>
        </Card>
        <Card padding="sm" className="stat-card">
          <TrendingUp size={18} className="stat-card__icon stat-card__icon--income" />
          <span className="stat-card__label">📈 {t('dashboard.income')}</span>
          <span className="stat-card__value stat-card__value--income">
            +{formatAmount(stats.totalIncome, user.currency)}
          </span>
        </Card>
        <Card padding="sm" className="stat-card">
          <TrendingDown size={18} className="stat-card__icon stat-card__icon--expense" />
          <span className="stat-card__label">📉 {t('dashboard.expenses')}</span>
          <span className="stat-card__value stat-card__value--expense">
            −{formatAmount(stats.totalExpenses, user.currency)}
          </span>
        </Card>
        <Card padding="sm" className="stat-card">
          <BarChart2 size={18} className="stat-card__icon stat-card__icon--neutral" />
          <span className="stat-card__label">{t('dashboard.profit')}</span>
          <span
            className={`stat-card__value ${stats.profit >= 0 ? 'stat-card__value--income' : 'stat-card__value--expense'}`}
          >
            {formatAmount(stats.profit, user.currency)}
          </span>
        </Card>
      </div>

      <Card padding="sm">
        <button
          type="button"
          className="settings-row dashboard-stats-link"
          onClick={() => navigate('/stats')}
        >
          <BarChart2 size={18} />
          <span>{t('nav.stats')}</span>
          <ChevronRight size={18} />
        </button>
      </Card>

      {topSavings.length > 0 && (
        <section>
          <div className="section-header">
            <h3 className="section-title">{t('dashboard.savingsSection')}</h3>
            <button className="section-link" onClick={() => navigate('/savings')}>
              {t('common.all')}
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard-savings">
            {topSavings.map((goal) => (
              <SavingCard
                key={goal.id}
                goal={goal}
                currency={user.currency}
                compact
                onClick={() => navigate(`/savings/${goal.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      <Card>
        <h3 className="section-title">{t('dashboard.balanceDynamics')}</h3>
        <BalanceChart data={balanceHistory} currency={user.currency} />
      </Card>

      <Card>
        <h3 className="section-title">{t('dashboard.expensesByCategory')}</h3>
        <CategoryChart data={expenseCategories} currency={user.currency} />
      </Card>

      <section>
        <div className="section-header">
          <h3 className="section-title">{t('dashboard.recentTransactions')}</h3>
          {transactions.length > 5 && (
            <button className="section-link" onClick={() => navigate('/history')}>
              {t('common.all')}
            </button>
          )}
        </div>
        {recentTx.length === 0 ? (
          <Card>
            <p className="empty-text">{t('empty.noTransactions')}</p>
          </Card>
        ) : (
          <Card padding="sm" className="tx-list-card">
            {recentTx.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                currency={user.currency}
                savingNames={Object.fromEntries(savingGoals.map((g) => [g.id, g.name]))}
                onClick={() => navigate(`/history?edit=${tx.id}`)}
              />
            ))}
          </Card>
        )}
      </section>

      <Button
        fullWidth
        size="lg"
        onClick={() => navigate('/add')}
        className="dashboard-add-btn"
      >
        <Plus size={22} />
        {t('dashboard.addButton')}
      </Button>
    </div>
  )
}
