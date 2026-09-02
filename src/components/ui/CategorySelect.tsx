import { useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import {
  getCategoriesForKind,
  getCategoryIcon,
  getDefaultCategory,
  getExpenseCategories,
  getIncomeCategories,
  isCategoryNameTaken,
  normalizeCategoryName,
  type CategoryKind,
} from '../../utils/categories'
import { SelectSheet } from './SelectSheet'
import type { CategorySelectMode } from '../../types'

export interface CategorySelectProps {
  value: string
  onChange: (category: string) => void
  mode: CategorySelectMode
  label?: string
  placeholder?: string
  error?: string
  allowCreate?: boolean
  allowAllOption?: boolean
  allOptionValue?: string
  allOptionLabel?: string
  disabled?: boolean
  size?: 'md' | 'sm'
}

interface CategoryGroup {
  id: CategoryKind
  title: string
  items: string[]
}

export function CategorySelect({
  value,
  onChange,
  mode,
  label,
  placeholder,
  error,
  allowCreate = false,
  allowAllOption = false,
  allOptionValue = 'all',
  allOptionLabel,
  disabled = false,
  size = 'md',
}: CategorySelectProps) {
  const { t } = useI18n()
  const { settings, addCustomCategory } = useApp()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState('')
  const [search, setSearch] = useState('')

  const custom = settings.customCategories
  const customIcons = settings.customCategoryIcons

  const resolvedPlaceholder = placeholder ?? t('categories.selectPlaceholder')
  const resolvedAllOptionLabel = allOptionLabel ?? t('categories.allCategories')

  const groups = useMemo((): CategoryGroup[] => {
    if (mode === 'income') {
      return [{ id: 'income', title: t('categories.incomeGroup'), items: getIncomeCategories(custom) }]
    }
    return [{ id: 'expense', title: t('categories.expenseGroup'), items: getExpenseCategories(custom) }]
  }, [mode, custom, t])

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, search])

  const sheetTitle = mode === 'income' ? t('categories.incomeSheetTitle') : t('categories.expenseSheetTitle')

  const triggerOptions = useMemo(() => {
    if (allowAllOption && value === allOptionValue) {
      return [{ value: allOptionValue, label: resolvedAllOptionLabel, emoji: '📋' }]
    }
    if (value) {
      return [{ value, label: value, emoji: getCategoryIcon(value, customIcons) }]
    }
    return []
  }, [allowAllOption, value, allOptionValue, resolvedAllOptionLabel, customIcons])

  return (
    <SelectSheet
      value={value}
      onChange={onChange}
      options={triggerOptions}
      label={label}
      placeholder={resolvedPlaceholder}
      sheetTitle={sheetTitle}
      error={error}
      disabled={disabled}
      size={size}
      searchable
      leadingIcon="📂"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={t('categories.searchPlaceholder')}
      emptyText={t('categories.notFound')}
      footer={
        allowCreate
          ? (select) => {
              const handleCreate = async () => {
                const name = normalizeCategoryName(newName)
                if (!name) {
                  setCreateError(t('validation.categoryNameRequired'))
                  return
                }
                if (isCategoryNameTaken(name, mode, custom)) {
                  setCreateError(t('validation.categoryExists'))
                  return
                }

                await addCustomCategory(mode, name)
                select(name)
                setCreating(false)
                setNewName('')
                setCreateError('')
              }

              return creating ? (
                <div className="category-sheet-create">
                  <input
                    className="category-sheet-create__input"
                    placeholder={t('categories.namePlaceholder')}
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value)
                      setCreateError('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  {createError && <span className="input-group__error">{createError}</span>}
                  <div className="category-sheet-create__actions">
                    <button
                      type="button"
                      className="category-sheet-create__cancel"
                      onClick={() => {
                        setCreating(false)
                        setNewName('')
                        setCreateError('')
                      }}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      className="category-sheet-create__submit"
                      onClick={handleCreate}
                    >
                      {t('common.create')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="category-sheet-create-btn"
                  onClick={() => setCreating(true)}
                >
                  <Plus size={18} />
                  {t('categories.createCategory')}
                </button>
              )
            }
          : undefined
      }
    >
      {(select) => (
        <>
          {allowAllOption && !search.trim() && (
            <button
              type="button"
              className={`category-sheet-item${value === allOptionValue ? ' category-sheet-item--active' : ''}`}
              onClick={() => select(allOptionValue)}
            >
              <span className="category-sheet-item__emoji">📋</span>
              <span className="category-sheet-item__label">{resolvedAllOptionLabel}</span>
              {value === allOptionValue && (
                <span className="category-sheet-item__check">
                  <Check size={18} strokeWidth={2.5} />
                </span>
              )}
            </button>
          )}

          {filteredGroups.length === 0 ? (
            <p className="category-sheet__empty">{t('categories.notFound')}</p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="category-sheet-group">
                {group.items.map((item) => {
                  const isActive = value === item
                  return (
                    <button
                      key={`${group.id}-${item}`}
                      type="button"
                      className={`category-sheet-item${isActive ? ' category-sheet-item--active' : ''}`}
                      onClick={() => select(item)}
                    >
                      <span className="category-sheet-item__emoji">
                        {getCategoryIcon(item, customIcons)}
                      </span>
                      <span className="category-sheet-item__label">{item}</span>
                      {isActive && (
                        <span className="category-sheet-item__check">
                          <Check size={18} strokeWidth={2.5} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </>
      )}
    </SelectSheet>
  )
}

export { getDefaultCategory, getCategoriesForKind }
