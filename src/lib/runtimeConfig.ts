import { getStoredServerUrl } from './serverConfig'

const DEFAULT_POCKETBASE_URL =
  import.meta.env.VITE_POCKETBASE_URL?.trim() || 'http://127.0.0.1:8090'

let pocketBaseUrl = DEFAULT_POCKETBASE_URL.replace(/\/$/, '')

export function getPocketBaseUrl(): string {
  return pocketBaseUrl
}

export function setPocketBaseUrl(url: string): string {
  pocketBaseUrl = url.trim().replace(/\/$/, '')
  return pocketBaseUrl
}

export function isLocalPocketBaseUrl(url = pocketBaseUrl): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url)
}

export async function loadRuntimeConfig(): Promise<string> {
  const storedUrl = await getStoredServerUrl()
  if (storedUrl) {
    pocketBaseUrl = storedUrl
    return pocketBaseUrl
  }

  try {
    const base = import.meta.env.BASE_URL || '/'
    const normalizedBase = base.endsWith('/') ? base : `${base}/`
    const response = await fetch(`${normalizedBase}config.json?v=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!response.ok) return pocketBaseUrl

    const data = (await response.json()) as { pocketbaseUrl?: string }
    const runtimeUrl = data.pocketbaseUrl?.trim()
    if (runtimeUrl) {
      pocketBaseUrl = runtimeUrl.replace(/\/$/, '')
    }
  } catch {
    // config.json optional for local dev / native bundle
  }

  return pocketBaseUrl
}
