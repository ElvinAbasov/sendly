import PocketBase from 'pocketbase'
import { getPocketBaseUrl } from './runtimeConfig'

let pb = new PocketBase(getPocketBaseUrl())
pb.autoCancellation(false)

export function getPb(): PocketBase {
  return pb
}

export function initPocketBaseClient(url?: string): PocketBase {
  pb = new PocketBase((url ?? getPocketBaseUrl()).replace(/\/$/, ''))
  pb.autoCancellation(false)
  return pb
}

export async function refreshAuth(): Promise<boolean> {
  if (!pb.authStore.isValid) return false
  try {
    await pb.collection('users').authRefresh()
    return true
  } catch {
    pb.authStore.clear()
    return false
  }
}
