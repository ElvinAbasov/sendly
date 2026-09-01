import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { Transaction } from '../../types'
import { CATEGORY_ICONS } from '../../constants/categories'
import { formatAmount } from '../../utils/format'

interface TransactionItemProps {
  transaction: Transaction
  currency: string
  onClick?: () => void
}

export function TransactionItem({ transaction, currency, onClick }: TransactionItemProps) {
  const isIncome = transaction.type === 'income'

  return (
    <button className="tx-item" onClick={onClick}>
      <div className={`tx-item__icon ${isIncome ? 'tx-item__icon--income' : 'tx-item__icon--expense'}`}>
        {isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </div>
      <div className="tx-item__info">
        <span className="tx-item__title">{transaction.title}</span>
        <span className="tx-item__meta">
          {CATEGORY_ICONS[transaction.category]} {transaction.category}
        </span>
      </div>
      <span className={`tx-item__amount ${isIncome ? 'tx-item__amount--income' : 'tx-item__amount--expense'}`}>
        {isIncome ? '+' : '-'}{formatAmount(transaction.amount, currency)}
      </span>
    </button>
  )
}
