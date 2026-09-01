export const EXPENSE_CATEGORIES = [
  'Еда',
  'Транспорт',
  'Покупки',
  'Развлечения',
  'Здоровье',
  'Образование',
  'Работа',
  'Другое',
] as const

export const INCOME_CATEGORIES = [
  'Зарплата',
  'Работа',
  'Продажи',
  'Подарок',
  'Инвестиции',
  'Другое',
] as const

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'Доллар США' },
  { code: 'EUR', symbol: '€', name: 'Евро' },
  { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
  { code: 'GBP', symbol: '£', name: 'Фунт стерлингов' },
  { code: 'KZT', symbol: '₸', name: 'Казахстанский тенге' },
  { code: 'UZS', symbol: 'сум', name: 'Узбекский сум' },
  { code: 'AED', symbol: 'د.إ', name: 'Дирхам ОАЭ' },
] as const

export const CATEGORY_ICONS: Record<string, string> = {
  Еда: '🍔',
  Транспорт: '🚗',
  Покупки: '🛍️',
  Развлечения: '🎬',
  Здоровье: '💊',
  Образование: '📚',
  Работа: '💼',
  Другое: '📦',
  Зарплата: '💰',
  Продажи: '🏷️',
  Подарок: '🎁',
  Инвестиции: '📈',
}
