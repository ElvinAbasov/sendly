import PocketBase from 'pocketbase'
import { POCKETBASE_URL } from '../constants/app'

export const pb = new PocketBase(POCKETBASE_URL)

pb.autoCancellation(false)

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
