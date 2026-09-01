import { db, STORES } from '../db'
import type {
  AppSettings,
  ExportData,
  Period,
  Transaction,
  User,
} from '../types'
import { generateId } from '../utils/id'
import { toInputDate } from '../utils/format'

export interface IDataService {
  getUser(): Promise<User | null>
  saveUser(user: User): Promise<void>
  getPeriods(): Promise<Period[]>
  getActivePeriod(): Promise<Period | null>
  savePeriod(period: Period): Promise<void>
  closePeriod(periodId: string): Promise<void>
  getTransactions(periodId?: string): Promise<Transaction[]>
  saveTransaction(transaction: Transaction): Promise<void>
  deleteTransaction(id: string): Promise<void>
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
  exportData(): Promise<ExportData>
  importData(data: ExportData): Promise<void>
  clearAllData(): Promise<void>
}

class LocalDataService implements IDataService {
  async getUser(): Promise<User | null> {
    const users = await db.getAll<User>(STORES.users)
    return users[0] ?? null
  }

  async saveUser(user: User): Promise<void> {
    await db.put(STORES.users, user)
  }

  async getPeriods(): Promise<Period[]> {
    const periods = await db.getAll<Period>(STORES.periods)
    return periods.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }

  async getActivePeriod(): Promise<Period | null> {
    const periods = await this.getPeriods()
    return periods.find((p) => p.endDate === null) ?? null
  }

  async savePeriod(period: Period): Promise<void> {
    await db.put(STORES.periods, period)
  }

  async closePeriod(periodId: string): Promise<void> {
    const periods = await db.getAll<Period>(STORES.periods)
    const period = periods.find((p) => p.id === periodId)
    if (!period) throw new Error('Период не найден')
    await db.put(STORES.periods, {
      ...period,
      endDate: new Date().toISOString(),
    })
  }

  async getTransactions(periodId?: string): Promise<Transaction[]> {
    const transactions = await db.getAll<Transaction>(STORES.transactions)
    const filtered = periodId
      ? transactions.filter((t) => t.periodId === periodId)
      : transactions
    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    await db.put(STORES.transactions, transaction)
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.delete(STORES.transactions, id)
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
    const [user, periods, transactions] = await Promise.all([
      this.getUser(),
      this.getPeriods(),
      this.getTransactions(),
    ])
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      user,
      periods,
      transactions,
    }
  }

  async importData(data: ExportData): Promise<void> {
    await db.clearAll()
    if (data.user) await db.put(STORES.users, data.user)
    for (const period of data.periods) {
      await db.put(STORES.periods, period)
    }
    for (const tx of data.transactions) {
      await db.put(STORES.transactions, tx)
    }
  }

  async clearAllData(): Promise<void> {
    await db.clearAll()
  }
}

export const dataService: IDataService = new LocalDataService()

export async function createUser(name: string, currency: string): Promise<User> {
  const user: User = {
    id: generateId(),
    name,
    currency,
    createdAt: new Date().toISOString(),
  }
  await dataService.saveUser(user)
  return user
}

export async function createPeriod(
  name: string,
  initialCapital: number,
): Promise<Period> {
  const period: Period = {
    id: generateId(),
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
  await dataService.saveTransaction(transaction)
  return transaction
}
