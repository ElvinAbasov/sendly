const DB_NAME = 'spendly'
const DB_VERSION = 1

const STORES = {
  users: 'users',
  periods: 'periods',
  transactions: 'transactions',
  settings: 'settings',
} as const

type StoreName = (typeof STORES)[keyof typeof STORES]

class IndexedDBService {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        this.initPromise = null
        reject(new Error('Не удалось открыть базу данных'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(STORES.users)) {
          db.createObjectStore(STORES.users, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORES.periods)) {
          const periodStore = db.createObjectStore(STORES.periods, { keyPath: 'id' })
          periodStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
        if (!db.objectStoreNames.contains(STORES.transactions)) {
          const txStore = db.createObjectStore(STORES.transactions, { keyPath: 'id' })
          txStore.createIndex('periodId', 'periodId', { unique: false })
          txStore.createIndex('date', 'date', { unique: false })
          txStore.createIndex('type', 'type', { unique: false })
        }
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' })
        }
      }
    })

    return this.initPromise
  }

  private async getStore(
    storeName: StoreName,
    mode: IDBTransactionMode = 'readonly',
  ): Promise<IDBObjectStore> {
    const db = await this.init()
    const transaction = db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  }

  async get<T>(storeName: StoreName, key: string): Promise<T | undefined> {
    const store = await this.getStore(storeName)
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result as T | undefined)
      request.onerror = () => reject(new Error(`Ошибка чтения: ${storeName}`))
    })
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const store = await this.getStore(storeName)
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(new Error(`Ошибка чтения: ${storeName}`))
    })
  }

  async put<T>(storeName: StoreName, value: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(value)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Ошибка записи: ${storeName}`))
    })
  }

  async delete(storeName: StoreName, key: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Ошибка удаления: ${storeName}`))
    })
  }

  async clear(storeName: StoreName): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Ошибка очистки: ${storeName}`))
    })
  }

  async clearAll(): Promise<void> {
    await this.clear(STORES.users)
    await this.clear(STORES.periods)
    await this.clear(STORES.transactions)
    await this.clear(STORES.settings)
  }
}

export const db = new IndexedDBService()
export { STORES }
