import type { HistoryTypeFilter } from '../../types'

const FILTERS: {
  value: HistoryTypeFilter
  label: string
  modifier?: string
}[] = [
  { value: 'all', label: 'Все' },
  { value: 'income', label: 'Доходы', modifier: 'income' },
  { value: 'expense', label: 'Расходы', modifier: 'expense' },
  { value: 'savings', label: 'Накопления', modifier: 'savings' },
]

interface HistoryTypeFiltersProps {
  value: HistoryTypeFilter
  onChange: (value: HistoryTypeFilter) => void
}

export function HistoryTypeFilters({ value, onChange }: HistoryTypeFiltersProps) {
  return (
    <div className="history-type-filters" role="tablist" aria-label="Тип операций">
      {FILTERS.map((filter) => {
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
