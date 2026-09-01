import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { CategorySelect, getDefaultCategory } from '../components/ui/CategorySelect'
import { Select } from '../components/ui/Select'
import { HistoryTypeFilters } from '../components/history/HistoryTypeFilters'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { AmountInput } from '../components/ui/AmountInput'
import { TransactionItem } from '../components/transactions/TransactionItem'
import { isCategoryValidForKind } from '../utils/categories'
import { formatDateGroup, parseAmount, parseInputDateToISO } from '../utils/format'
import type { Transaction, TransactionType, HistoryTypeFilter } from '../types'
import { isSavingTransaction } from '../utils/savings'

export function History() {
  const {
    user,
    periods,
    activePeriod,
    allTransactions,
    savingGoals,
    updateTransaction,
    removeTransaction,
    settings,
  } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all')
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('current')
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({
    amount: '',
    category: '',
    title: '',
    note: '',
    date: '',
    type: 'expense' as TransactionType,
  })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId) {
      const tx = allTransactions.find((t) => t.id === editId)
      if (tx && tx.type !== 'income' && tx.type !== 'expense') {
        setSearchParams({}, { replace: true })
        return
      }
      if (tx) {
        setEditingTx(tx)
        setEditForm({
          amount: tx.amount.toString(),
          category: tx.category,
          title: tx.title,
          note: tx.note,
          date: tx.date.split('T')[0],
          type: tx.type,
        })
        setEditErrors({})
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, allTransactions, setSearchParams])

  const periodOptions = useMemo(
    () => [
      {
        value: 'current',
        label: activePeriod?.name ?? 'Текущий',
      },
      { value: 'all', label: 'Все периоды' },
      ...periods
        .filter((p) => p.id !== activePeriod?.id)
        .map((p) => ({ value: p.id, label: p.name })),
    ],
    [periods, activePeriod],
  )

  const savingNames = useMemo(
    () => Object.fromEntries(savingGoals.map((g) => [g.id, g.name])),
    [savingGoals],
  )

  const filtered = useMemo(() => {
    let txs = [...allTransactions]

    if (periodFilter === 'current' && activePeriod) {
      txs = txs.filter((t) => t.periodId === activePeriod.id)
    } else if (periodFilter !== 'all' && periodFilter !== 'current') {
      txs = txs.filter((t) => t.periodId === periodFilter)
    }

    if (typeFilter === 'income') {
      txs = txs.filter((t) => t.type === 'income')
    } else if (typeFilter === 'expense') {
      txs = txs.filter((t) => t.type === 'expense')
    } else if (typeFilter === 'savings') {
      txs = txs.filter((t) => isSavingTransaction(t.type))
    }

    if (expenseCategoryFilter !== 'all' || incomeCategoryFilter !== 'all') {
      txs = txs.filter((t) => {
        if (t.type === 'expense') {
          return expenseCategoryFilter === 'all' || t.category === expenseCategoryFilter
        }
        if (t.type === 'income') {
          return incomeCategoryFilter === 'all' || t.category === incomeCategoryFilter
        }
        return true
      })
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      txs = txs.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.note.toLowerCase().includes(q),
      )
    }

    return txs.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  }, [allTransactions, periodFilter, activePeriod, typeFilter, expenseCategoryFilter, incomeCategoryFilter, search])

  const grouped = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    for (const tx of filtered) {
      const key = tx.date.split('T')[0]
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(tx)
    }
    return Array.from(groups.entries())
  }, [filtered])

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setEditForm({
      amount: tx.amount.toString(),
      category: tx.category,
      title: tx.title,
      note: tx.note,
      date: tx.date.split('T')[0],
      type: tx.type,
    })
    setEditErrors({})
  }

  const handleSaveEdit = async () => {
    if (!editingTx || saving) return
    const errors: Record<string, string> = {}
    const parsed = parseAmount(editForm.amount)
    if (!editForm.amount || parsed <= 0) errors.amount = 'Введите сумму больше 0'
    if (!editForm.title.trim()) errors.title = 'Введите название'
    setEditErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      await updateTransaction({
        ...editingTx,
        type: editForm.type,
        amount: parsed,
        category: editForm.category,
        title: editForm.title.trim(),
        note: editForm.note.trim(),
        date: parseInputDateToISO(editForm.date),
      })
      setEditingTx(null)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTx || saving) return
    setSaving(true)
    try {
      await removeTransaction(deleteTx.id)
      setDeleteTx(null)
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const setEditType = (type: TransactionType) => {
    const kind = type === 'expense' ? 'expense' : 'income'
    setEditForm({
      ...editForm,
      type,
      category: isCategoryValidForKind(editForm.category, kind, settings.customCategories)
        ? editForm.category
        : getDefaultCategory(kind, settings.customCategories),
    })
  }

  return (
    <div className="page history-page">
      <header className="page__header">
        <h1 className="page__title">История</h1>
      </header>

      <div className="search-bar">
        <Search size={18} className="search-bar__icon" />
        <input
          className="search-bar__input"
          placeholder="Поиск операций..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="history-filters">
        <HistoryTypeFilters value={typeFilter} onChange={setTypeFilter} />

        {(typeFilter === 'all' || typeFilter === 'expense' || typeFilter === 'income') && (
          <div className="history-filters__categories">
            {(typeFilter === 'all' || typeFilter === 'expense') && (
              <CategorySelect
                label="Расходы"
                mode="expense"
                size="sm"
                value={expenseCategoryFilter}
                onChange={setExpenseCategoryFilter}
                placeholder="Все"
                allowAllOption
                allOptionLabel="Все расходы"
              />
            )}

            {(typeFilter === 'all' || typeFilter === 'income') && (
              <CategorySelect
                label="Доходы"
                mode="income"
                size="sm"
                value={incomeCategoryFilter}
                onChange={setIncomeCategoryFilter}
                placeholder="Все"
                allowAllOption
                allOptionLabel="Все доходы"
              />
            )}
          </div>
        )}

        <Select
          label="Период"
          size="sm"
          value={periodFilter}
          onChange={setPeriodFilter}
          sheetTitle="Период"
          placeholder="Выберите период"
          leadingIcon="📅"
          options={periodOptions.map((opt) => ({
            ...opt,
            emoji: opt.value === 'all' ? '📋' : opt.value === 'current' ? '📅' : '🗓️',
          }))}
        />
      </div>

      {grouped.length === 0 ? (
        <Card>
          <p className="empty-text">Операции не найдены</p>
        </Card>
      ) : (
        grouped.map(([date, txs]) => (
          <section key={date}>
            <h3 className="date-group-title">{formatDateGroup(date)}</h3>
            <Card padding="sm" className="tx-list-card">
              {txs.map((tx) => (
                <div key={tx.id} className="tx-item-wrapper">
                  <TransactionItem
                    transaction={tx}
                    currency={user.currency}
                    savingNames={savingNames}
                  />
                  {!isSavingTransaction(tx.type) && (
                    <div className="tx-item-actions">
                      <button onClick={() => openEdit(tx)} aria-label="Редактировать">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setDeleteTx(tx)} aria-label="Удалить">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          </section>
        ))
      )}

      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} title="Редактировать">
        <div className="edit-form">
          <div className="type-toggle type-toggle--sm">
            <button
              className={`type-toggle__btn ${editForm.type === 'expense' ? 'type-toggle__btn--active type-toggle__btn--expense' : ''}`}
              onClick={() => setEditType('expense')}
            >
              Расход
            </button>
            <button
              className={`type-toggle__btn ${editForm.type === 'income' ? 'type-toggle__btn--active type-toggle__btn--income' : ''}`}
              onClick={() => setEditType('income')}
            >
              Доход
            </button>
          </div>
          <AmountInput
            value={editForm.amount}
            onChange={(v) => setEditForm({ ...editForm, amount: v })}
            currency={user.currency}
            error={editErrors.amount}
          />
          <CategorySelect
            label="Категория"
            mode={editForm.type === 'expense' ? 'expense' : 'income'}
            value={editForm.category}
            onChange={(category) => setEditForm({ ...editForm, category })}
            allowCreate
          />
          <Input
            label="Название"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            error={editErrors.title}
          />
          <Input
            label="Комментарий"
            value={editForm.note}
            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
          />
          <Input
            label="Дата"
            type="date"
            value={editForm.date}
            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
          />
          <Button fullWidth onClick={handleSaveEdit} loading={saving}>
            Сохранить
          </Button>
        </div>
      </Modal>

      <Modal open={!!deleteTx} onClose={() => setDeleteTx(null)} title="Удалить операцию?">
        <p className="modal-text">
          Вы уверены, что хотите удалить «{deleteTx?.title}»? Это действие нельзя отменить.
        </p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setDeleteTx(null)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={saving}>
            Удалить
          </Button>
        </div>
      </Modal>
    </div>
  )
}
