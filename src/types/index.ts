export interface User {
  id: string
  name: string
  currency: string
  createdAt: string
}

export interface Period {
  id: string
  name: string
  startDate: string
  endDate: string | null
  initialCapital: number
  createdAt: string
}

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  periodId: string
  type: TransactionType
  amount: number
  category: string
  title: string
  note: string
  date: string
  createdAt: string
}

export interface PeriodStats {
  balance: number
  initialCapital: number
  totalIncome: number
  totalExpenses: number
  profit: number
  changePercent: number
  averageExpense: number
  maxExpense: number
  transactionCount: number
}

export interface CategoryStat {
  category: string
  amount: number
  percentage: number
}

export interface BalancePoint {
  date: string
  balance: number
}

export interface ExportData {
  version: number
  exportedAt: string
  user: User | null
  periods: Period[]
  transactions: Transaction[]
}

export interface AppSettings {
  theme: 'light' | 'dark'
}
