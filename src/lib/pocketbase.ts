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

function isAuthFailure(err: unknown): boolean {
  if (err instanceof ClientResponseError) {
    return err.status === 401 || err.status === 403
  }
  return false
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
