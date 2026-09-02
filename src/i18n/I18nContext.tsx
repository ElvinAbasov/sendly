import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getGlobalLocale, initGlobalLocale, setGlobalLocale } from './localeStore'
import { translations } from './translations'
import type { Locale, TranslationDict } from './types'

type Params = Record<string, string | number>

function getByPath(dict: TranslationDict, path: string): string | undefined {
  const parts = path.split('.')
  let current: unknown = dict
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    params[key] != null ? String(params[key]) : `{{${key}}}`,
  )
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Params) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => initGlobalLocale())

  const setLocale = useCallback((next: Locale) => {
    setGlobalLocale(next)
    setLocaleState(next)
  }, [])

  const t = useCallback(
    (key: string, params?: Params) => {
      const dict = translations[locale] ?? translations.ru
      const value = getByPath(dict, key) ?? getByPath(translations.ru, key) ?? key
      return interpolate(value, params)
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export function useTranslation() {
  return useI18n()
}

export function translateKey(key: string, params?: Params, locale = getGlobalLocale()): string {
  const dict = translations[locale] ?? translations.ru
  const value = getByPath(dict, key) ?? getByPath(translations.ru, key) ?? key
  return interpolate(value, params)
}
