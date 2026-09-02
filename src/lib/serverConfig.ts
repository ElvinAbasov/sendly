import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const STORAGE_KEY = 'spendly:pocketbase-url'

export async function getStoredServerUrl(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null
  const { value } = await Preferences.get({ key: STORAGE_KEY })
  const trimmed = value?.trim()
  return trimmed ? trimmed.replace(/\/$/, '') : null
}

export async function setStoredServerUrl(url: string): Promise<void> {
  const normalized = url.trim().replace(/\/$/, '')
  await Preferences.set({ key: STORAGE_KEY, value: normalized })
}

export async function clearStoredServerUrl(): Promise<void> {
  await Preferences.remove({ key: STORAGE_KEY })
}
