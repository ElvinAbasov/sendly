import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useI18n } from '../../i18n/I18nContext'

export interface SelectSheetOption {
  value: string
  label: string
  emoji?: string
}

export interface SelectSheetProps {
  value: string
  onChange: (value: string) => void
  options: SelectSheetOption[]
  label?: string
  placeholder?: string
  sheetTitle?: string
  error?: string
  disabled?: boolean
  size?: 'md' | 'sm'
  searchable?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  leadingIcon?: string
  footer?: ReactNode | ((select: (value: string) => void) => ReactNode)
  children?: ReactNode | ((select: (value: string) => void) => ReactNode)
  emptyText?: string
}

function getSelectedOption(options: SelectSheetOption[], value: string) {
  return options.find((opt) => opt.value === value)
}

export function SelectSheet({
  value,
  onChange,
  options,
  label,
  placeholder,
  sheetTitle,
  error,
  disabled = false,
  size = 'md',
  searchable,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  leadingIcon = '📋',
  footer,
  children,
  emptyText,
}: SelectSheetProps) {
  const { t } = useI18n()
  const resolvedPlaceholder = placeholder ?? t('categories.selectPlaceholder')
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('common.search')
  const resolvedEmptyText = emptyText ?? t('empty.savingsNotFound')
  const [open, setOpen] = useState(false)
  const [internalSearch, setInternalSearch] = useState('')

  const search = searchValue ?? internalSearch
  const setSearch = onSearchChange ?? setInternalSearch

  const selected = getSelectedOption(options, value)
  const showSearch = searchable ?? options.length > 6
  const title = sheetTitle ?? label ?? resolvedPlaceholder

  const filteredOptions = useMemo(() => {
    if (children) return options
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [options, search, children])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      if (onSearchChange) onSearchChange('')
      else setInternalSearch('')
    }
  }, [open, onSearchChange])

  const displayIcon = selected?.emoji ?? leadingIcon
  const displayText = selected?.label ?? resolvedPlaceholder

  const handleSelect = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  const listContent =
    typeof children === 'function'
      ? children(handleSelect)
      : children ??
        (filteredOptions.length === 0 ? (
          <p className="category-sheet__empty">{resolvedEmptyText}</p>
        ) : (
          filteredOptions.map((opt) => {
            const isActive = value === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                className={`category-sheet-item${isActive ? ' category-sheet-item--active' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                <span className="category-sheet-item__emoji">{opt.emoji ?? leadingIcon}</span>
                <span className="category-sheet-item__label">{opt.label}</span>
                {isActive && (
                  <span className="category-sheet-item__check">
                    <Check size={18} strokeWidth={2.5} />
                  </span>
                )}
              </button>
            )
          })
        ))

  const sheet = open ? (
    <div className="category-sheet-root">
      <button
        type="button"
        className="category-sheet-overlay"
        aria-label={t('common.close')}
        onClick={() => setOpen(false)}
      />
      <div className="category-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="category-sheet__header">
          <h3 className="category-sheet__title">{title}</h3>
          <button
            type="button"
            className="category-sheet__close"
            onClick={() => setOpen(false)}
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        {showSearch && (
          <div className="category-sheet__search">
            <div className="category-sheet__search-field">
              <Search size={18} className="category-sheet__search-icon" aria-hidden />
              <input
                className="category-sheet__search-input"
                placeholder={resolvedSearchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="category-sheet__list">{listContent}</div>

        {footer && (
          <div className="category-sheet__footer">
            {typeof footer === 'function' ? footer(handleSelect) : footer}
          </div>
        )}
      </div>
    </div>
  ) : null

  return (
    <div
      className={[
        'category-select',
        size === 'sm' ? 'category-select--sm' : '',
        error ? 'category-select--error' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && <span className="input-group__label">{label}</span>}

      <button
        type="button"
        className={`category-select__trigger${open ? ' category-select__trigger--open' : ''}`}
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="category-select__emoji">{displayIcon}</span>
        <span className="category-select__text">{displayText}</span>
        <ChevronDown
          size={18}
          className={`category-select__chevron${open ? ' category-select__chevron--open' : ''}`}
        />
      </button>

      {error && <span className="input-group__error">{error}</span>}

      {sheet && createPortal(sheet, document.body)}
    </div>
  )
}

export function SelectSheetItem({
  active,
  emoji,
  label,
  onClick,
}: {
  active?: boolean
  emoji?: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`category-sheet-item${active ? ' category-sheet-item--active' : ''}`}
      onClick={onClick}
    >
      {emoji && <span className="category-sheet-item__emoji">{emoji}</span>}
      <span className="category-sheet-item__label">{label}</span>
      {active && (
        <span className="category-sheet-item__check">
          <Check size={18} strokeWidth={2.5} />
        </span>
      )}
    </button>
  )
}
