import type { Locale } from '../types'
import { ru } from './ru'
import { en } from './en'
import { az } from './az'

type DeepStringRecord<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepStringRecord<T[K]> : string
}

export type TranslationDict = DeepStringRecord<typeof ru>

export const translations: Record<Locale, TranslationDict> = {
  ru,
  en,
  az,
}

export { ru, en, az }
