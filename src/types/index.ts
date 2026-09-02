export interface User {
  id: string
  email: string
  name: string
  currency: string
  createdAt: string
}

export interface Period {
  id: string
  userId: string
  name: string
  startDate: string
  endDate: string | null
  initialCapital: number
  createdAt: string
}

export interface Session {
  userId: string
}

export type TransactionType =
  | 'income'
  | 'expense'
  | 'saving_deposit'
  | 'saving_withdraw'
  | 'saving_transfer'

export interface Transaction {
  id: string
  userId: string
  periodId: string
  type: TransactionType
  amount: number
  category: string
  title: string
  note: string
  date: string
  createdAt: string
  savingId?: string
  sourceSavingId?: string
  destinationSavingId?: string
  balanceAfter?: number
}

export interface SavingGoal {
  id: string
  userId: string
  name: string
  description: string
  icon: string
  targetAmount: number | null
  currentAmount: number
  targetDate: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  isCompleted: boolean
  autoDepositAmount?: number | null
  autoDepositDay?: number | null
  lastAutoDepositPromptMonth?: string | null
}

export interface PeriodStats {
  balance: number
  totalCapital: number
  availableBalance: number
  totalInSavings: number
  initialCapital: number
  totalIncome: number
  totalExpenses: number
  profit: number
  changePercent: number
  averageExpense: number
  maxExpense: number
  transactionCount: number
}

export interface SavingsStats {
  totalSaved: number
  goalsCount: number
  goalsWithTarget: number
  overallProgress: number
  completedGoals: number
}

export interface CategoryStat {
  category: string
  amount: number
  percentage: number
}

export interface BalancePoint {
  date: string
  balance: number
  totalCapital: number
}

export interface ExportData {
  version: number
  exportedAt: string
  user: User | null
  periods: Period[]
  transactions: Transaction[]
  savingGoals: SavingGoal[]
}

export interface CustomCategories {
  expense: string[]
  income: string[]
}

export interface AppSettings {
  theme: 'light' | 'dark'
  customCategories?: CustomCategories
  customCategoryIcons?: Record<string, string>
}

export type CategorySelectMode = 'expense' | 'income'

export type HistoryTypeFilter = 'all' | 'income' | 'expense' | 'savings'

export type SavingOperationType = 'deposit' | 'withdraw' | 'transfer'
