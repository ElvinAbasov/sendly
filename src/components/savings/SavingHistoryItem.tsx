import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight } from 'lucide-react'
import type { Transaction } from '../../types'
import { getSavingTransactionLabel } from '../../constants/savings'
import { useI18n } from '../../i18n/I18nContext'
import { formatAmount, formatDate } from '../../utils/format'

interface SavingHistoryItemProps {
  transaction: Transaction
  savingId: string
  currency: string
  savingNames: Record<string, string>
  balanceAfter?: number
}

export function SavingHistoryItem({
  transaction,
  savingId,
  currency,
  savingNames,
  balanceAfter,
}: SavingHistoryItemProps) {
  const { t } = useI18n()
  const isDeposit =
    transaction.type === 'saving_deposit' && transaction.savingId === savingId
  const isWithdraw =
    transaction.type === 'saving_withdraw' && transaction.savingId === savingId
  const isTransferOut =
    transaction.type === 'saving_transfer' && transaction.sourceSavingId === savingId
  const isTransferIn =
    transaction.type === 'saving_transfer' && transaction.destinationSavingId === savingId

  let label = getSavingTransactionLabel(transaction.type, t) ?? transaction.title
  let sign = '+'
  let variant: 'income' | 'expense' | 'neutral' = 'income'

  if (isDeposit || isTransferIn) {
    sign = '+'
    variant = 'income'
    if (isTransferIn && transaction.sourceSavingId) {
      label = t('savings.historyItem.fromSaving', {
        name: savingNames[transaction.sourceSavingId] ?? t('savings.historyItem.fallbackSaving'),
      })
    }
  } else if (isWithdraw || isTransferOut) {
    sign = '−'
    variant = 'expense'
    if (isTransferOut && transaction.destinationSavingId) {
      label = t('savings.historyItem.toSaving', {
        name: savingNames[transaction.destinationSavingId] ?? t('savings.historyItem.fallbackSavingAcc'),
      })
    }
  }

  const Icon =
    transaction.type === 'saving_transfer'
      ? ArrowRightLeft
      : isDeposit || isTransferIn
        ? ArrowDownLeft
        : ArrowUpRight

  return (
    <div className="saving-history-item">
      <div className={`saving-history-item__icon saving-history-item__icon--${variant}`}>
        <Icon size={16} />
      </div>
      <div className="saving-history-item__info">
        <span className="saving-history-item__title">{label}</span>
        <span className="saving-history-item__date">{formatDate(transaction.date)}</span>
      </div>
      <div className="saving-history-item__amounts">
        <span className={`saving-history-item__amount saving-history-item__amount--${variant}`}>
          {sign}{formatAmount(transaction.amount, currency)}
        </span>
        {balanceAfter != null && (
          <span className="saving-history-item__balance">
            {formatAmount(balanceAfter, currency)}
          </span>
        )}
      </div>
    </div>
  )
}
