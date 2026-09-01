import { db, STORES } from '../db'
import type {
  AppSettings,
  ExportData,
  Period,
  SavingGoal,
  Session,
  Transaction,
  User,
} from '../types'
import { hashPassword, verifyPassword } from '../utils/auth'
import { generateId } from '../utils/id'
import { toInputDate } from '../utils/format'
import { calculatePeriodStats } from '../utils/calculations'
import {
  calculateLockedSavingsFromTransactions,
  isSavingTransaction,
  recalculateSavingAmounts,
} from '../utils/savings'

export interface IDataService {
  getSession(): Promise<Session | null>
  setSession(userId: string): Promise<void>
  clearSession(): Promise<void>
  getUser(): Promise<User | null>
  getUserByEmail(email: string): Promise<User | null>
  saveUser(user: User): Promise<void>
  registerUser(
    email: string,
    password: string,
    name: string,
    currency: string,
  ): Promise<User>
  loginUser(email: string, password: string): Promise<User>
  logout(): Promise<void>
  getPeriods(): Promise<Period[]>
  getActivePeriod(): Promise<Period | null>
  savePeriod(period: Period): Promise<void>
  closePeriod(periodId: string): Promise<void>
  getTransactions(periodId?: string): Promise<Transaction[]>
  saveTransaction(transaction: Transaction): Promise<void>
  deleteTransaction(id: string): Promise<void>
  getSavingGoals(): Promise<SavingGoal[]>
  saveSavingGoal(goal: SavingGoal): Promise<void>
  deleteSavingGoal(id: string): Promise<void>
  createSavingGoal(
    data: Omit<SavingGoal, 'id' | 'userId' | 'currentAmount' | 'createdAt' | 'updatedAt' | 'completedAt' | 'isCompleted'>,
  ): Promise<SavingGoal>
  updateSavingGoal(
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
        | 'lastAutoDepositPromptMonth'
      >
    >,
  ): Promise<SavingGoal>
  depositToSaving(savingId: string, amount: number, periodId: string): Promise<SavingGoal>
  withdrawFromSaving(savingId: string, amount: number, periodId: string): Promise<SavingGoal>
  transferBetweenSavings(
    sourceId: string,
    destinationId: string,
    amount: number,
    periodId: string,
  ): Promise<void>
  deleteSavingWithReturn(savingId: string, periodId: string): Promise<void>
  skipAutoDepositPrompt(savingId: string): Promise<void>
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
  exportData(): Promise<ExportData>
  importData(data: ExportData): Promise<void>
  clearAllData(): Promise<void>
  migrateOrphanData(userId: string): Promise<void>
}

class LocalDataService implements IDataService {
  private operationChain: Promise<unknown> = Promise.resolve()

  private withMutex<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.operationChain.then(() => fn())
    this.operationChain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  private validateImportPayload(
    data: ExportData,
    _userId: string,
    currentUser: User | null,
  ): void {
    if (!data.version || !Array.isArray(data.periods) || !Array.isArray(data.transactions)) {
      throw new Error('Неверный формат файла')
    }

    if (data.user?.id && currentUser && data.user.id !== currentUser.id) {
      throw new Error('Файл принадлежит другому пользователю')
    }

    const goalIds = new Set((data.savingGoals ?? []).map((g) => g.id))
    for (const tx of data.transactions) {
      if (!tx.id || !tx.type || typeof tx.amount !== 'number' || tx.amount < 0) {
        throw new Error('Некорректные операции в файле')
      }
      if (isSavingTransaction(tx.type)) {
        if (tx.type === 'saving_transfer') {
          if (!tx.sourceSavingId || !tx.destinationSavingId) {
            throw new Error('Некорректные переводы между накоплениями в файле')
          }
          if (!goalIds.has(tx.sourceSavingId) || !goalIds.has(tx.destinationSavingId)) {
            throw new Error('Перевод ссылается на отсутствующее накопление')
          }
        } else if (tx.savingId && !goalIds.has(tx.savingId)) {
          throw new Error('Операция накопления ссылается на отсутствующую цель')
        }
      }
    }

    const activePeriods = data.periods.filter((p) => p.endDate === null)
    if (activePeriods.length > 1) {
      throw new Error('В файле более одного активного периода')
    }

    if (data.periods.some((p) => !p.id || !p.name)) {
      throw new Error('Некорректные периоды в файле')
    }
  }

  private async atomicWrite(
    writes: Array<{ store: typeof STORES.transactions | typeof STORES.savings; value: unknown }>,
  ): Promise<void> {
    const storeNames = [...new Set(writes.map((w) => w.store))] as Array<
      typeof STORES.transactions | typeof STORES.savings
    >
    await db.runTransactionSync(storeNames, 'readwrite', (stores) => {
      for (const write of writes) {
        stores[write.store].put(write.value)
      }
    })
  }

  private async ensureSingleActivePeriod(userId: string): Promise<Period | null> {
    const periods = await db.getAllByIndex<Period>(STORES.periods, 'userId', userId)
    const active = periods
      .filter((p) => p.endDate === null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (active.length <= 1) return active[0] ?? null

    const [latest, ...extras] = active
    const now = new Date().toISOString()
    for (const period of extras) {
      await db.put(STORES.periods, { ...period, endDate: now })
    }
    return latest
  }
  private async requireUserId(): Promise<string> {
    const session = await this.getSession()
    if (!session) throw new Error('Не авторизован')
    return session.userId
  }

  private async getRawSavingGoals(userId: string): Promise<SavingGoal[]> {
    const goals = await db.getAllByIndex<SavingGoal>(STORES.savings, 'userId', userId)
    return goals.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }

  private async getSyncedSavingGoals(userId: string): Promise<SavingGoal[]> {
    const [rawGoals, transactions] = await Promise.all([
      this.getRawSavingGoals(userId),
      db.getAllByIndex<Transaction>(STORES.transactions, 'userId', userId),
    ])
    const synced = recalculateSavingAmounts(rawGoals, transactions)

    for (const goal of synced) {
      const raw = rawGoals.find((g) => g.id === goal.id)
      if (
        raw &&
        (raw.currentAmount !== goal.currentAmount ||
          raw.isCompleted !== goal.isCompleted ||
          raw.completedAt !== goal.completedAt)
      ) {
        await db.put(STORES.savings, goal)
      }
    }

    return synced
  }

  private async getAvailableBalance(periodId: string, userId: string): Promise<number> {
    const periods = await db.getAllByIndex<Period>(STORES.periods, 'userId', userId)
    const period = periods.find((p) => p.id === periodId)
    if (!period) throw new Error('Период не найден')

    const transactions = await db.getAllByIndex<Transaction>(
      STORES.transactions,
      'userId',
      userId,
    )
    const totalInSavings = calculateLockedSavingsFromTransactions(transactions)
    const stats = calculatePeriodStats(period, transactions, [], null)
    return stats.totalCapital - totalInSavings
  }

  async getSession(): Promise<Session | null> {
    const stored = await db.get<{ key: string; value: Session }>(
      STORES.settings,
      'session',
    )
    return stored?.value ?? null
  }

  async setSession(userId: string): Promise<void> {
    await db.put(STORES.settings, { key: 'session', value: { userId } })
  }

  async clearSession(): Promise<void> {
    await db.delete(STORES.settings, 'session')
  }

  async getUser(): Promise<User | null> {
    const session = await this.getSession()
    if (!session) return null
    return (await db.get<User>(STORES.users, session.userId)) ?? null
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase()
    return (await db.getByIndex<User>(STORES.users, 'email', normalized)) ?? null
  }

  async saveUser(user: User): Promise<void> {
    await db.put(STORES.users, user)
  }

  async registerUser(
    email: string,
    password: string,
    name: string,
    currency: string,
  ): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await this.getUserByEmail(normalizedEmail)
    if (existing) throw new Error('Пользователь с таким email уже существует')

    const passwordHash = await hashPassword(password)
    const user: User = {
      id: generateId(),
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      currency,
      createdAt: new Date().toISOString(),
    }
    await db.put(STORES.users, user)
    await this.migrateOrphanData(user.id)
    await this.setSession(user.id)
    return user
  }

  async loginUser(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase()
    const user = await this.getUserByEmail(normalizedEmail)
    if (!user) throw new Error('Неверный email или пароль')

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) throw new Error('Неверный email или пароль')

    await this.setSession(user.id)
    return user
  }

  async logout(): Promise<void> {
    await this.clearSession()
  }

  async migrateOrphanData(userId: string): Promise<void> {
    const allPeriods = await db.getAll<Period>(STORES.periods)
    for (const period of allPeriods) {
      if (period.userId && period.userId !== userId) {
        throw new Error('Локальные данные принадлежат другому пользователю')
      }
    }

    const allTransactions = await db.getAll<Transaction>(STORES.transactions)
    for (const tx of allTransactions) {
      if (tx.userId && tx.userId !== userId) {
        throw new Error('Локальные данные принадлежат другому пользователю')
      }
    }

    const allSavings = await db.getAll<SavingGoal>(STORES.savings)
    for (const goal of allSavings) {
      if (goal.userId && goal.userId !== userId) {
        throw new Error('Локальные данные принадлежат другому пользователю')
      }
    }

    for (const period of allPeriods) {
      if (!period.userId) {
        await db.put(STORES.periods, { ...period, userId })
      }
    }

    for (const tx of allTransactions) {
      if (!tx.userId) {
        await db.put(STORES.transactions, { ...tx, userId })
      }
    }

    for (const goal of allSavings) {
      if (!goal.userId) {
        await db.put(STORES.savings, { ...goal, userId })
      }
    }
  }

  async getPeriods(): Promise<Period[]> {
    const userId = await this.requireUserId()
    const periods = await db.getAllByIndex<Period>(STORES.periods, 'userId', userId)
    return periods.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }

  async getActivePeriod(): Promise<Period | null> {
    const userId = await this.requireUserId()
    return this.ensureSingleActivePeriod(userId)
  }

  async savePeriod(period: Period): Promise<void> {
    await db.put(STORES.periods, period)
  }

  async closePeriod(periodId: string): Promise<void> {
    const userId = await this.requireUserId()
    const periods = await db.getAllByIndex<Period>(STORES.periods, 'userId', userId)
    const period = periods.find((p) => p.id === periodId)
    if (!period) throw new Error('Период не найден')
    await db.put(STORES.periods, {
      ...period,
      endDate: new Date().toISOString(),
    })
  }

  async getTransactions(periodId?: string): Promise<Transaction[]> {
    const userId = await this.requireUserId()
    const transactions = await db.getAllByIndex<Transaction>(
      STORES.transactions,
      'userId',
      userId,
    )
    const filtered = periodId
      ? transactions.filter((t) => t.periodId === periodId)
      : transactions
    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    return this.withMutex(async () => {
      if (isSavingTransaction(transaction.type)) {
        throw new Error('Операции накоплений нельзя редактировать напрямую')
      }
      await db.put(STORES.transactions, transaction)
    })
  }

  async deleteTransaction(id: string): Promise<void> {
    return this.withMutex(async () => {
      const userId = await this.requireUserId()
      const tx = await db.get<Transaction>(STORES.transactions, id)
      if (!tx || tx.userId !== userId) throw new Error('Операция не найдена')
      if (isSavingTransaction(tx.type)) {
        throw new Error('Операции накоплений нельзя удалить. Используйте снятие из накопления.')
      }
      await db.delete(STORES.transactions, id)
    })
  }

  async getSavingGoals(): Promise<SavingGoal[]> {
    const userId = await this.requireUserId()
    return this.getSyncedSavingGoals(userId)
  }

  async saveSavingGoal(goal: SavingGoal): Promise<void> {
    await db.put(STORES.savings, goal)
  }

  async deleteSavingGoal(id: string): Promise<void> {
    await db.delete(STORES.savings, id)
  }

  async createSavingGoal(
    data: Omit<
      SavingGoal,
      'id' | 'userId' | 'currentAmount' | 'createdAt' | 'updatedAt' | 'completedAt' | 'isCompleted'
    >,
  ): Promise<SavingGoal> {
    const userId = await this.requireUserId()
    const now = new Date().toISOString()
    const goal: SavingGoal = {
      id: generateId(),
      userId,
      name: data.name.trim(),
      description: data.description.trim(),
      icon: data.icon,
      targetAmount: data.targetAmount,
      currentAmount: 0,
      targetDate: data.targetDate,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      isCompleted: false,
      autoDepositAmount: data.autoDepositAmount ?? null,
      autoDepositDay: data.autoDepositDay ?? null,
      lastAutoDepositPromptMonth: null,
    }
    await db.put(STORES.savings, goal)
    return goal
  }

  async updateSavingGoal(
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
        | 'lastAutoDepositPromptMonth'
      >
    >,
  ): Promise<SavingGoal> {
    const userId = await this.requireUserId()
    const goals = await this.getSyncedSavingGoals(userId)
    const goal = goals.find((g) => g.id === id)
    if (!goal) throw new Error('Накопление не найдено')

    const updated: SavingGoal = {
      ...goal,
      ...data,
      name: data.name?.trim() ?? goal.name,
      description: data.description?.trim() ?? goal.description,
      updatedAt: new Date().toISOString(),
    }

    if (updated.targetAmount && updated.currentAmount >= updated.targetAmount) {
      if (!updated.isCompleted) {
        updated.isCompleted = true
        updated.completedAt = new Date().toISOString()
      }
    } else {
      updated.isCompleted = false
      updated.completedAt = null
    }

    await db.put(STORES.savings, updated)
    return updated
  }

  async depositToSaving(
    savingId: string,
    amount: number,
    periodId: string,
  ): Promise<SavingGoal> {
    return this.withMutex(() => this.executeDepositToSaving(savingId, amount, periodId))
  }

  private async executeDepositToSaving(
    savingId: string,
    amount: number,
    periodId: string,
  ): Promise<SavingGoal> {
    if (amount <= 0) throw new Error('Сумма должна быть больше 0')

    const userId = await this.requireUserId()
    const goals = await this.getSyncedSavingGoals(userId)
    const goal = goals.find((g) => g.id === savingId)
    if (!goal) throw new Error('Накопление не найдено')

    const available = await this.getAvailableBalance(periodId, userId)
    if (amount > available) throw new Error('Недостаточно доступных средств')

    const newAmount = goal.currentAmount + amount
    const now = new Date().toISOString()
    const reached =
      goal.targetAmount != null && goal.targetAmount > 0 && newAmount >= goal.targetAmount

    const updated: SavingGoal = {
      ...goal,
      currentAmount: newAmount,
      updatedAt: now,
      isCompleted: reached,
      completedAt: reached ? goal.completedAt ?? now : null,
    }

    const transaction: Transaction = {
      id: generateId(),
      userId,
      periodId,
      type: 'saving_deposit',
      amount,
      category: 'Накопления',
      title: `Пополнение: ${goal.name}`,
      note: '',
      date: now,
      createdAt: now,
      savingId,
      balanceAfter: newAmount,
    }

    await this.atomicWrite([
      { store: STORES.transactions, value: transaction },
      { store: STORES.savings, value: updated },
    ])
    return updated
  }

  async withdrawFromSaving(
    savingId: string,
    amount: number,
    periodId: string,
  ): Promise<SavingGoal> {
    return this.withMutex(() => this.executeWithdrawFromSaving(savingId, amount, periodId))
  }

  private async executeWithdrawFromSaving(
    savingId: string,
    amount: number,
    periodId: string,
  ): Promise<SavingGoal> {
    if (amount <= 0) throw new Error('Сумма должна быть больше 0')

    const userId = await this.requireUserId()
    const goals = await this.getSyncedSavingGoals(userId)
    const goal = goals.find((g) => g.id === savingId)
    if (!goal) throw new Error('Накопление не найдено')
    if (amount > goal.currentAmount) throw new Error('Недостаточно средств в накоплении')

    const newAmount = goal.currentAmount - amount
    const now = new Date().toISOString()
    const reached =
      goal.targetAmount != null && goal.targetAmount > 0 && newAmount >= goal.targetAmount

    const updated: SavingGoal = {
      ...goal,
      currentAmount: newAmount,
      updatedAt: now,
      isCompleted: reached,
      completedAt: reached ? goal.completedAt ?? now : null,
    }

    const transaction: Transaction = {
      id: generateId(),
      userId,
      periodId,
      type: 'saving_withdraw',
      amount,
      category: 'Накопления',
      title: `Снятие: ${goal.name}`,
      note: '',
      date: now,
      createdAt: now,
      savingId,
      balanceAfter: newAmount,
    }

    await this.atomicWrite([
      { store: STORES.transactions, value: transaction },
      { store: STORES.savings, value: updated },
    ])
    return updated
  }

  async transferBetweenSavings(
    sourceId: string,
    destinationId: string,
    amount: number,
    periodId: string,
  ): Promise<void> {
    return this.withMutex(async () => {
      if (amount <= 0) throw new Error('Сумма должна быть больше 0')
      if (sourceId === destinationId) throw new Error('Выберите другое накопление')

      const userId = await this.requireUserId()
      const goals = await this.getSyncedSavingGoals(userId)
      const source = goals.find((g) => g.id === sourceId)
      const destination = goals.find((g) => g.id === destinationId)
      if (!source || !destination) throw new Error('Накопление не найдено')
      if (amount > source.currentAmount) throw new Error('Недостаточно средств в накоплении')

      const now = new Date().toISOString()
      const sourceNewAmount = source.currentAmount - amount
      const destNewAmount = destination.currentAmount + amount

      const updateGoal = (goal: SavingGoal, newAmount: number): SavingGoal => {
        const reached =
          goal.targetAmount != null && goal.targetAmount > 0 && newAmount >= goal.targetAmount
        return {
          ...goal,
          currentAmount: newAmount,
          updatedAt: now,
          isCompleted: reached,
          completedAt: reached ? goal.completedAt ?? now : null,
        }
      }

      const transaction: Transaction = {
        id: generateId(),
        userId,
        periodId,
        type: 'saving_transfer',
        amount,
        category: 'Накопления',
        title: `Перевод: ${source.name} → ${destination.name}`,
        note: '',
        date: now,
        createdAt: now,
        sourceSavingId: sourceId,
        destinationSavingId: destinationId,
        balanceAfter: destNewAmount,
      }

      await this.atomicWrite([
        { store: STORES.transactions, value: transaction },
        { store: STORES.savings, value: updateGoal(source, sourceNewAmount) },
        { store: STORES.savings, value: updateGoal(destination, destNewAmount) },
      ])
    })
  }

  async deleteSavingWithReturn(savingId: string, periodId: string): Promise<void> {
    return this.withMutex(async () => {
      const userId = await this.requireUserId()
      const goals = await this.getSyncedSavingGoals(userId)
      const goal = goals.find((g) => g.id === savingId)
      if (!goal) throw new Error('Накопление не найдено')

      if (goal.currentAmount > 0) {
        await this.executeWithdrawFromSaving(savingId, goal.currentAmount, periodId)
      }

      await db.delete(STORES.savings, savingId)
    })
  }

  async skipAutoDepositPrompt(savingId: string): Promise<void> {
    const userId = await this.requireUserId()
    const goals = await this.getSyncedSavingGoals(userId)
    const goal = goals.find((g) => g.id === savingId)
    if (!goal) return

    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    await db.put(STORES.savings, {
      ...goal,
      lastAutoDepositPromptMonth: monthKey,
      updatedAt: new Date().toISOString(),
    })
  }

  async getSettings(): Promise<AppSettings> {
    const stored = await db.get<{ key: string; value: AppSettings }>(
      STORES.settings,
      'app',
    )
    return stored?.value ?? { theme: 'dark' }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await db.put(STORES.settings, { key: 'app', value: settings })
  }

  async exportData(): Promise<ExportData> {
    const [user, periods, transactions, savingGoals] = await Promise.all([
      this.getUser(),
      this.getPeriods(),
      this.getTransactions(),
      this.getSavingGoals(),
    ])
    const safeUser = user
      ? {
          id: user.id,
          email: user.email,
          passwordHash: '',
          name: user.name,
          currency: user.currency,
          createdAt: user.createdAt,
        }
      : null
    return {
      version: 3,
      exportedAt: new Date().toISOString(),
      user: safeUser,
      periods,
      transactions,
      savingGoals,
    }
  }

  async importData(data: ExportData): Promise<void> {
    return this.withMutex(async () => {
      const userId = await this.requireUserId()
      const currentUser = await this.getUser()
      this.validateImportPayload(data, userId, currentUser)

      const userPeriods = await db.getAllByIndex<Period>(STORES.periods, 'userId', userId)
      const userTransactions = await db.getAllByIndex<Transaction>(
        STORES.transactions,
        'userId',
        userId,
      )
      const userSavings = await db.getAllByIndex<SavingGoal>(STORES.savings, 'userId', userId)

      const backup = {
        periods: userPeriods,
        transactions: userTransactions,
        savings: userSavings,
      }

      try {
        for (const period of userPeriods) {
          await db.delete(STORES.periods, period.id)
        }
        for (const tx of userTransactions) {
          await db.delete(STORES.transactions, tx.id)
        }
        for (const goal of userSavings) {
          await db.delete(STORES.savings, goal.id)
        }

        for (const period of data.periods) {
          await db.put(STORES.periods, { ...period, userId })
        }
        for (const tx of data.transactions) {
          await db.put(STORES.transactions, { ...tx, userId })
        }
        for (const goal of data.savingGoals ?? []) {
          await db.put(STORES.savings, { ...goal, userId })
        }

        if (data.user?.name || data.user?.currency) {
          if (currentUser) {
            await db.put(STORES.users, {
              ...currentUser,
              name: data.user.name ?? currentUser.name,
              currency: data.user.currency ?? currentUser.currency,
            })
          }
        }
      } catch (err) {
        for (const period of backup.periods) {
          await db.put(STORES.periods, period)
        }
        for (const tx of backup.transactions) {
          await db.put(STORES.transactions, tx)
        }
        for (const goal of backup.savings) {
          await db.put(STORES.savings, goal)
        }
        throw err instanceof Error ? err : new Error('Ошибка импорта данных')
      }
    })
  }

  async clearAllData(): Promise<void> {
    const userId = await this.requireUserId()

    const userPeriods = await db.getAllByIndex<Period>(STORES.periods, 'userId', userId)
    const userTransactions = await db.getAllByIndex<Transaction>(
      STORES.transactions,
      'userId',
      userId,
    )
    const userSavings = await db.getAllByIndex<SavingGoal>(STORES.savings, 'userId', userId)

    for (const period of userPeriods) {
      await db.delete(STORES.periods, period.id)
    }
    for (const tx of userTransactions) {
      await db.delete(STORES.transactions, tx.id)
    }
    for (const goal of userSavings) {
      await db.delete(STORES.savings, goal.id)
    }
    await db.delete(STORES.users, userId)
    await this.clearSession()
  }
}

export const dataService: IDataService = new LocalDataService()

export async function createPeriod(
  userId: string,
  name: string,
  initialCapital: number,
): Promise<Period> {
  const existing = await db.getAllByIndex<Period>(STORES.periods, 'userId', userId)
  const now = new Date().toISOString()
  for (const period of existing) {
    if (period.endDate === null) {
      await db.put(STORES.periods, { ...period, endDate: now })
    }
  }

  const period: Period = {
    id: generateId(),
    userId,
    name,
    startDate: toInputDate(),
    endDate: null,
    initialCapital,
    createdAt: new Date().toISOString(),
  }
  await dataService.savePeriod(period)
  return period
}

export async function createTransaction(
  data: Omit<Transaction, 'id' | 'createdAt'>,
): Promise<Transaction> {
  const transaction: Transaction = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  if (isSavingTransaction(transaction.type)) {
    throw new Error('Используйте операции накоплений для этого типа транзакции')
  }
  await dataService.saveTransaction(transaction)
  return transaction
}
