import { useState, useEffect } from 'react'
import type { SavingGoal, SavingOperationType } from '../../types'
import { Modal } from '../ui/Modal'
import { AmountInput } from '../ui/AmountInput'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { formatAmount, parseAmount } from '../../utils/format'

interface SavingOperationModalProps {
  open: boolean
  onClose: () => void
  type: SavingOperationType
  goal: SavingGoal
  allGoals: SavingGoal[]
  currency: string
  availableBalance: number
  loading?: boolean
  onSubmit: (amount: number, destinationId?: string) => Promise<void>
}

const TITLES: Record<SavingOperationType, string> = {
  deposit: 'Пополнить накопление',
  withdraw: 'Забрать из накопления',
  transfer: 'Перевод между накоплениями',
}

export function SavingOperationModal({
  open,
  onClose,
  type,
  goal,
  allGoals,
  currency,
  availableBalance,
  loading,
  onSubmit,
}: SavingOperationModalProps) {
  const [amount, setAmount] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setAmount('')
      setDestinationId('')
      setError('')
    }
  }, [open, type, goal.id])

  const maxAmount =
    type === 'deposit'
      ? availableBalance
      : type === 'withdraw'
        ? goal.currentAmount
        : goal.currentAmount

  const quickAmounts =
    type === 'deposit'
      ? [50, 100, 200].filter((v) => v <= availableBalance)
      : [50, 100, 200].filter((v) => v <= goal.currentAmount)

  const handleSubmit = async () => {
    if (loading) return
    const parsed = parseAmount(amount)
    if (!amount || parsed <= 0) {
      setError('Введите сумму больше 0')
      return
    }
    if (type === 'deposit' && parsed > availableBalance) {
      setError('Недостаточно доступных средств')
      return
    }
    if ((type === 'withdraw' || type === 'transfer') && parsed > goal.currentAmount) {
      setError('Недостаточно средств в накоплении')
      return
    }
    if (type === 'transfer' && !destinationId) {
      setError('Выберите накопление для перевода')
      return
    }
    if (type === 'transfer' && destinationId === goal.id) {
      setError('Выберите другое накопление')
      return
    }

    setError('')
    try {
      await onSubmit(parsed, type === 'transfer' ? destinationId : undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить операцию')
    }
  }

  const otherGoals = allGoals.filter((g) => g.id !== goal.id)

  return (
    <Modal open={open} onClose={onClose} title={TITLES[type]}>
      <div className="saving-operation">
        <div className="saving-operation__goal">
          <span className="saving-operation__icon">{goal.icon}</span>
          <div>
            <p className="saving-operation__name">{goal.name}</p>
            <p className="saving-operation__balance">
              {formatAmount(goal.currentAmount, currency)}
            </p>
          </div>
        </div>

        {type === 'deposit' && (
          <p className="saving-operation__hint">
            Доступно: {formatAmount(availableBalance, currency)}
          </p>
        )}

        {type === 'transfer' && (
          <Select
            label="Куда перевести"
            value={destinationId}
            onChange={setDestinationId}
            sheetTitle="Куда перевести"
            placeholder="Выберите накопление"
            leadingIcon="💰"
            options={otherGoals.map((g) => ({
              value: g.id,
              label: g.name,
              emoji: g.icon,
            }))}
          />
        )}

        <AmountInput
          label="Сумма"
          value={amount}
          onChange={setAmount}
          currency={currency}
          error={error}
        />

        {quickAmounts.length > 0 && (
          <div className="quick-amounts">
            {quickAmounts.map((value) => (
              <button
                key={value}
                type="button"
                className="quick-amounts__btn"
                onClick={() => setAmount(String(value))}
              >
                {formatAmount(value, currency)}
              </button>
            ))}
            {type !== 'deposit' && goal.currentAmount > 0 && (
              <button
                type="button"
                className="quick-amounts__btn quick-amounts__btn--all"
                onClick={() => setAmount(String(goal.currentAmount))}
              >
                Всё
              </button>
            )}
          </div>
        )}

        <p className="saving-operation__limit">
          Максимум: {formatAmount(maxAmount, currency)}
        </p>

        <Button fullWidth size="lg" onClick={handleSubmit} loading={loading}>
          {type === 'deposit' ? 'Пополнить' : type === 'withdraw' ? 'Забрать' : 'Перевести'}
        </Button>
      </div>
    </Modal>
  )
}
