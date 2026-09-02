import type { Locale } from './types'

const STORAGE_KEY = 'spendly:locale'

let currentLocale: Locale = 'ru'

export function getStoredLocale(): Locale {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'ru' || value === 'en' || value === 'az') return value
  } catch {
    // ignore
  }
  return 'ru'
}

export function getGlobalLocale(): Locale {
  return currentLocale
}

export function setGlobalLocale(locale: Locale): void {
  currentLocale = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // ignore
  }
  document.documentElement.lang = locale
}

export function initGlobalLocale(): Locale {
  const locale = getStoredLocale()
  setGlobalLocale(locale)
  return locale
}
