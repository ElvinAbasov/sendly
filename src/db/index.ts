const DB_NAME = 'spendly'
const DB_VERSION = 6

const STORES = {
  users: 'users',
  periods: 'periods',
  transactions: 'transactions',
  savings: 'savings',
  settings: 'settings',
} as const

type StoreName = (typeof STORES)[keyof typeof STORES]

function ensurePeriodIndexes(store: IDBObjectStore): void {
  if (!store.indexNames.contains('createdAt')) {
    store.createIndex('createdAt', 'createdAt', { unique: false })
  }
  if (!store.indexNames.contains('userId')) {
    store.createIndex('userId', 'userId', { unique: false })
  }
}

function ensureSavingIndexes(store: IDBObjectStore): void {
  if (!store.indexNames.contains('userId')) {
    store.createIndex('userId', 'userId', { unique: false })
  }
  if (!store.indexNames.contains('createdAt')) {
    store.createIndex('createdAt', 'createdAt', { unique: false })
  }
}

function ensureTransactionIndexes(store: IDBObjectStore): void {
  if (!store.indexNames.contains('periodId')) {
    store.createIndex('periodId', 'periodId', { unique: false })
  }
  if (!store.indexNames.contains('date')) {
    store.createIndex('date', 'date', { unique: false })
  }
  if (!store.indexNames.contains('type')) {
    store.createIndex('type', 'type', { unique: false })
  }
  if (!store.indexNames.contains('userId')) {
    store.createIndex('userId', 'userId', { unique: false })
  }
}

function ensureEmailIndex(userStore: IDBObjectStore): void {
  if (userStore.indexNames.contains('email')) {
    const request = userStore.openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return

      const user = cursor.value as { email?: string }
      const normalized = user.email?.trim().toLowerCase()
      if (normalized && user.email !== normalized) {
        cursor.update({ ...user, email: normalized })
      }
      cursor.continue()
    }
    return
  }

  const request = userStore.openCursor()
  request.onsuccess = () => {
    const cursor = request.result
    if (cursor) {
      const user = cursor.value as { email?: string }
      const normalized = user.email?.trim().toLowerCase()

      if (!normalized) {
        cursor.delete()
      } else if (user.email !== normalized) {
        cursor.update({ ...user, email: normalized })
      }

      cursor.continue()
    } else if (!userStore.indexNames.contains('email')) {
      userStore.createIndex('email', 'email', { unique: true })
    }
  }
  request.onerror = () => {
    throw request.error ?? new Error('Ошибка миграции пользователей')
  }
}

function runUpgrade(db: IDBDatabase, tx: IDBTransaction): void {
  let userStore: IDBObjectStore
  if (!db.objectStoreNames.contains(STORES.users)) {
    userStore = db.createObjectStore(STORES.users, { keyPath: 'id' })
  } else {
    userStore = tx.objectStore(STORES.users)
  }

  let periodStore: IDBObjectStore
  if (!db.objectStoreNames.contains(STORES.periods)) {
    periodStore = db.createObjectStore(STORES.periods, { keyPath: 'id' })
  } else {
    periodStore = tx.objectStore(STORES.periods)
  }
  ensurePeriodIndexes(periodStore)

  let transactionStore: IDBObjectStore
  if (!db.objectStoreNames.contains(STORES.transactions)) {
    transactionStore = db.createObjectStore(STORES.transactions, { keyPath: 'id' })
  } else {
    transactionStore = tx.objectStore(STORES.transactions)
  }
  ensureTransactionIndexes(transactionStore)

  let savingStore: IDBObjectStore
  if (!db.objectStoreNames.contains(STORES.savings)) {
    savingStore = db.createObjectStore(STORES.savings, { keyPath: 'id' })
  } else {
    savingStore = tx.objectStore(STORES.savings)
  }
  ensureSavingIndexes(savingStore)

  if (!db.objectStoreNames.contains(STORES.settings)) {
    db.createObjectStore(STORES.settings, { keyPath: 'key' })
  }

  ensureEmailIndex(userStore)
}

function validateSchema(db: IDBDatabase): boolean {
  try {
    if (!db.objectStoreNames.contains(STORES.users)) return false
    if (!db.objectStoreNames.contains(STORES.periods)) return false
    if (!db.objectStoreNames.contains(STORES.transactions)) return false
    if (!db.objectStoreNames.contains(STORES.settings)) return false
    if (!db.objectStoreNames.contains(STORES.savings)) return false

    const tx = db.transaction(
      [STORES.users, STORES.periods, STORES.transactions, STORES.savings],
      'readonly',
    )
    const users = tx.objectStore(STORES.users)
    const periods = tx.objectStore(STORES.periods)
    const transactions = tx.objectStore(STORES.transactions)
    const savings = tx.objectStore(STORES.savings)

    if (!users.indexNames.contains('email')) return false
    if (!periods.indexNames.contains('userId')) return false
    if (!transactions.indexNames.contains('userId')) return false
    if (!savings.indexNames.contains('userId')) return false

    return true
  } catch {
    return false
  }
}

class IndexedDBService {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        const detail = request.error?.message ?? 'unknown error'
        reject(new Error(`Не удалось открыть базу данных: ${detail}`))
      }

      request.onblocked = () => {
        console.warn('Обновление базы данных заблокировано — закройте другие вкладки с Spendly')
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = () => {
        const db = request.result
        const tx = request.transaction
        if (!tx) {
          reject(new Error('Транзакция миграции недоступна'))
          return
        }

        tx.onerror = () => {
          const detail = tx.error?.message ?? 'unknown error'
          reject(new Error(`Ошибка миграции базы данных: ${detail}`))
        }

        try {
          runUpgrade(db, tx)
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Ошибка миграции базы данных'))
        }
      }
    })
  }

  private async openAndValidate(): Promise<IDBDatabase> {
    const db = await this.openDatabase()
    if (validateSchema(db)) return db

    console.error('DB schema invalid — migration may be required. Data was NOT deleted.')
    throw new Error('Схема базы данных устарела. Обновите приложение или экспортируйте данные.')
  }

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.initPromise) return this.initPromise

    this.initPromise = this.openAndValidate()
      .then((db) => {
        this.db = db
        return db
      })
      .catch((err) => {
        this.initPromise = null
        throw err
      })

    return this.initPromise
  }

  async getDatabase(): Promise<IDBDatabase> {
    return this.init()
  }

  async runTransactionSync(
    storeNames: StoreName[],
    mode: IDBTransactionMode,
    fn: (stores: Record<string, IDBObjectStore>) => void,
  ): Promise<void> {
    const database = await this.init()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeNames, mode)
      const stores: Record<string, IDBObjectStore> = {}
      for (const name of storeNames) {
        stores[name] = tx.objectStore(name)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Ошибка транзакции базы данных'))
      tx.onabort = () => reject(tx.error ?? new Error('Транзакция базы данных отменена'))
      try {
        fn(stores)
      } catch (err) {
        tx.abort()
        reject(err instanceof Error ? err : new Error('Ошибка транзакции'))
      }
    })
  }

  async runTransaction<T>(
    storeNames: StoreName[],
    mode: IDBTransactionMode,
    fn: (stores: Record<string, IDBObjectStore>) => Promise<T>,
  ): Promise<T> {
    const database = await this.init()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeNames, mode)
      const stores: Record<string, IDBObjectStore> = {}
      for (const name of storeNames) {
        stores[name] = tx.objectStore(name)
      }

      let settled = false
      tx.oncomplete = () => {
        if (!settled) {
          settled = true
          resolve(result)
        }
      }
      tx.onerror = () => {
        if (!settled) {
          settled = true
          reject(tx.error ?? new Error('Ошибка транзакции базы данных'))
        }
      }
      tx.onabort = () => {
        if (!settled) {
          settled = true
          reject(tx.error ?? new Error('Транзакция базы данных отменена'))
        }
      }

      let result!: T
      fn(stores)
        .then((value) => {
          result = value
        })
        .catch((err) => {
          if (!settled) {
            settled = true
            tx.abort()
            reject(err instanceof Error ? err : new Error('Ошибка транзакции'))
          }
        })
    })
  }

  putInStore<T>(store: IDBObjectStore, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.put(value)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error ?? new Error('Ошибка записи'))
    })
  }

  deleteFromStore(store: IDBObjectStore, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error ?? new Error('Ошибка удаления'))
    })
  }

  private async getStore(
    storeName: StoreName,
    mode: IDBTransactionMode = 'readonly',
  ): Promise<IDBObjectStore> {
    const db = await this.init()
    const transaction = db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  }

  private hasIndex(store: IDBObjectStore, indexName: string): boolean {
    return store.indexNames.contains(indexName)
  }

  async get<T>(storeName: StoreName, key: string): Promise<T | undefined> {
    const store = await this.getStore(storeName)
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result as T | undefined)
      request.onerror = () => reject(new Error(`Ошибка чтения: ${storeName}`))
    })
  }

  async getByIndex<T>(
    storeName: StoreName,
    indexName: string,
    key: IDBValidKey,
  ): Promise<T | undefined> {
    const store = await this.getStore(storeName)
    if (!this.hasIndex(store, indexName)) {
      const all = await this.getAll<Record<string, unknown>>(storeName)
      return all.find((item) => item[indexName] === key) as T | undefined
    }

    return new Promise((resolve, reject) => {
      const request = store.index(indexName).get(key)
      request.onsuccess = () => resolve(request.result as T | undefined)
      request.onerror = () => reject(new Error(`Ошибка чтения: ${storeName}/${indexName}`))
    })
  }

  async getAllByIndex<T>(
    storeName: StoreName,
    indexName: string,
    key: IDBValidKey,
  ): Promise<T[]> {
    const store = await this.getStore(storeName)
    if (!this.hasIndex(store, indexName)) {
      const all = await this.getAll<Record<string, unknown>>(storeName)
      return all.filter((item) => item[indexName] === key) as T[]
    }

    return new Promise((resolve, reject) => {
      const request = store.index(indexName).getAll(key)
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(new Error(`Ошибка чтения: ${storeName}/${indexName}`))
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
    await this.clear(STORES.savings)
    await this.clear(STORES.settings)
  }
}

export const db = new IndexedDBService()
export { STORES }
