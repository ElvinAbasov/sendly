import { useState, useEffect } from 'react'
import type { SavingGoal, SavingOperationType } from '../../types'
import { Modal } from '../ui/Modal'
import { AmountInput } from '../ui/AmountInput'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/errorMessage'
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
  const { t } = useI18n()
  const [amount, setAmount] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [error, setError] = useState('')

  const titles: Record<SavingOperationType, string> = {
    deposit: t('savings.operations.depositTitle'),
    withdraw: t('savings.operations.withdrawTitle'),
    transfer: t('savings.operations.transferTitle'),
  }

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
      setError(t('validation.amountRequired'))
      return
    }
    if (type === 'deposit' && parsed > availableBalance) {
      setError(t('validation.insufficientFunds'))
      return
    }
    if ((type === 'withdraw' || type === 'transfer') && parsed > goal.currentAmount) {
      setError(t('validation.insufficientSavingFunds'))
      return
    }
    if (type === 'transfer' && !destinationId) {
      setError(t('validation.selectTransferTarget'))
      return
    }
    if (type === 'transfer' && destinationId === goal.id) {
      setError(t('validation.selectOtherSaving'))
      return
    }

    setError('')
    try {
      await onSubmit(parsed, type === 'transfer' ? destinationId : undefined)
    } catch (err) {
      setError(getErrorMessage(err, t, 'savings.detail.operationFailed'))
    }
  }

  const otherGoals = allGoals.filter((g) => g.id !== goal.id)

  return (
    <Modal open={open} onClose={onClose} title={titles[type]}>
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
            {t('savings.operations.availableHint', {
              amount: formatAmount(availableBalance, currency),
            })}
          </p>
        )}

        {type === 'transfer' && (
          <Select
            label={t('savings.operations.transferToLabel')}
            value={destinationId}
            onChange={setDestinationId}
            sheetTitle={t('savings.operations.transferToLabel')}
            placeholder={t('savings.operations.transferToPlaceholder')}
            leadingIcon="💰"
            options={otherGoals.map((g) => ({
              value: g.id,
              label: g.name,
              emoji: g.icon,
            }))}
          />
        )}

        <AmountInput
          label={t('common.amount')}
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
                {t('common.everything')}
              </button>
            )}
          </div>
        )}

        <p className="saving-operation__limit">
          {t('savings.operations.maxHint', { amount: formatAmount(maxAmount, currency) })}
        </p>

        <Button fullWidth size="lg" onClick={handleSubmit} loading={loading}>
          {type === 'deposit'
            ? t('common.deposit')
            : type === 'withdraw'
              ? t('common.withdraw')
              : t('common.transfer')}
        </Button>
      </div>
    </Modal>
  )
}
