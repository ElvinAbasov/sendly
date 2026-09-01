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

export const SAVING_TRANSACTION_LABELS: Record<string, string> = {
  saving_deposit: 'Пополнение',
  saving_withdraw: 'Снятие',
  saving_transfer: 'Перевод',
}
