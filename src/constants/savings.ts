export const SAVING_ICONS = [
  '💰',
  '📱',
  '✈️',
  '🏠',
  '🚗',
  '💍',
  '🎓',
  '🎁',
  '💻',
  '🏖️',
  '👶',
  '🛡️',
  '🎯',
  '💎',
  '🎮',
  '📚',
] as const

export type SavingIcon = (typeof SAVING_ICONS)[number]

export function getSavingTransactionLabel(
  type: string,
  t: (key: string) => string,
): string {
  const key = `transactionTypes.${type}`
  const translated = t(key)
  return translated !== key ? translated : type
}
