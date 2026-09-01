import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  CATEGORY_ICONS,
} from '../constants/categories'
import type { CustomCategories } from '../types'

export type CategoryKind = 'expense' | 'income'

export function getExpenseCategories(custom?: CustomCategories): string[] {
  const merged = [...EXPENSE_CATEGORIES, ...(custom?.expense ?? [])]
  return [...new Set(merged)]
}

export function getIncomeCategories(custom?: CustomCategories): string[] {
  const merged = [...INCOME_CATEGORIES, ...(custom?.income ?? [])]
  return [...new Set(merged)]
}

export function getCategoriesForKind(
  kind: CategoryKind,
  custom?: CustomCategories,
): string[] {
  return kind === 'expense'
    ? getExpenseCategories(custom)
    : getIncomeCategories(custom)
}

export function getCategoryIcon(
  name: string,
  customIcons?: Record<string, string>,
): string {
  return customIcons?.[name] ?? CATEGORY_ICONS[name] ?? '📦'
}

export function isCategoryValidForKind(
  category: string,
  kind: CategoryKind,
  custom?: CustomCategories,
): boolean {
  return getCategoriesForKind(kind, custom).includes(category)
}

export function getDefaultCategory(
  kind: CategoryKind,
  custom?: CustomCategories,
): string {
  return getCategoriesForKind(kind, custom)[0] ?? 'Другое'
}

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function isCategoryNameTaken(
  name: string,
  kind: CategoryKind,
  custom?: CustomCategories,
): boolean {
  const normalized = normalizeCategoryName(name).toLowerCase()
  return getCategoriesForKind(kind, custom).some(
    (c) => c.toLowerCase() === normalized,
  )
}
