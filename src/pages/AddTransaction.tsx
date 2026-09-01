import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { AmountInput } from '../components/ui/AmountInput'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_ICONS } from '../constants/categories'
import { parseAmount, toInputDate } from '../utils/format'
import type { TransactionType } from '../types'

export function AddTransaction() {
  const navigate = useNavigate()
  const { user, activePeriod, addTransaction } = useApp()

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(toInputDate())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCategory(type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0])
  }, [type])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    const parsed = parseAmount(amount)

    if (!amount || parsed <= 0) {
      newErrors.amount = 'Введите сумму больше 0'
    }
    if (!title.trim()) {
      newErrors.title = 'Введите название'
    }
    if (!category) {
      newErrors.category = 'Выберите категорию'
    }
    if (!date) {
      newErrors.date = 'Выберите дату'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate() || saving) return

    setSaving(true)
    try {
      await addTransaction({
        type,
        amount: parseAmount(amount),
        category,
        title: title.trim(),
        note: note.trim(),
        date: new Date(date).toISOString(),
      })
      navigate('/')
    } catch (err) {
      console.error(err)
      setErrors({ form: 'Ошибка сохранения. Попробуйте снова.' })
    } finally {
      setSaving(false)
    }
  }

  if (!user || !activePeriod) return null

  return (
    <div className="page add-page">
      <header className="page__header page__header--row">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={22} />
        </button>
        <h1 className="page__title">Новая операция</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="type-toggle">
        <button
          className={`type-toggle__btn ${type === 'expense' ? 'type-toggle__btn--active type-toggle__btn--expense' : ''}`}
          onClick={() => setType('expense')}
        >
          Расход
        </button>
        <button
          className={`type-toggle__btn ${type === 'income' ? 'type-toggle__btn--active type-toggle__btn--income' : ''}`}
          onClick={() => setType('income')}
        >
          Доход
        </button>
      </div>

      <AmountInput
        value={amount}
        onChange={setAmount}
        currency={user.currency}
        error={errors.amount}
      />

      <div className="category-grid">
        {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
          <button
            key={cat}
            className={`category-chip ${category === cat ? 'category-chip--active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            <span className="category-chip__emoji">{CATEGORY_ICONS[cat]}</span>
            {cat}
          </button>
        ))}
      </div>
      {errors.category && <span className="input-group__error">{errors.category}</span>}

      <Input
        label="Название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Например: Обед в кафе"
        error={errors.title}
      />

      <Input
        label="Комментарий"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Необязательно"
      />

      <Input
        label="Дата"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
      />

      {errors.form && <span className="input-group__error">{errors.form}</span>}

      <Button fullWidth size="lg" onClick={handleSave} loading={saving}>
        Сохранить
      </Button>
    </div>
  )
}
