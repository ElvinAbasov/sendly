/** Публичный адрес приложения (GitHub Pages). */
export const APP_PUBLIC_URL = 'https://elvinabasov.github.io/sendly/'

/** PocketBase API (задаётся через VITE_POCKETBASE_URL при сборке). */
export const POCKETBASE_URL =
  import.meta.env.VITE_POCKETBASE_URL?.trim() || 'http://127.0.0.1:8090'

/** APK для Android (GitHub Releases). Обновляется автоматически после сборки в Actions. */
export const APP_APK_DOWNLOAD_URL =
  'https://github.com/ElvinAbasov/sendly/releases/download/apk/Spendly.apk'

export const APP_GITHUB_URL = 'https://github.com/ElvinAbasov/sendly'

export const APP_APK_RELEASE_URL = 'https://github.com/ElvinAbasov/sendly/releases/tag/apk'

/** Публичная страница скачивания (GitHub Pages). */
export const APP_DOWNLOAD_PAGE_URL = `${APP_PUBLIC_URL}download`

export interface ProductCard {
  id: string
  name: string
  description: string
  emoji: string
}

export const PRODUCTS: ProductCard[] = [
  {
    id: 'spendly',
    name: 'Spendly',
    description: 'Учёт доходов, расходов и копилок. Простой финансовый помощник.',
    emoji: '💰',
  },
]
