import type { RecordModel } from 'pocketbase'
import { getPb, refreshAuth, initPocketBaseClient } from '../lib/pocketbase'
import { getPocketBaseUrl, isLocalPocketBaseUrl, loadRuntimeConfig } from '../lib/runtimeConfig'
import type {
  AppSettings,
  ExportData,
  Period,
  SavingGoal,
  Session,
  Transaction,
  User,
} from '../types'
import { AuthError } from '../utils/authErrors'
import { normalizeEmail } from '../utils/auth'
import {
  activePeriodFilter,
  ownerFilter,
  periodTransactionsFilter,
} from '../utils/pocketbaseFilters'
import { toInputDate } from '../utils/format'
import { translateKey } from '../i18n'
import { generateId } from '../utils/id'
import { calculatePeriodStats } from '../utils/calculations'
import {
  calculateLockedSavingsFromTransactions,
  isSavingTransaction,
  recalculateSavingAmounts,
} from '../utils/savings'
import {
  mapPeriod,
  mapSaving,
  mapSettings,
  mapTransaction,
  mapUser,
  savingToRecord,
  transactionToRecord,
} from './pocketbaseMappers'

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
    data: Omit<
      SavingGoal,
      'id' | 'userId' | 'currentAmount' | 'createdAt' | 'updatedAt' | 'completedAt' | 'isCompleted'
    >,
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

class PocketBaseDataService implements IDataService {
  private operationChain: Promise<unknown> = Promise.resolve()

  private withMutex<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.operationChain.then(() => fn())
    this.operationChain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  private requireAuthRecord(): RecordModel {
    const record = getPb().authStore.record
    if (!getPb().authStore.isValid || !record) {
      throw new Error('errors.auth.notAuthorized')
    }
    return record as RecordModel
  }

  private requireUserId(): string {
    return this.requireAuthRecord().id
  }

  async getSession(): Promise<Session | null> {
    const record = getPb().authStore.record
    if (!getPb().authStore.isValid || !record) return null
    return { userId: record.id }
  }

  async setSession(_userId: string): Promise<void> {
    // PocketBase управляет сессией через authStore
  }

  async clearSession(): Promise<void> {
    getPb().authStore.clear()
  }

  async getUser(): Promise<User | null> {
    const record = getPb().authStore.record
    if (!getPb().authStore.isValid || !record) return null
    return mapUser(record as RecordModel)
  }

  async getUserByEmail(_email: string): Promise<User | null> {
    // Поиск email доступен только через серверный login endpoint
    return null
  }

  async saveUser(user: User): Promise<void> {
    await getPb().collection('users').update(user.id, {
      name: user.name,
      currency: user.currency,
    })
    if (getPb().authStore.record?.id === user.id) {
      const authRecord = getPb().authStore.record as RecordModel
      getPb().authStore.save(getPb().authStore.token, {
        ...authRecord,
        name: user.name,
        currency: user.currency,
      })
    }
  }

  async registerUser(
    email: string,
    password: string,
    name: string,
    currency: string,
  ): Promise<User> {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) throw new AuthError('email', 'auth.validation.emailRequired')

    try {
      await getPb().collection('users').create({
        email: normalizedEmail,
        password,
        passwordConfirm: password,
        name: name.trim(),
        currency,
      })
    } catch (err) {
      throw this.mapRegisterError(err)
    }

    return this.loginUser(normalizedEmail, password)
  }

  async loginUser(email: string, password: string): Promise<User> {
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail && !password) {
      throw new AuthError('both', 'auth.validation.emailAndPasswordRequired')
    }
    if (!normalizedEmail) {
      throw new AuthError('email', 'auth.validation.emailRequired')
    }
    if (!password) {
      throw new AuthError('password', 'auth.validation.passwordRequired')
    }

    let response: Response
    try {
      response = await fetch(`${getPocketBaseUrl()}/api/spendly/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
    } catch {
      if (isLocalPocketBaseUrl()) {
        throw new AuthError(
          'form',
          'auth.errors.networkMobile',
        )
      }
      throw new AuthError(
        'form',
        'auth.errors.networkOffline',
      )
    }

    const payload = (await response.json().catch(() => ({}))) as {
      field?: AuthError['field']
      code?: string
      message?: string
      token?: string
      record?: RecordModel
    }

    if (!response.ok || !payload.token || !payload.record) {
      if (response.status === 404) {
        throw new AuthError(
          'form',
          'auth.errors.authServiceUnavailable',
        )
      }
      const errorKey =
        payload.code ??
        (payload.field === 'email'
          ? 'auth.errors.userNotFound'
          : payload.field === 'password'
            ? 'auth.errors.wrongPassword'
            : payload.field === 'both'
              ? 'auth.validation.emailAndPasswordRequired'
              : payload.message?.startsWith('auth.')
                ? payload.message
                : 'auth.errors.loginFailed')
      throw new AuthError(payload.field ?? 'form', errorKey)
    }

    getPb().authStore.save(payload.token, payload.record)
    await this.ensureSettingsRecord(payload.record.id)
    return mapUser(payload.record)
  }

  async logout(): Promise<void> {
    getPb().authStore.clear()
  }

  async migrateOrphanData(_userId: string): Promise<void> {
    // Данные хранятся в PocketBase, локальная миграция не нужна
  }

  private mapRegisterError(err: unknown): AuthError {
    if (err && typeof err === 'object' && 'data' in err) {
      const data = (err as {
        data?: { data?: Record<string, { message?: string; code?: string }> }
      }).data?.data

      if (data?.email) {
        const { code, message } = data.email
        if (
          code === 'validation_not_unique' ||
          message?.includes('unique') ||
          message?.includes('exists')
        ) {
          return new AuthError('email', 'auth.errors.emailExists')
        }
        if (code === 'validation_is_email') {
          return new AuthError('email', 'auth.validation.emailInvalid')
        }
      }

      if (data?.password) {
        const { code } = data.password
        if (code === 'validation_min_text_constraint') {
          return new AuthError('password', 'auth.validation.passwordMinLength')
        }
      }

      if (data?.name?.code === 'validation_required') {
        return new AuthError('form', 'auth.validation.nameRequired')
      }
    }
    return new AuthError('form', 'auth.errors.registerFailed')
  }

  private async ensureSettingsRecord(userId: string): Promise<void> {
    try {
      await getPb().collection('user_settings').getFirstListItem(ownerFilter(userId))
    } catch {
      await getPb().collection('user_settings').create({
        owner: userId,
        theme: 'dark',
        customCategories: { expense: [], income: [] },
        customCategoryIcons: {},
      })
    }
  }

  private async getSettingsRecord(userId: string): Promise<RecordModel | null> {
    try {
      return await getPb().collection('user_settings').getFirstListItem(ownerFilter(userId))
    } catch {
      return null
    }
  }

  async getPeriods(): Promise<Period[]> {
    const userId = this.requireUserId()
    const result = await getPb().collection('periods').getFullList({
      filter: ownerFilter(userId),
      sort: '-startDate',
    })
    return result.map((record) => mapPeriod(record, userId))
  }

  async getActivePeriod(): Promise<Period | null> {
    const userId = this.requireUserId()
    const active = await getPb().collection('periods').getFullList({
      filter: activePeriodFilter(userId),
      sort: '-startDate',
    })

    if (active.length <= 1) {
      return active[0] ? mapPeriod(active[0], userId) : null
    }

    const [latest, ...extras] = active
    const now = new Date().toISOString()
    await Promise.all(
      extras.map((period) =>
        getPb().collection('periods').update(period.id, { endDate: now }),
      ),
    )
    return mapPeriod(latest, userId)
  }

  async savePeriod(period: Period): Promise<void> {
    await getPb().collection('periods').update(period.id, {
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate ?? '',
      initialCapital: period.initialCapital,
    })
  }

  async closePeriod(periodId: string): Promise<void> {
    await getPb().collection('periods').update(periodId, {
      endDate: new Date().toISOString(),
    })
  }

  async getTransactions(periodId?: string): Promise<Transaction[]> {
    const userId = this.requireUserId()
    const filter = periodId
      ? periodTransactionsFilter(userId, periodId)
      : ownerFilter(userId)
    const result = await getPb().collection('transactions').getFullList({
      filter,
      sort: '-date',
    })
    return result.map((record) => mapTransaction(record, userId))
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    return this.withMutex(async () => {
      if (isSavingTransaction(transaction.type)) {
        throw new Error('errors.app.savingTxNotEditable')
      }
      await getPb().collection('transactions').update(transaction.id, transactionToRecord(transaction))
    })
  }

  async deleteTransaction(id: string): Promise<void> {
    return this.withMutex(async () => {
      const userId = this.requireUserId()
      const record = await getPb().collection('transactions').getOne(id)
      if (String(record.owner) !== userId) throw new Error('errors.app.transactionNotFound')
      if (isSavingTransaction(record.type as Transaction['type'])) {
        throw new Error('errors.app.savingTxNotDeletable')
      }
      await getPb().collection('transactions').delete(id)
    })
  }

  private async getRawSavingGoals(userId: string): Promise<SavingGoal[]> {
    const result = await getPb().collection('savings').getFullList({
      filter: ownerFilter(userId),
      sort: '-id',
    })
    return result.map((record) => mapSaving(record, userId))
  }

  private async getSyncedSavingGoals(userId: string): Promise<SavingGoal[]> {
    const [rawGoals, transactions] = await Promise.all([
      this.getRawSavingGoals(userId),
      this.getTransactions(),
    ])
    const synced = recalculateSavingAmounts(rawGoals, transactions)

    await Promise.all(
      synced.map(async (goal) => {
        const raw = rawGoals.find((item) => item.id === goal.id)
        if (
          raw &&
          (raw.currentAmount !== goal.currentAmount ||
            raw.isCompleted !== goal.isCompleted ||
            raw.completedAt !== goal.completedAt)
        ) {
          await getPb().collection('savings').update(goal.id, savingToRecord(goal))
        }
      }),
    )

    return synced
  }

  private async getAvailableBalance(periodId: string): Promise<number> {
    const periods = await this.getPeriods()
    const period = periods.find((item) => item.id === periodId)
    if (!period) throw new Error('errors.app.periodNotFound')

    const transactions = await this.getTransactions()
    const totalInSavings = calculateLockedSavingsFromTransactions(transactions)
    const stats = calculatePeriodStats(period, transactions, [], null)
    return stats.totalCapital - totalInSavings
  }

  async getSavingGoals(): Promise<SavingGoal[]> {
    return this.getSyncedSavingGoals(this.requireUserId())
  }

  async saveSavingGoal(goal: SavingGoal): Promise<void> {
    await getPb().collection('savings').update(goal.id, savingToRecord(goal))
  }

  async deleteSavingGoal(id: string): Promise<void> {
    await getPb().collection('savings').delete(id)
  }

  async createSavingGoal(
    data: Omit<
      SavingGoal,
      'id' | 'userId' | 'currentAmount' | 'createdAt' | 'updatedAt' | 'completedAt' | 'isCompleted'
    >,
  ): Promise<SavingGoal> {
    const userId = this.requireUserId()
    const record = await getPb().collection('savings').create({
      owner: userId,
      name: data.name.trim(),
      description: data.description.trim(),
      icon: data.icon,
      targetAmount: data.targetAmount,
      currentAmount: 0,
      targetDate: data.targetDate ?? '',
      isCompleted: false,
      completedAt: '',
      autoDepositAmount: data.autoDepositAmount ?? null,
      autoDepositDay: data.autoDepositDay ?? null,
      lastAutoDepositPromptMonth: '',
    })
    return mapSaving(record, userId)
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
    const userId = this.requireUserId()
    const goals = await this.getSyncedSavingGoals(userId)
    const goal = goals.find((item) => item.id === id)
    if (!goal) throw new Error('errors.app.savingNotFound')

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

    const record = await getPb().collection('savings').update(id, savingToRecord(updated))
    return mapSaving(record, userId)
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
    if (amount <= 0) throw new Error('errors.app.amountMustBePositive')

    const userId = this.requireUserId()
    const goals = await this.getSyncedSavingGoals(userId)
    const goal = goals.find((item) => item.id === savingId)
    if (!goal) throw new Error('errors.app.savingNotFound')

    const available = await this.getAvailableBalance(periodId)
    if (amount > available) throw new Error('errors.app.insufficientFunds')

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
      category: translateKey('transactionTypes.savingsCategory'),
      title: `${translateKey('transactionTypes.saving_deposit')}: ${goal.name}`,
      note: '',
      date: now,
      createdAt: now,
      savingId,
      balanceAfter: newAmount,
    }

    await getPb().collection('transactions').create(transactionToRecord(transaction))
    const record = await getPb().collection('savings').update(savingId, savingToRecord(updated))
    return mapSaving(record, userId)
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
    if (amount <= 0) throw new Error('errors.app.amountMustBePositive')

    const userId = this.requireUserId()
    const goals = await this.getSyncedSavingGoals(userId)
    const goal = goals.find((item) => item.id === savingId)
    if (!goal) throw new Error('errors.app.savingNotFound')
    if (amount > goal.currentAmount) throw new Error('errors.app.insufficientSavingFunds')

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
      category: translateKey('transactionTypes.savingsCategory'),
      title: `${translateKey('transactionTypes.saving_withdraw')}: ${goal.name}`,
      note: '',
      date: now,
      createdAt: now,
      savingId,
      balanceAfter: newAmount,
    }

    await getPb().collection('transactions').create(transactionToRecord(transaction))
    const record = await getPb().collection('savings').update(savingId, savingToRecord(updated))
    return mapSaving(record, userId)
  }

  async transferBetweenSavings(
    sourceId: string,
    destinationId: string,
    amount: number,
    periodId: string,
  ): Promise<void> {
    return this.withMutex(async () => {
      if (amount <= 0) throw new Error('errors.app.amountMustBePositive')
      if (sourceId === destinationId) throw new Error('errors.app.selectOtherSaving')

      const userId = this.requireUserId()
      const goals = await this.getSyncedSavingGoals(userId)
      const source = goals.find((item) => item.id === sourceId)
      const destination = goals.find((item) => item.id === destinationId)
      if (!source || !destination) throw new Error('errors.app.savingNotFound')
      if (amount > source.currentAmount) throw new Error('errors.app.insufficientSavingFunds')

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
        category: translateKey('transactionTypes.savingsCategory'),
        title: `${translateKey('transactionTypes.saving_transfer')}: ${source.name} → ${destination.name}`,
        note: '',
        date: now,
        createdAt: now,
        sourceSavingId: sourceId,
        destinationSavingId: destinationId,
        balanceAfter: destNewAmount,
      }

      await getPb().collection('transactions').create(transactionToRecord(transaction))
      await getPb().collection('savings').update(sourceId, savingToRecord(updateGoal(source, sourceNewAmount)))
      await getPb().collection('savings').update(
        destinationId,
        savingToRecord(updateGoal(destination, destNewAmount)),
      )
    })
  }

  async deleteSavingWithReturn(savingId: string, periodId: string): Promise<void> {
    return this.withMutex(async () => {
      const userId = this.requireUserId()
      const goals = await this.getSyncedSavingGoals(userId)
      const goal = goals.find((item) => item.id === savingId)
      if (!goal) throw new Error('errors.app.savingNotFound')

      if (goal.currentAmount > 0) {
        await this.executeWithdrawFromSaving(savingId, goal.currentAmount, periodId)
      }

      await getPb().collection('savings').delete(savingId)
    })
  }

  async skipAutoDepositPrompt(savingId: string): Promise<void> {
    const userId = this.requireUserId()
    const goals = await this.getSyncedSavingGoals(userId)
    const goal = goals.find((item) => item.id === savingId)
    if (!goal) return

    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    await getPb().collection('savings').update(savingId, {
      lastAutoDepositPromptMonth: monthKey,
    })
  }

  async getSettings(): Promise<AppSettings> {
    const userId = getPb().authStore.isValid ? getPb().authStore.record?.id : null
    if (!userId) return { theme: 'dark' }
    const record = await this.getSettingsRecord(userId)
    return mapSettings(record)
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const userId = this.requireUserId()
    const record = await this.getSettingsRecord(userId)
    const payload = {
      theme: settings.theme,
      customCategories: settings.customCategories ?? { expense: [], income: [] },
      customCategoryIcons: settings.customCategoryIcons ?? {},
    }

    if (record) {
      await getPb().collection('user_settings').update(record.id, payload)
    } else {
      await getPb().collection('user_settings').create({ owner: userId, ...payload })
    }
  }

  async exportData(): Promise<ExportData> {
    const [user, periods, transactions, savingGoals] = await Promise.all([
      this.getUser(),
      this.getPeriods(),
      this.getTransactions(),
      this.getSavingGoals(),
    ])

    return {
      version: 3,
      exportedAt: new Date().toISOString(),
      user,
      periods,
      transactions,
      savingGoals,
    }
  }

  async importData(data: ExportData): Promise<void> {
    return this.withMutex(async () => {
      const userId = this.requireUserId()
      const currentUser = await this.getUser()
      this.validateImportPayload(data, userId, currentUser)

      const existingPeriods = await this.getPeriods()
      const existingTransactions = await this.getTransactions()
      const existingSavings = await this.getSavingGoals()

      try {
        await Promise.all([
          ...existingPeriods.map((item) => getPb().collection('periods').delete(item.id)),
          ...existingTransactions.map((item) => getPb().collection('transactions').delete(item.id)),
          ...existingSavings.map((item) => getPb().collection('savings').delete(item.id)),
        ])

        for (const period of data.periods) {
          await getPb().collection('periods').create({
            id: period.id,
            owner: userId,
            name: period.name,
            startDate: period.startDate,
            endDate: period.endDate ?? '',
            initialCapital: period.initialCapital,
          })
        }

        for (const tx of data.transactions) {
          await getPb().collection('transactions').create({
            id: tx.id,
            ...transactionToRecord({ ...tx, userId }),
          })
        }

        for (const goal of data.savingGoals ?? []) {
          await getPb().collection('savings').create({
            id: goal.id,
            ...savingToRecord({ ...goal, userId }),
          })
        }

        if (data.user?.name || data.user?.currency) {
          if (currentUser) {
            await this.saveUser({
              ...currentUser,
              name: data.user.name ?? currentUser.name,
              currency: data.user.currency ?? currentUser.currency,
            })
          }
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('errors.import.failed')
      }
    })
  }

  private validateImportPayload(
    data: ExportData,
    _userId: string,
    currentUser: User | null,
  ): void {
    if (!data.version || !Array.isArray(data.periods) || !Array.isArray(data.transactions)) {
      throw new Error('errors.import.invalidFormat')
    }

    if (data.user?.id && currentUser && data.user.id !== currentUser.id) {
      throw new Error('errors.import.wrongUser')
    }

    const goalIds = new Set((data.savingGoals ?? []).map((goal) => goal.id))
    for (const tx of data.transactions) {
      if (!tx.id || !tx.type || typeof tx.amount !== 'number' || tx.amount < 0) {
        throw new Error('errors.import.invalidTransactions')
      }
      if (isSavingTransaction(tx.type)) {
        if (tx.type === 'saving_transfer') {
          if (!tx.sourceSavingId || !tx.destinationSavingId) {
            throw new Error('errors.import.invalidTransfers')
          }
          if (!goalIds.has(tx.sourceSavingId) || !goalIds.has(tx.destinationSavingId)) {
            throw new Error('errors.import.missingSavingTransfer')
          }
        } else if (tx.savingId && !goalIds.has(tx.savingId)) {
          throw new Error('errors.import.missingSavingGoal')
        }
      }
    }

    const activePeriods = data.periods.filter((period) => period.endDate === null)
    if (activePeriods.length > 1) {
      throw new Error('errors.import.multipleActivePeriods')
    }

    if (data.periods.some((period) => !period.id || !period.name)) {
      throw new Error('errors.import.invalidPeriods')
    }
  }

  async clearAllData(): Promise<void> {
    const userId = this.requireUserId()
    const [periods, transactions, savings, settingsRecord] = await Promise.all([
      this.getPeriods(),
      this.getTransactions(),
      this.getSavingGoals(),
      this.getSettingsRecord(userId),
    ])

    await Promise.all([
      ...periods.map((item) => getPb().collection('periods').delete(item.id)),
      ...transactions.map((item) => getPb().collection('transactions').delete(item.id)),
      ...savings.map((item) => getPb().collection('savings').delete(item.id)),
      settingsRecord ? getPb().collection('user_settings').delete(settingsRecord.id) : Promise.resolve(),
    ])

    await getPb().collection('users').delete(userId)
    getPb().authStore.clear()
  }
}

export const dataService: IDataService = new PocketBaseDataService()

export async function createPeriod(
  userId: string,
  name: string,
  initialCapital: number,
): Promise<Period> {
  const existing = await getPb().collection('periods').getFullList({
    filter: activePeriodFilter(userId),
  })
  const now = new Date().toISOString()

  await Promise.all(
    existing.map((period) => getPb().collection('periods').update(period.id, { endDate: now })),
  )

  const record = await getPb().collection('periods').create({
    owner: userId,
    name,
    startDate: toInputDate(),
    endDate: '',
    initialCapital,
  })

  return mapPeriod(record, userId)
}

export async function createTransaction(
  data: Omit<Transaction, 'id' | 'createdAt'>,
): Promise<Transaction> {
  if (isSavingTransaction(data.type)) {
    throw new Error('errors.app.useSavingOperations')
  }

  const record = await getPb().collection('transactions').create({
    owner: data.userId,
    period: data.periodId,
    type: data.type,
    amount: data.amount,
    category: data.category,
    title: data.title,
    note: data.note,
    date: data.date,
    savingId: data.savingId ?? '',
    sourceSavingId: data.sourceSavingId ?? '',
    destinationSavingId: data.destinationSavingId ?? '',
    balanceAfter: data.balanceAfter ?? null,
  })
  return mapTransaction(record, data.userId)
}

export async function initDataService(): Promise<void> {
  await loadRuntimeConfig()
  initPocketBaseClient()
  await refreshAuth()
}
