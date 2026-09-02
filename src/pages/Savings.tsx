import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { SavingCard } from '../components/savings/SavingCard'
import { SavingFormModal } from '../components/savings/SavingFormModal'
import { AutoDepositPrompt } from '../components/savings/AutoDepositPrompt'
import { useI18n } from '../i18n/I18nContext'
import { getErrorMessage } from '../utils/errorMessage'
import { formatAmount, formatPercent } from '../utils/format'
import { sortSavingGoals, type SavingSortOption } from '../utils/savings'

export function Savings() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const {
    user,
    stats,
    savingGoals,
    savingsStats,
    pendingAutoDeposits,
    operationInProgress,
    createSavingGoal,
    confirmAutoDeposit,
    skipAutoDeposit,
  } = useApp()

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SavingSortOption>('date')
  const [showCreate, setShowCreate] = useState(false)
  const [autoDepositErrors, setAutoDepositErrors] = useState<Record<string, string>>({})

  const filteredGoals = useMemo(() => {
    let goals = [...savingGoals]
    if (search.trim()) {
      const q = search.toLowerCase()
      goals = goals.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q),
      )
    }
    return sortSavingGoals(goals, sortBy)
  }, [savingGoals, search, sortBy])

  if (!user || !stats) return null

  const handleCreate = async (data: Parameters<typeof createSavingGoal>[0]) => {
    await createSavingGoal(data)
  }

  return (
    <div className="page savings-page">
      <header className="page__header page__header--row">
        <div>
          <h1 className="page__title">{t('savings.list.title')}</h1>
          <p className="page__subtitle">{t('savings.list.subtitle')}</p>
        </div>
        <button
          className="savings-page__add-btn"
          onClick={() => setShowCreate(true)}
          aria-label={t('savings.list.createAria')}
        >
          <Plus size={22} />
        </button>
      </header>

      {pendingAutoDeposits.map((goal) => (
        <AutoDepositPrompt
          key={goal.id}
          goal={goal}
          currency={user.currency}
          loading={operationInProgress}
          error={autoDepositErrors[goal.id]}
          onConfirm={async () => {
            try {
              setAutoDepositErrors((prev) => ({ ...prev, [goal.id]: '' }))
              await confirmAutoDeposit(goal.id)
            } catch (err) {
              setAutoDepositErrors((prev) => ({
                ...prev,
                [goal.id]: getErrorMessage(err, t, 'dashboard.autoDepositFailed'),
              }))
            }
          }}
          onSkip={() => skipAutoDeposit(goal.id)}
        />
      ))}

      <Card className="savings-summary" padding="lg">
        <div className="savings-summary__hero">
          <Wallet size={28} className="savings-summary__icon" />
          <div>
            <p className="savings-summary__label">{t('savings.list.totalSaved')}</p>
            <h2 className="savings-summary__amount">
              {formatAmount(stats.totalInSavings, user.currency)}
            </h2>
          </div>
        </div>
        <div className="savings-summary__grid">
          <div className="savings-summary__stat">
            <span className="savings-summary__stat-value">
              {savingsStats?.goalsWithTarget ?? 0}
            </span>
            <span className="savings-summary__stat-label">{t('savings.list.goals')}</span>
          </div>
          <div className="savings-summary__stat">
            <span className="savings-summary__stat-value">
              {formatPercent(savingsStats?.overallProgress ?? 0)}
            </span>
            <span className="savings-summary__stat-label">{t('savings.list.progress')}</span>
          </div>
          <div className="savings-summary__stat">
            <span className="savings-summary__stat-value">
              {savingsStats?.completedGoals ?? 0}
            </span>
            <span className="savings-summary__stat-label">{t('savings.list.achieved')}</span>
          </div>
        </div>
        {(savingsStats?.overallProgress ?? 0) > 0 && (
          <div className="savings-summary__progress">
            <div
              className="savings-summary__progress-fill"
              style={{ width: `${savingsStats?.overallProgress ?? 0}%` }}
            />
          </div>
        )}
      </Card>

      {savingGoals.length > 0 && (
        <>
          <div className="search-bar">
            <Search size={18} className="search-bar__icon" />
            <input
              className="search-bar__input"
              placeholder={t('savings.list.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            label={t('common.sort')}
            value={sortBy}
            onChange={(value) => setSortBy(value as SavingSortOption)}
            sheetTitle={t('common.sort')}
            leadingIcon="↕️"
            options={[
              { value: 'date', label: t('savings.list.sortByDate'), emoji: '📅' },
              { value: 'name', label: t('savings.list.sortByName'), emoji: '🔤' },
              { value: 'amount', label: t('savings.list.sortByAmount'), emoji: '💰' },
              { value: 'progress', label: t('savings.list.sortByProgress'), emoji: '📈' },
            ]}
          />
        </>
      )}

      {filteredGoals.length === 0 ? (
        <Card className="savings-empty">
          <Wallet size={32} className="savings-empty__icon" />
          <h3 className="savings-empty__title">
            {savingGoals.length === 0
              ? t('savings.list.createFirstTitle')
              : t('savings.list.notFoundTitle')}
          </h3>
          <p className="savings-empty__text">
            {savingGoals.length === 0
              ? t('savings.list.createFirstHint')
              : t('savings.list.notFoundHint')}
          </p>
          {savingGoals.length === 0 && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={18} />
              {t('savings.list.createButton')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="savings-list">
          {filteredGoals.map((goal) => (
            <SavingCard
              key={goal.id}
              goal={goal}
              currency={user.currency}
              onClick={() => navigate(`/savings/${goal.id}`)}
              onDeposit={() => navigate(`/savings/${goal.id}?action=deposit`)}
              onWithdraw={() => navigate(`/savings/${goal.id}?action=withdraw`)}
            />
          ))}
        </div>
      )}

      <SavingFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        currency={user.currency}
      />
    </div>
  )
}
