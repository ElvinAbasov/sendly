import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Wallet } from 'lucide-react'
import type { Transaction } from '../../types'
import { CATEGORY_ICONS } from '../../constants/categories'
import { SAVING_TRANSACTION_LABELS } from '../../constants/savings'
import { isSavingTransaction } from '../../utils/savings'
import { formatAmount } from '../../utils/format'

interface TransactionItemProps {
  transaction: Transaction
  currency: string
  savingNames?: Record<string, string>
  onClick?: () => void
}

export function TransactionItem({
  transaction,
  currency,
  savingNames = {},
  onClick,
}: TransactionItemProps) {
  const isIncome = transaction.type === 'income'
  const isSaving = isSavingTransaction(transaction.type)

  let icon = isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />
  let iconClass = isIncome ? 'tx-item__icon--income' : 'tx-item__icon--expense'
  let amountClass = isIncome ? 'tx-item__amount--income' : 'tx-item__amount--expense'
  let prefix = isIncome ? '+' : '−'
  let meta = `${CATEGORY_ICONS[transaction.category] ?? ''} ${transaction.category}`.trim()

  if (isSaving) {
    icon = transaction.type === 'saving_transfer' ? (
      <ArrowRightLeft size={18} />
    ) : transaction.type === 'saving_deposit' ? (
      <Wallet size={18} />
    ) : (
      <Wallet size={18} />
    )
    iconClass = 'tx-item__icon--saving'
    amountClass = 'tx-item__amount--saving'
    prefix =
      transaction.type === 'saving_deposit'
        ? '→'
        : transaction.type === 'saving_withdraw'
          ? '←'
          : '↔'
    meta = SAVING_TRANSACTION_LABELS[transaction.type]

    if (transaction.type === 'saving_transfer') {
      const from = transaction.sourceSavingId
        ? savingNames[transaction.sourceSavingId]
        : null
      const to = transaction.destinationSavingId
        ? savingNames[transaction.destinationSavingId]
        : null
      if (from && to) meta = `${from} → ${to}`
    }
  }

  return (
    <button className="tx-item" onClick={onClick}>
      <div className={`tx-item__icon ${iconClass}`}>{icon}</div>
      <div className="tx-item__info">
        <span className="tx-item__title">{transaction.title}</span>
        <span className="tx-item__meta">{meta}</span>
      </div>
      <span className={`tx-item__amount ${amountClass}`}>
        {prefix}{formatAmount(transaction.amount, currency)}
      </span>
    </button>
  )
}
