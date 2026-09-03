import PocketBase, { ClientResponseError } from 'pocketbase'
import { getPocketBaseUrl } from './runtimeConfig'

let pb: PocketBase | null = null

function createClient(url: string): PocketBase {
  const client = new PocketBase(url.replace(/\/$/, ''))
  client.autoCancellation(false)
  return client
}

export function getPb(): PocketBase {
  if (!pb) {
    pb = createClient(getPocketBaseUrl())
  }
  return pb
}

export function initPocketBaseClient(url?: string): PocketBase {
  const nextUrl = (url ?? getPocketBaseUrl()).replace(/\/$/, '')
  if (pb && pb.baseUrl.replace(/\/$/, '') === nextUrl) {
    return pb
  }
  pb = createClient(nextUrl)
  return pb
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof ClientResponseError) {
    return err.status === 0
  }
  if (err instanceof TypeError) return true
  if (err instanceof Error) {
    return (
      err.message === 'errors.network.offline' ||
      err.message === 'errors.network.mobilePocketBase' ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError') ||
      err.message.includes('ERR_CONNECTION')
    )
  }
  return false
}

function isAuthFailure(err: unknown): boolean {
  if (err instanceof ClientResponseError) {
    return err.status === 401 || err.status === 403
  }
  return false
}

/** Returns false when PocketBase is unreachable. */
export async function pingPocketBase(): Promise<boolean> {
  try {
    const response = await fetch(`${getPocketBaseUrl()}/api/health`, {
      method: 'GET',
      cache: 'no-store',
    })
    return response.ok
  } catch {
    return false
  }
}

export async function refreshAuth(): Promise<boolean> {
  const client = getPb()
  if (!client.authStore.isValid) return false

  try {
    await client.collection('users').authRefresh()
    return true
  } catch (err) {
    if (isAuthFailure(err)) {
      client.authStore.clear()
      return false
    }
    // Keep cached session on transient network errors.
    return client.authStore.isValid
  }
}

export function subscribeAuthStore(
  listener: (token: string, record: PocketBase['authStore']['record']) => void,
): () => void {
  return getPb().authStore.onChange(listener)
}
