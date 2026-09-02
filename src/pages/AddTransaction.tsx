import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { AmountInput } from '../components/ui/AmountInput'
import { CategorySelect, getDefaultCategory } from '../components/ui/CategorySelect'
import { useI18n } from '../i18n/I18nContext'
import { isCategoryValidForKind } from '../utils/categories'
import { parseAmount, toInputDate, parseInputDateToISO } from '../utils/format'
import type { TransactionType } from '../types'

export function AddTransaction() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { user, activePeriod, addTransaction, settings } = useApp()

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(toInputDate())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const kind = type === 'expense' ? 'expense' : 'income'
    setCategory((current) =>
      isCategoryValidForKind(current, kind, settings.customCategories)
        ? current
        : getDefaultCategory(kind, settings.customCategories),
    )
  }, [type, settings.customCategories])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    const parsed = parseAmount(amount)

    if (!amount || parsed <= 0) {
      newErrors.amount = t('validation.amountRequired')
    }
    if (!title.trim()) {
      newErrors.title = t('validation.titleRequired')
    }
    if (!category) {
      newErrors.category = t('validation.categoryRequired')
    }
    if (!date) {
      newErrors.date = t('validation.dateRequired')
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
        date: parseInputDateToISO(date),
      })
      navigate('/')
    } catch (err) {
      console.error(err)
      setErrors({ form: t('addTransaction.saveError') })
    } finally {
      setSaving(false)
    }
  }

  if (!user || !activePeriod) return null

  return (
    <div className="page add-page">
      <header className="page__header page__header--row">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="page__title">{t('addTransaction.title')}</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="type-toggle">
        <button
          className={`type-toggle__btn ${type === 'expense' ? 'type-toggle__btn--active type-toggle__btn--expense' : ''}`}
          onClick={() => setType('expense')}
        >
          {t('addTransaction.expense')}
        </button>
        <button
          className={`type-toggle__btn ${type === 'income' ? 'type-toggle__btn--active type-toggle__btn--income' : ''}`}
          onClick={() => setType('income')}
        >
          {t('addTransaction.income')}
        </button>
      </div>

      <AmountInput
        value={amount}
        onChange={setAmount}
        currency={user.currency}
        error={errors.amount}
      />

      <CategorySelect
        label={t('common.category')}
        mode={type === 'expense' ? 'expense' : 'income'}
        value={category}
        onChange={setCategory}
        allowCreate
        error={errors.category}
      />

      <Input
        label={t('addTransaction.titleLabel')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('addTransaction.titlePlaceholder')}
        error={errors.title}
      />

      <Input
        label={t('addTransaction.commentLabel')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('common.optional')}
      />

      <Input
        label={t('addTransaction.dateLabel')}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
      />

      {errors.form && <span className="input-group__error">{errors.form}</span>}

      <Button fullWidth size="lg" onClick={handleSave} loading={saving}>
        {t('common.save')}
      </Button>
    </div>
  )
}
