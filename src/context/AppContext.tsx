import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  calculatePeriodStats,
  calculateCategoryStats,
  calculateBalanceHistory,
  comparePeriods,
} from '../utils/calculations'
import {
  dataService,
  createUser,
  createPeriod,
  createTransaction,
} from '../services/dataService'
import type {
  AppSettings,
  ExportData,
  Period,
  PeriodStats,
  Transaction,
  User,
} from '../types'

interface AppState {
  loading: boolean
  user: User | null
  periods: Period[]
  activePeriod: Period | null
  transactions: Transaction[]
  allTransactions: Transaction[]
  settings: AppSettings
  stats: PeriodStats | null
  previousStats: PeriodStats | null
  comparison: ReturnType<typeof comparePeriods> | null
  expenseCategories: ReturnType<typeof calculateCategoryStats>
  incomeCategories: ReturnType<typeof calculateCategoryStats>
  balanceHistory: ReturnType<typeof calculateBalanceHistory>
}

interface AppActions {
  init: () => Promise<void>
  setupUser: (name: string, currency: string) => Promise<void>
  setupPeriod: (name: string, initialCapital: number) => Promise<void>
  closeCurrentPeriod: () => Promise<void>
  addTransaction: (
    data: Omit<Transaction, 'id' | 'createdAt' | 'periodId'>,
  ) => Promise<void>
  updateTransaction: (transaction: Transaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  setTheme: (theme: 'light' | 'dark') => Promise<void>
  updateUser: (updates: Partial<Pick<User, 'name' | 'currency'>>) => Promise<void>
  exportData: () => Promise<ExportData>
  importData: (data: ExportData) => Promise<void>
  clearAllData: () => Promise<void>
  refresh: () => Promise<void>
}

type AppContextType = AppState & AppActions

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [activePeriod, setActivePeriod] = useState<Period | null>(null)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [settings, setSettings] = useState<AppSettings>({ theme: 'dark' })

  const transactions = useMemo(
    () =>
      activePeriod
        ? allTransactions.filter((t) => t.periodId === activePeriod.id)
        : [],
    [allTransactions, activePeriod],
  )

  const stats = useMemo(
    () => (activePeriod ? calculatePeriodStats(activePeriod, allTransactions) : null),
    [activePeriod, allTransactions],
  )

  const previousPeriod = useMemo(() => {
    const closed = periods.filter((p) => p.endDate !== null)
    return closed[0] ?? null
  }, [periods])

  const previousStats = useMemo(
    () =>
      previousPeriod
        ? calculatePeriodStats(previousPeriod, allTransactions)
        : null,
    [previousPeriod, allTransactions],
  )

  const comparison = useMemo(
    () => (stats ? comparePeriods(stats, previousStats) : null),
    [stats, previousStats],
  )

  const expenseCategories = useMemo(
    () => calculateCategoryStats(transactions, 'expense'),
    [transactions],
  )

  const incomeCategories = useMemo(
    () => calculateCategoryStats(transactions, 'income'),
    [transactions],
  )

  const balanceHistory = useMemo(
    () =>
      activePeriod
        ? calculateBalanceHistory(activePeriod, allTransactions)
        : [],
    [activePeriod, allTransactions],
  )

  const refresh = useCallback(async () => {
    const [u, p, ap, txs, s] = await Promise.all([
      dataService.getUser(),
      dataService.getPeriods(),
      dataService.getActivePeriod(),
      dataService.getTransactions(),
      dataService.getSettings(),
    ])
    setUser(u)
    setPeriods(p)
    setActivePeriod(ap)
    setAllTransactions(txs)
    setSettings(s)
  }, [])

  const init = useCallback(async () => {
    setLoading(true)
    try {
      await refresh()
    } catch (err) {
      console.error('Init error:', err)
    } finally {
      setLoading(false)
    }
  }, [refresh])

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  const setupUser = async (name: string, currency: string) => {
    const u = await createUser(name, currency)
    setUser(u)
  }

  const setupPeriod = async (name: string, initialCapital: number) => {
    const p = await createPeriod(name, initialCapital)
    await refresh()
    setActivePeriod(p)
  }

  const closeCurrentPeriod = async () => {
    if (!activePeriod) return
    await dataService.closePeriod(activePeriod.id)
    await refresh()
  }

  const addTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt' | 'periodId'>,
  ) => {
    if (!activePeriod) throw new Error('Нет активного периода')
    await createTransaction({ ...data, periodId: activePeriod.id })
    await refresh()
  }

  const updateTransaction = async (transaction: Transaction) => {
    await dataService.saveTransaction(transaction)
    await refresh()
  }

  const removeTransaction = async (id: string) => {
    await dataService.deleteTransaction(id)
    await refresh()
  }

  const setTheme = async (theme: 'light' | 'dark') => {
    const s = { theme }
    await dataService.saveSettings(s)
    setSettings(s)
  }

  const updateUser = async (
    updates: Partial<Pick<User, 'name' | 'currency'>>,
  ) => {
    if (!user) return
    const updated = { ...user, ...updates }
    await dataService.saveUser(updated)
    setUser(updated)
  }

  const exportData = () => dataService.exportData()

  const importData = async (data: ExportData) => {
    await dataService.importData(data)
    await refresh()
  }

  const clearAllData = async () => {
    await dataService.clearAllData()
    setUser(null)
    setPeriods([])
    setActivePeriod(null)
    setAllTransactions([])
    setSettings({ theme: 'dark' })
  }

  const value: AppContextType = {
    loading,
    user,
    periods,
    activePeriod,
    transactions,
    allTransactions,
    settings,
    stats,
    previousStats,
    comparison,
    expenseCategories,
    incomeCategories,
    balanceHistory,
    init,
    setupUser,
    setupPeriod,
    closeCurrentPeriod,
    addTransaction,
    updateTransaction,
    removeTransaction,
    setTheme,
    updateUser,
    exportData,
    importData,
    clearAllData,
    refresh,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
