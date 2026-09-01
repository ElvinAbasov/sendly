import type { SavingGoal, Transaction, TransactionType } from '../types'

export const SAVING_TRANSACTION_TYPES: TransactionType[] = [
  'saving_deposit',
  'saving_withdraw',
  'saving_transfer',
]

export function isSavingTransaction(type: TransactionType): boolean {
  return SAVING_TRANSACTION_TYPES.includes(type)
}

export function isIncomeOrExpense(type: TransactionType): type is 'income' | 'expense' {
  return type === 'income' || type === 'expense'
}

export function getSavingProgress(goal: SavingGoal): number {
  if (!goal.targetAmount || goal.targetAmount <= 0) return 0
  return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
}

export function getRemainingAmount(goal: SavingGoal): number | null {
  if (!goal.targetAmount || goal.targetAmount <= 0) return null
  return Math.max(0, goal.targetAmount - goal.currentAmount)
}

export function calculateLockedSavingsFromTransactions(
  transactions: Transaction[],
  upToDate?: string | null,
): number {
  const cutoff = upToDate ? new Date(upToDate).getTime() : null
  let locked = 0

  for (const tx of transactions) {
    if (cutoff != null && new Date(tx.date).getTime() > cutoff) continue
    if (tx.type === 'saving_deposit') locked += tx.amount
    else if (tx.type === 'saving_withdraw') locked -= tx.amount
  }

  return Math.max(0, locked)
}

export function recalculateSavingAmounts(
  goals: SavingGoal[],
  transactions: Transaction[],
): SavingGoal[] {
  const amounts = new Map<string, number>(goals.map((g) => [g.id, 0]))

  const sorted = [...transactions]
    .filter((t) => isSavingTransaction(t.type))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  for (const tx of sorted) {
    if (tx.type === 'saving_deposit' && tx.savingId) {
      amounts.set(tx.savingId, (amounts.get(tx.savingId) ?? 0) + tx.amount)
    } else if (tx.type === 'saving_withdraw' && tx.savingId) {
      amounts.set(tx.savingId, (amounts.get(tx.savingId) ?? 0) - tx.amount)
    } else if (tx.type === 'saving_transfer') {
      if (tx.sourceSavingId) {
        amounts.set(
          tx.sourceSavingId,
          (amounts.get(tx.sourceSavingId) ?? 0) - tx.amount,
        )
      }
      if (tx.destinationSavingId) {
        amounts.set(
          tx.destinationSavingId,
          (amounts.get(tx.destinationSavingId) ?? 0) + tx.amount,
        )
      }
    }
  }

  const now = new Date().toISOString()
  return goals.map((goal) => {
    const currentAmount = Math.max(0, amounts.get(goal.id) ?? 0)
    const hasTarget = goal.targetAmount != null && goal.targetAmount > 0
    const reached = hasTarget && currentAmount >= (goal.targetAmount as number)

    return {
      ...goal,
      currentAmount,
      isCompleted: reached,
      completedAt: reached ? goal.completedAt ?? now : null,
    }
  })
}

export function getSavingTransactions(
  savingId: string,
  transactions: Transaction[],
): Transaction[] {
  return transactions
    .filter(
      (t) =>
        t.savingId === savingId ||
        t.sourceSavingId === savingId ||
        t.destinationSavingId === savingId,
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function computeBalanceAfterHistory(
  savingId: string,
  transactions: Transaction[],
): Map<string, number> {
  const sorted = [...transactions]
    .filter(
      (t) =>
        t.savingId === savingId ||
        t.sourceSavingId === savingId ||
        t.destinationSavingId === savingId,
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const balanceMap = new Map<string, number>()
  let balance = 0

  for (const tx of sorted) {
    if (tx.type === 'saving_deposit' && tx.savingId === savingId) {
      balance += tx.amount
    } else if (tx.type === 'saving_withdraw' && tx.savingId === savingId) {
      balance -= tx.amount
    } else if (tx.type === 'saving_transfer') {
      if (tx.sourceSavingId === savingId) balance -= tx.amount
      if (tx.destinationSavingId === savingId) balance += tx.amount
    }
    balanceMap.set(tx.id, balance)
  }

  return balanceMap
}

export function getCurrentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function shouldShowAutoDepositPrompt(goal: SavingGoal, today = new Date()): boolean {
  if (!goal.autoDepositAmount || goal.autoDepositAmount <= 0) return false
  if (!goal.autoDepositDay) return false

  const day = today.getDate()
  if (day < goal.autoDepositDay) return false

  const monthKey = getCurrentMonthKey(today)
  return goal.lastAutoDepositPromptMonth !== monthKey
}

export type SavingSortOption = 'name' | 'amount' | 'progress' | 'date'

export function sortSavingGoals(
  goals: SavingGoal[],
  sortBy: SavingSortOption,
): SavingGoal[] {
  const sorted = [...goals]
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    case 'amount':
      return sorted.sort((a, b) => b.currentAmount - a.currentAmount)
    case 'progress':
      return sorted.sort((a, b) => getSavingProgress(b) - getSavingProgress(a))
    case 'date':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    default:
      return sorted
  }
}
