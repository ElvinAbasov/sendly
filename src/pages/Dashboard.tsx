import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card } from '../components/ui/Card'
import { BalanceChart } from '../components/charts/BalanceChart'
import { CategoryChart } from '../components/charts/CategoryChart'
import { TransactionItem } from '../components/transactions/TransactionItem'
import { Button } from '../components/ui/Button'
import { DashboardSkeleton } from '../components/ui/Skeleton'
import { formatAmount, formatPercent } from '../utils/format'

export function Dashboard() {
  const navigate = useNavigate()
  const {
    loading,
    user,
    activePeriod,
    stats,
    transactions,
    balanceHistory,
    expenseCategories,
  } = useApp()

  if (loading) return <DashboardSkeleton />

  if (!user || !activePeriod || !stats) {
    return null
  }

  const recentTx = transactions.slice(0, 5)
  const isPositive = stats.changePercent >= 0

  return (
    <div className="page dashboard">
      <header className="page__header">
        <div>
          <p className="page__greeting">Привет, {user.name}</p>
          <h1 className="page__title">{activePeriod.name}</h1>
        </div>
      </header>

      <Card className="balance-hero" padding="lg">
        <p className="balance-hero__label">Текущий баланс</p>
        <h2 className="balance-hero__amount">{formatAmount(stats.balance, user.currency)}</h2>
        <div className={`balance-hero__change ${isPositive ? 'balance-hero__change--up' : 'balance-hero__change--down'}`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{formatPercent(stats.changePercent)}</span>
        </div>
      </Card>

      <div className="stats-grid">
        <Card padding="sm" className="stat-card">
          <Wallet size={18} className="stat-card__icon stat-card__icon--neutral" />
          <span className="stat-card__label">Стартовый</span>
          <span className="stat-card__value">{formatAmount(stats.initialCapital, user.currency)}</span>
        </Card>
        <Card padding="sm" className="stat-card">
          <TrendingUp size={18} className="stat-card__icon stat-card__icon--income" />
          <span className="stat-card__label">Доходы</span>
          <span className="stat-card__value stat-card__value--income">
            {formatAmount(stats.totalIncome, user.currency)}
          </span>
        </Card>
        <Card padding="sm" className="stat-card">
          <TrendingDown size={18} className="stat-card__icon stat-card__icon--expense" />
          <span className="stat-card__label">Расходы</span>
          <span className="stat-card__value stat-card__value--expense">
            {formatAmount(stats.totalExpenses, user.currency)}
          </span>
        </Card>
        <Card padding="sm" className="stat-card">
          <PiggyBank size={18} className="stat-card__icon stat-card__icon--neutral" />
          <span className="stat-card__label">Прибыль</span>
          <span className={`stat-card__value ${stats.profit >= 0 ? 'stat-card__value--income' : 'stat-card__value--expense'}`}>
            {formatAmount(stats.profit, user.currency)}
          </span>
        </Card>
      </div>

      <Card>
        <h3 className="section-title">Динамика баланса</h3>
        <BalanceChart data={balanceHistory} currency={user.currency} />
      </Card>

      <Card>
        <h3 className="section-title">Расходы по категориям</h3>
        <CategoryChart data={expenseCategories} currency={user.currency} />
      </Card>

      <section>
        <div className="section-header">
          <h3 className="section-title">Последние операции</h3>
          {transactions.length > 5 && (
            <button className="section-link" onClick={() => navigate('/history')}>
              Все
            </button>
          )}
        </div>
        {recentTx.length === 0 ? (
          <Card>
            <p className="empty-text">Пока нет операций. Нажмите + чтобы добавить.</p>
          </Card>
        ) : (
          <Card padding="sm" className="tx-list-card">
            {recentTx.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                currency={user.currency}
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
        Добавить
      </Button>
    </div>
  )
}
