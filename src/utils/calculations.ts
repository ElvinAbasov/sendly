import type { BalancePoint, CategoryStat, Period, PeriodStats, Transaction } from '../types'

export function calculatePeriodStats(
  period: Period,
  transactions: Transaction[],
): PeriodStats {
  const periodTx = transactions.filter((t) => t.periodId === period.id)
  const totalIncome = periodTx
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = periodTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const profit = totalIncome - totalExpenses
  const balance = period.initialCapital + totalIncome - totalExpenses
  const changePercent =
    period.initialCapital > 0
      ? ((balance - period.initialCapital) / period.initialCapital) * 100
      : 0

  const expenses = periodTx.filter((t) => t.type === 'expense')
  const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0
  const maxExpense = expenses.length > 0 ? Math.max(...expenses.map((t) => t.amount)) : 0

  return {
    balance,
    initialCapital: period.initialCapital,
    totalIncome,
    totalExpenses,
    profit,
    changePercent,
    averageExpense,
    maxExpense,
    transactionCount: periodTx.length,
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
  let balance = period.initialCapital

  if (periodTx.length === 0) {
    return [{ date: period.startDate, balance }]
  }

  const startDate = period.startDate.split('T')[0]
  points.push({ date: startDate, balance: period.initialCapital })

  for (const tx of periodTx) {
    balance += tx.type === 'income' ? tx.amount : -tx.amount
    points.push({ date: tx.date.split('T')[0], balance })
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
    balanceChange: pct(current.balance, previous.balance),
  }
}
