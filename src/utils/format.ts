import { translateKey } from '../i18n/I18nContext'
import { getGlobalLocale } from '../i18n/localeStore'
import type { Locale } from '../i18n/types'
import { CURRENCIES } from '../constants/categories'

const INTL_LOCALES: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  az: 'az-AZ',
}

function getIntlLocale(): string {
  return INTL_LOCALES[getGlobalLocale()] ?? 'ru-RU'
}

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code
}

export function formatAmount(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode)
  const formatted = new Intl.NumberFormat(getIntlLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  return `${symbol}${formatted}`
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function formatCompactDate(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}.${mm}.${yy}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat(getIntlLocale(), {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat(getIntlLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return translateKey('common.today')
  if (date.toDateString() === yesterday.toDateString()) return translateKey('common.yesterday')

  return new Intl.DateTimeFormat(getIntlLocale(), {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  }).format(date)
}

export function toInputDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

/** Parse YYYY-MM-DD as local noon to avoid UTC off-by-one day shifts. */
export function parseInputDateToISO(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return new Date().toISOString()
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString()
}

export function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

export function formatPeriodName(date: Date = new Date()): string {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    month: 'long',
    year: 'numeric',
  }).format(date)
}
