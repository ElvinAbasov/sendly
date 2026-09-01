import type { BalancePoint, CategoryStat, Period, PeriodStats, SavingGoal, SavingsStats, Transaction } from '../types'
import { calculateLockedSavingsFromTransactions, isIncomeOrExpense } from './savings'

export function calculatePeriodStats(
  period: Period,
  transactions: Transaction[],
  _savingGoals: SavingGoal[] = [],
  _asOfDate?: string | null,
): PeriodStats {
  const cutoff = _asOfDate ?? period.endDate
  const periodTx = transactions.filter((t) => {
    if (t.periodId !== period.id) return false
    if (cutoff && new Date(t.date).getTime() > new Date(cutoff).getTime()) return false
    return true
  })

  const savingsTx = transactions.filter((t) => {
    if (!cutoff) return true
    return new Date(t.date).getTime() <= new Date(cutoff).getTime()
  })

  const totalIncome = periodTx
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = periodTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const profit = totalIncome - totalExpenses
  const totalCapital = period.initialCapital + totalIncome - totalExpenses
  const totalInSavings = calculateLockedSavingsFromTransactions(savingsTx, cutoff)
  const availableBalance = totalCapital - totalInSavings
  const changePercent =
    period.initialCapital > 0
      ? ((totalCapital - period.initialCapital) / period.initialCapital) * 100
      : 0

  const expenses = periodTx.filter((t) => t.type === 'expense')
  const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0
  const maxExpense = expenses.length > 0 ? Math.max(...expenses.map((t) => t.amount)) : 0

  return {
    balance: availableBalance,
    totalCapital,
    availableBalance,
    totalInSavings,
    initialCapital: period.initialCapital,
    totalIncome,
    totalExpenses,
    profit,
    changePercent,
    averageExpense,
    maxExpense,
    transactionCount: periodTx.filter((t) => isIncomeOrExpense(t.type)).length,
  }
}

export function calculateSavingsStats(savingGoals: SavingGoal[]): SavingsStats {
  const goalsWithTarget = savingGoals.filter((g) => g.targetAmount && g.targetAmount > 0)
  const totalTarget = goalsWithTarget.reduce((sum, g) => sum + (g.targetAmount ?? 0), 0)
  const totalSavedInGoals = goalsWithTarget.reduce((sum, g) => sum + g.currentAmount, 0)
  const overallProgress = totalTarget > 0 ? Math.min(100, (totalSavedInGoals / totalTarget) * 100) : 0

  return {
    totalSaved: savingGoals.reduce((sum, g) => sum + g.currentAmount, 0),
    goalsCount: savingGoals.length,
    goalsWithTarget: goalsWithTarget.length,
    overallProgress,
    completedGoals: savingGoals.filter((g) => g.isCompleted).length,
  }
}

export function calculateCategoryStats(
  transactions: Transaction[],
  type: 'income' | 'expense',
): CategoryStat[] {
  const filtered = transactions.filter((t) => t.type === type)
  const total = filtered.reduce((sum, t) => sum + t.amount, 0)
  const map = new Map<string, number>()

  for (const t of filtered) {
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  }

  return Array.from(map.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function calculateBalanceHistory(
  period: Period,
  transactions: Transaction[],
): BalancePoint[] {
  const periodTx = transactions
    .filter((t) => t.periodId === period.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const points: BalancePoint[] = []
  let available = period.initialCapital
  let totalCapital = period.initialCapital

  if (periodTx.length === 0) {
    return [{ date: period.startDate, balance: available, totalCapital }]
  }

  const startDate = period.startDate.split('T')[0]
  points.push({ date: startDate, balance: available, totalCapital: period.initialCapital })

  for (const tx of periodTx) {
    if (tx.type === 'income') {
      available += tx.amount
      totalCapital += tx.amount
    } else if (tx.type === 'expense') {
      available -= tx.amount
      totalCapital -= tx.amount
    } else if (tx.type === 'saving_deposit') {
      available -= tx.amount
    } else if (tx.type === 'saving_withdraw') {
      available += tx.amount
    }

    points.push({
      date: tx.date.split('T')[0],
      balance: available,
      totalCapital,
    })
  }

  return points
}

export function comparePeriods(
  current: PeriodStats,
  previous: PeriodStats | null,
): {
  incomeChange: number
  expenseChange: number
  profitChange: number
  balanceChange: number
} {
  if (!previous) {
    return { incomeChange: 0, expenseChange: 0, profitChange: 0, balanceChange: 0 }
  }

  const pct = (curr: number, prev: number) =>
    prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0

  return {
    incomeChange: pct(current.totalIncome, previous.totalIncome),
    expenseChange: pct(current.totalExpenses, previous.totalExpenses),
    profitChange: pct(current.profit, previous.profit),
    balanceChange: pct(current.availableBalance, previous.availableBalance),
  }
}
