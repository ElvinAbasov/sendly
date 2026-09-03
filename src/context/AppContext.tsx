import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  calculatePeriodStats,
  calculateCategoryStats,
  calculateBalanceHistory,
  calculateSavingsStats,
  comparePeriods,
} from '../utils/calculations'
import {
  dataService,
  createPeriod,
  createTransaction,
  initDataService,
} from '../services/dataService'
import { subscribeAuthStore, initPocketBaseClient, isNetworkError } from '../lib/pocketbase'
import { setPocketBaseUrl } from '../lib/runtimeConfig'
import { setStoredServerUrl } from '../lib/serverConfig'
import { hideNativeSplash } from '../native/initNativeApp'
import { mapUser } from '../services/pocketbaseMappers'
import { shouldShowAutoDepositPrompt } from '../utils/savings'
import { applySystemUi } from '../utils/systemUi'
import type {
  AppSettings,
  ExportData,
  Period,
  PeriodStats,
  SavingGoal,
  SavingsStats,
  Transaction,
  User,
} from '../types'

interface AppState {
  loading: boolean
  initError: string | null
  isAuthenticated: boolean
  user: User | null
  periods: Period[]
  activePeriod: Period | null
  transactions: Transaction[]
  allTransactions: Transaction[]
  savingGoals: SavingGoal[]
  settings: AppSettings
  stats: PeriodStats | null
  savingsStats: SavingsStats | null
  previousStats: PeriodStats | null
  comparison: ReturnType<typeof comparePeriods> | null
  expenseCategories: ReturnType<typeof calculateCategoryStats>
  incomeCategories: ReturnType<typeof calculateCategoryStats>
  balanceHistory: ReturnType<typeof calculateBalanceHistory>
  pendingAutoDeposits: SavingGoal[]
  operationInProgress: boolean
}

interface AppActions {
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    name: string,
    currency: string,
  ) => Promise<void>
  logout: () => Promise<void>
  setupPeriod: (name: string, initialCapital: number) => Promise<void>
  closeCurrentPeriod: () => Promise<void>
  addTransaction: (
    data: Omit<Transaction, 'id' | 'createdAt' | 'periodId' | 'userId'>,
  ) => Promise<void>
  updateTransaction: (transaction: Transaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  createSavingGoal: (
    data: Omit<
      SavingGoal,
      | 'id'
      | 'userId'
      | 'currentAmount'
      | 'createdAt'
      | 'updatedAt'
      | 'completedAt'
      | 'isCompleted'
      | 'lastAutoDepositPromptMonth'
    >,
  ) => Promise<SavingGoal>
  updateSavingGoal: (
    id: string,
    data: Partial<
      Pick<
        SavingGoal,
        | 'name'
        | 'description'
        | 'icon'
        | 'targetAmount'
        | 'targetDate'
        | 'autoDepositAmount'
        | 'autoDepositDay'
      >
    >,
  ) => Promise<SavingGoal>
  depositToSaving: (savingId: string, amount: number) => Promise<SavingGoal>
  withdrawFromSaving: (savingId: string, amount: number) => Promise<SavingGoal>
  transferBetweenSavings: (
    sourceId: string,
    destinationId: string,
    amount: number,
  ) => Promise<void>
  deleteSaving: (savingId: string, returnFunds: boolean) => Promise<void>
  skipAutoDeposit: (savingId: string) => Promise<void>
  confirmAutoDeposit: (savingId: string) => Promise<SavingGoal>
  setTheme: (theme: 'light' | 'dark') => Promise<void>
  addCustomCategory: (kind: 'expense' | 'income', name: string) => Promise<void>
  updateUser: (updates: Partial<Pick<User, 'name' | 'currency'>>) => Promise<void>
  exportData: () => Promise<ExportData>
  importData: (data: ExportData) => Promise<void>
  clearAllData: () => Promise<void>
  refresh: () => Promise<void>
  configureServerUrl: (url: string) => Promise<void>
}

type AppContextType = AppState & AppActions

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [activePeriod, setActivePeriod] = useState<Period | null>(null)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([])
  const [settings, setSettings] = useState<AppSettings>({ theme: 'dark' })
  const [operationInProgress, setOperationInProgress] = useState(false)
  const operationLock = useRef(false)

  const transactions = useMemo(
    () =>
      activePeriod
        ? allTransactions.filter((t) => t.periodId === activePeriod.id)
        : [],
    [allTransactions, activePeriod],
  )

  const stats = useMemo(
    () =>
      activePeriod
        ? calculatePeriodStats(activePeriod, allTransactions, savingGoals)
        : null,
    [activePeriod, allTransactions, savingGoals],
  )

  const savingsStats = useMemo(
    () => (savingGoals.length > 0 ? calculateSavingsStats(savingGoals) : null),
    [savingGoals],
  )

  const previousPeriod = useMemo(() => {
    const closed = periods.filter((p) => p.endDate !== null)
    return closed[0] ?? null
  }, [periods])

  const previousStats = useMemo(
    () =>
      previousPeriod
        ? calculatePeriodStats(
            previousPeriod,
            allTransactions,
            savingGoals,
            previousPeriod.endDate,
          )
        : null,
    [previousPeriod, allTransactions, savingGoals],
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

  const pendingAutoDeposits = useMemo(
    () => savingGoals.filter((g) => shouldShowAutoDepositPrompt(g)),
    [savingGoals],
  )

  const withOperationLock = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (operationLock.current) throw new Error('errors.app.operationInProgress')
    operationLock.current = true
    setOperationInProgress(true)
    try {
      return await fn()
    } finally {
      operationLock.current = false
      setOperationInProgress(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    const session = await dataService.getSession()
    if (!session) {
      setIsAuthenticated(false)
      setUser(null)
      setPeriods([])
      setActivePeriod(null)
      setAllTransactions([])
      setSavingGoals([])
      const s = await dataService.getSettings()
      setSettings(s)
      return
    }

    const u = await dataService.getUser()
    if (!u) {
      await dataService.clearSession()
      setIsAuthenticated(false)
      setUser(null)
      setPeriods([])
      setActivePeriod(null)
      setAllTransactions([])
      setSavingGoals([])
      const s = await dataService.getSettings()
      setSettings(s)
      return
    }

    try {
      const [p, ap, txs, goals, s] = await Promise.all([
        dataService.getPeriods(),
        dataService.getActivePeriod(),
        dataService.getTransactions(),
        dataService.getSavingGoals(),
        dataService.getSettings(),
      ])
      setIsAuthenticated(true)
      setUser(u)
      setPeriods(p)
      setActivePeriod(ap)
      setAllTransactions(txs)
      setSavingGoals(goals)
      setSettings(s)
    } catch (err) {
      if (isNetworkError(err)) {
        throw new Error('errors.network.offline')
      }
      throw err
    }
  }, [])

  const init = useCallback(async () => {
    setLoading(true)
    setInitError(null)
    try {
      await initDataService()
      await refresh()
    } catch (err) {
      console.error('Init error:', err)
      const key =
        err instanceof Error && err.message.startsWith('errors.')
          ? err.message
          : isNetworkError(err)
            ? 'errors.network.offline'
            : 'errors.init.failed'
      setInitError(key)
    } finally {
      setLoading(false)
      void hideNativeSplash()
    }
  }, [refresh])

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    return subscribeAuthStore((token, record) => {
      if (!token || !record) {
        setIsAuthenticated(false)
        setUser(null)
        return
      }
      setIsAuthenticated(true)
      setUser(mapUser(record))
    })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
    applySystemUi(settings.theme)
  }, [settings.theme])

  const login = async (email: string, password: string) => {
    const u = await dataService.loginUser(email, password)
    setIsAuthenticated(true)
    setUser(u)
    try {
      await refresh()
    } catch (err) {
      console.error('Post-login refresh failed:', err)
      // Auth already succeeded — keep user logged in even if data reload fails
      if (isNetworkError(err) || (err instanceof Error && err.message.startsWith('errors.network.'))) {
        return
      }
      // Still authenticated with empty data until next refresh
    }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    currency: string,
  ) => {
    const u = await dataService.registerUser(email, password, name, currency)
    setIsAuthenticated(true)
    setUser(u)
    try {
      await refresh()
    } catch (err) {
      console.error('Post-register refresh failed:', err)
      if (isNetworkError(err) || (err instanceof Error && err.message.startsWith('errors.network.'))) {
        return
      }
    }
  }

  const logout = async () => {
    await dataService.logout()
    setIsAuthenticated(false)
    setUser(null)
    setPeriods([])
    setActivePeriod(null)
    setAllTransactions([])
    setSavingGoals([])
    setSettings({ theme: 'dark' })
  }

  const setupPeriod = async (name: string, initialCapital: number) => {
    if (!user) throw new Error('errors.auth.notAuthorized')
    const p = await createPeriod(user.id, name, initialCapital)
    await refresh()
    setActivePeriod(p)
  }

  const closeCurrentPeriod = async () => {
    if (!activePeriod) return
    await dataService.closePeriod(activePeriod.id)
    await refresh()
  }

  const addTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt' | 'periodId' | 'userId'>,
  ) => {
    if (!activePeriod || !user) throw new Error('errors.app.noActivePeriod')
    return withOperationLock(async () => {
      await createTransaction({ ...data, periodId: activePeriod.id, userId: user.id })
      await refresh()
    })
  }

  const updateTransaction = async (transaction: Transaction) => {
    return withOperationLock(async () => {
      await dataService.saveTransaction(transaction)
      await refresh()
    })
  }

  const removeTransaction = async (id: string) => {
    return withOperationLock(async () => {
      await dataService.deleteTransaction(id)
      await refresh()
    })
  }

  const createSavingGoalAction = async (
    data: Omit<
      SavingGoal,
      | 'id'
      | 'userId'
      | 'currentAmount'
      | 'createdAt'
      | 'updatedAt'
      | 'completedAt'
      | 'isCompleted'
      | 'lastAutoDepositPromptMonth'
    >,
  ) => {
    const goal = await dataService.createSavingGoal(data)
    await refresh()
    return goal
  }

  const updateSavingGoalAction = async (
    id: string,
    data: Partial<
      Pick<
        SavingGoal,
        | 'name'
        | 'description'
        | 'icon'
        | 'targetAmount'
        | 'targetDate'
        | 'autoDepositAmount'
        | 'autoDepositDay'
      >
    >,
  ) => {
    const goal = await dataService.updateSavingGoal(id, data)
    await refresh()
    return goal
  }

  const depositToSavingAction = async (savingId: string, amount: number) => {
    if (!activePeriod) throw new Error('errors.app.noActivePeriod')
    return withOperationLock(async () => {
      const goal = await dataService.depositToSaving(savingId, amount, activePeriod.id)
      await refresh()
      return goal
    })
  }

  const withdrawFromSavingAction = async (savingId: string, amount: number) => {
    if (!activePeriod) throw new Error('errors.app.noActivePeriod')
    return withOperationLock(async () => {
      const goal = await dataService.withdrawFromSaving(savingId, amount, activePeriod.id)
      await refresh()
      return goal
    })
  }

  const transferBetweenSavingsAction = async (
    sourceId: string,
    destinationId: string,
    amount: number,
  ) => {
    if (!activePeriod) throw new Error('errors.app.noActivePeriod')
    await withOperationLock(async () => {
      await dataService.transferBetweenSavings(
        sourceId,
        destinationId,
        amount,
        activePeriod.id,
      )
      await refresh()
    })
  }

  const deleteSavingAction = async (savingId: string, returnFunds: boolean) => {
    if (!activePeriod) throw new Error('errors.app.noActivePeriod')
    await withOperationLock(async () => {
      if (returnFunds) {
        await dataService.deleteSavingWithReturn(savingId, activePeriod.id)
      } else {
        const goal = savingGoals.find((g) => g.id === savingId)
        if (goal && goal.currentAmount > 0) {
          throw new Error('errors.app.returnFundsFirst')
        }
        await dataService.deleteSavingGoal(savingId)
      }
      await refresh()
    })
  }

  const skipAutoDepositAction = async (savingId: string) => {
    await dataService.skipAutoDepositPrompt(savingId)
    await refresh()
  }

  const confirmAutoDepositAction = async (savingId: string) => {
    if (!activePeriod) throw new Error('errors.app.noActivePeriod')
    const goal = savingGoals.find((g) => g.id === savingId)
    if (!goal?.autoDepositAmount) throw new Error('errors.app.autoDepositNotConfigured')
    return withOperationLock(async () => {
      const result = await dataService.depositToSaving(
        savingId,
        goal.autoDepositAmount!,
        activePeriod.id,
      )
      await dataService.skipAutoDepositPrompt(savingId)
      await refresh()
      return result
    })
  }

  const setTheme = async (theme: 'light' | 'dark') => {
    const s = { ...settings, theme }
    await dataService.saveSettings(s)
    setSettings(s)
  }

  const addCustomCategory = async (kind: 'expense' | 'income', name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    const customCategories = {
      expense: [...(settings.customCategories?.expense ?? [])],
      income: [...(settings.customCategories?.income ?? [])],
    }
    customCategories[kind].push(trimmed)

    const customCategoryIcons = {
      ...(settings.customCategoryIcons ?? {}),
      [trimmed]: '📦',
    }

    const s = {
      ...settings,
      customCategories,
      customCategoryIcons,
    }
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
    await withOperationLock(async () => {
      await dataService.importData(data)
      await refresh()
      const u = await dataService.getUser()
      if (u) setUser(u)
    })
  }

  const clearAllData = async () => {
    await dataService.clearAllData()
    setIsAuthenticated(false)
    setUser(null)
    setPeriods([])
    setActivePeriod(null)
    setAllTransactions([])
    setSavingGoals([])
    setSettings({ theme: 'dark' })
  }

  const configureServerUrl = async (url: string) => {
    const normalized = url.trim().replace(/\/$/, '')
    await setStoredServerUrl(normalized)
    setPocketBaseUrl(normalized)
    initPocketBaseClient(normalized)
    await init()
  }

  const value: AppContextType = {
    loading,
    initError,
    isAuthenticated,
    user,
    periods,
    activePeriod,
    transactions,
    allTransactions,
    savingGoals,
    settings,
    stats,
    savingsStats,
    previousStats,
    comparison,
    expenseCategories,
    incomeCategories,
    balanceHistory,
    pendingAutoDeposits,
    operationInProgress,
    init,
    login,
    register,
    logout,
    setupPeriod,
    closeCurrentPeriod,
    addTransaction,
    updateTransaction,
    removeTransaction,
    createSavingGoal: createSavingGoalAction,
    updateSavingGoal: updateSavingGoalAction,
    depositToSaving: depositToSavingAction,
    withdrawFromSaving: withdrawFromSavingAction,
    transferBetweenSavings: transferBetweenSavingsAction,
    deleteSaving: deleteSavingAction,
    skipAutoDeposit: skipAutoDepositAction,
    confirmAutoDeposit: confirmAutoDepositAction,
    setTheme,
    addCustomCategory,
    updateUser,
    exportData,
    importData,
    clearAllData,
    refresh,
    configureServerUrl,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
