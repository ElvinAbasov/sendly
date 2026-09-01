import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, ArrowRightLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { SavingCard } from '../components/savings/SavingCard'
import { SavingFormModal } from '../components/savings/SavingFormModal'
import { SavingOperationModal } from '../components/savings/SavingOperationModal'
import { SavingHistoryItem } from '../components/savings/SavingHistoryItem'
import { GoalSuccessAnimation } from '../components/savings/GoalSuccessAnimation'
import {
  computeBalanceAfterHistory,
  getSavingProgress,
  getSavingTransactions,
} from '../utils/savings'
import { formatAmount } from '../utils/format'
import type { SavingOperationType } from '../types'

export function SavingDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const {
    user,
    stats,
    savingGoals,
    allTransactions,
    operationInProgress,
    updateSavingGoal,
    depositToSaving,
    withdrawFromSaving,
    transferBetweenSavings,
    deleteSaving,
  } = useApp()

  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [operationType, setOperationType] = useState<SavingOperationType | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [operationError, setOperationError] = useState('')

  const goal = savingGoals.find((g) => g.id === id)

  const savingNames = useMemo(
    () => Object.fromEntries(savingGoals.map((g) => [g.id, g.name])),
    [savingGoals],
  )

  const history = useMemo(() => {
    if (!id) return []
    return getSavingTransactions(id, allTransactions)
  }, [id, allTransactions])

  const balanceMap = useMemo(() => {
    if (!id) return new Map<string, number>()
    return computeBalanceAfterHistory(id, allTransactions)
  }, [id, allTransactions])

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'deposit' || action === 'withdraw' || action === 'transfer') {
      setOperationType(action)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (goal?.isCompleted && getSavingProgress(goal) >= 100) {
      const key = `success-shown-${goal.id}`
      if (!sessionStorage.getItem(key)) {
        setShowSuccess(true)
        sessionStorage.setItem(key, '1')
      }
    }
  }, [goal?.id, goal?.isCompleted])

  if (!user || !stats || !goal) {
    return (
      <div className="page">
        <header className="page__header page__header--row">
          <button className="back-btn" onClick={() => navigate('/savings')}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="page__title">Накопление</h1>
        </header>
        <Card>
          <p className="empty-text">Накопление не найдено</p>
        </Card>
      </div>
    )
  }

  const handleOperation = async (amount: number, destinationId?: string) => {
    setOperationError('')
    const wasCompleted = goal.isCompleted
    let updated = goal

    try {
      if (operationType === 'deposit') {
        updated = await depositToSaving(goal.id, amount)
      } else if (operationType === 'withdraw') {
        updated = await withdrawFromSaving(goal.id, amount)
      } else if (operationType === 'transfer' && destinationId) {
        await transferBetweenSavings(goal.id, destinationId, amount)
        setOperationType(null)
        return
      }

      setOperationType(null)

      if (
        !wasCompleted &&
        updated.isCompleted &&
        updated.targetAmount &&
        updated.currentAmount >= updated.targetAmount
      ) {
        setShowSuccess(true)
      }
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Не удалось выполнить операцию')
      throw err
    }
  }

  const handleDelete = async (returnFunds: boolean) => {
    setDeleteError('')
    try {
      await deleteSaving(goal.id, returnFunds)
      navigate('/savings')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Ошибка удаления')
    }
  }

  const handleEdit = async (data: Parameters<typeof updateSavingGoal>[1]) => {
    await updateSavingGoal(goal.id, data)
  }

  return (
    <div className="page saving-detail-page">
      {showSuccess && (
        <GoalSuccessAnimation
          goalName={goal.name}
          onComplete={() => setShowSuccess(false)}
        />
      )}

      <header className="page__header page__header--row">
        <button className="back-btn" onClick={() => navigate('/savings')}>
          <ArrowLeft size={20} />
        </button>
        <div className="saving-detail__header-actions">
          <button className="back-btn" onClick={() => setShowEdit(true)} aria-label="Редактировать">
            <Pencil size={18} />
          </button>
          <button className="back-btn" onClick={() => setShowDelete(true)} aria-label="Удалить">
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <SavingCard goal={goal} currency={user.currency} />

      <div className="saving-detail__actions">
        <Button fullWidth size="lg" onClick={() => setOperationType('deposit')}>
          Пополнить
        </Button>
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={() => setOperationType('withdraw')}
          disabled={goal.currentAmount <= 0}
        >
          Забрать
        </Button>
      </div>

      {savingGoals.length > 1 && (
        <Button
          fullWidth
          variant="ghost"
          onClick={() => setOperationType('transfer')}
          disabled={goal.currentAmount <= 0}
        >
          <ArrowRightLeft size={18} />
          Перевести в другое накопление
        </Button>
      )}

      <section>
        <h3 className="section-title">История</h3>
        {history.length === 0 ? (
          <Card>
            <p className="empty-text">Пока нет операций</p>
          </Card>
        ) : (
          <Card padding="sm" className="saving-history-list">
            {history.map((tx) => (
              <SavingHistoryItem
                key={tx.id}
                transaction={tx}
                savingId={goal.id}
                currency={user.currency}
                savingNames={savingNames}
                balanceAfter={balanceMap.get(tx.id) ?? tx.balanceAfter}
              />
            ))}
          </Card>
        )}
      </section>

      <SavingFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={handleEdit}
        initial={goal}
        currency={user.currency}
      />

      <SavingOperationModal
        open={!!operationType}
        onClose={() => {
          setOperationType(null)
          setOperationError('')
        }}
        type={operationType ?? 'deposit'}
        goal={goal}
        allGoals={savingGoals}
        currency={user.currency}
        availableBalance={stats.availableBalance}
        loading={operationInProgress}
        onSubmit={handleOperation}
      />
      {operationError && (
        <p className="input-group__error saving-detail__error">{operationError}</p>
      )}

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Удалить накопление?">
        {goal.currentAmount > 0 ? (
          <>
            <p className="modal-text">
              В накоплении {formatAmount(goal.currentAmount, user.currency)}.
              Сначала верните деньги в доступный баланс.
            </p>
            {deleteError && <p className="input-error">{deleteError}</p>}
            <div className="modal-actions modal-actions--stack">
              <Button
                fullWidth
                onClick={() => handleDelete(true)}
                loading={operationInProgress}
              >
                Вернуть {formatAmount(goal.currentAmount, user.currency)} и удалить
              </Button>
              <Button fullWidth variant="secondary" onClick={() => setShowDelete(false)}>
                Отмена
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="modal-text">
              Вы уверены, что хотите удалить «{goal.name}»? Это действие нельзя отменить.
            </p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setShowDelete(false)}>
                Отмена
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(false)}
                loading={operationInProgress}
              >
                Удалить
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
