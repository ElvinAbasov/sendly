import type { HistoryTypeFilter } from '../../types'
import { useI18n } from '../../i18n/I18nContext'

interface HistoryTypeFiltersProps {
  value: HistoryTypeFilter
  onChange: (value: HistoryTypeFilter) => void
}

export function HistoryTypeFilters({ value, onChange }: HistoryTypeFiltersProps) {
  const { t } = useI18n()

  const filters: {
    value: HistoryTypeFilter
    label: string
    modifier?: string
  }[] = [
    { value: 'all', label: t('historyFilters.all') },
    { value: 'income', label: t('historyFilters.income'), modifier: 'income' },
    { value: 'expense', label: t('historyFilters.expense'), modifier: 'expense' },
    { value: 'savings', label: t('historyFilters.savings'), modifier: 'savings' },
  ]

  return (
    <div className="history-type-filters" role="tablist" aria-label={t('history.typeFilterAria')}>
      {filters.map((filter) => {
        const isActive = value === filter.value
        return (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={[
              'history-type-filters__btn',
              isActive ? 'history-type-filters__btn--active' : '',
              filter.modifier ? `history-type-filters__btn--${filter.modifier}` : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(filter.value)}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
