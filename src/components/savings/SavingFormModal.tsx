import { useState, useEffect } from 'react'
import type { SavingGoal } from '../../types'
import { SAVING_ICONS } from '../../constants/savings'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { AmountInput } from '../ui/AmountInput'
import { Button } from '../ui/Button'
import { useI18n } from '../../i18n/I18nContext'
import { parseAmount, parseInputDateToISO } from '../../utils/format'

interface SavingFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    description: string
    icon: string
    targetAmount: number | null
    targetDate: string | null
    autoDepositAmount: number | null
    autoDepositDay: number | null
  }) => Promise<void>
  initial?: SavingGoal | null
  currency: string
}

export function SavingFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  currency,
}: SavingFormModalProps) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState<string>(SAVING_ICONS[0])
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [autoDepositAmount, setAutoDepositAmount] = useState('')
  const [autoDepositDay, setAutoDepositDay] = useState('1')
  const [enableAuto, setEnableAuto] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setDescription(initial?.description ?? '')
      setIcon(initial?.icon ?? SAVING_ICONS[0])
      setTargetAmount(initial?.targetAmount ? initial.targetAmount.toString() : '')
      setTargetDate(initial?.targetDate?.split('T')[0] ?? '')
      setAutoDepositAmount(
        initial?.autoDepositAmount ? initial.autoDepositAmount.toString() : '',
      )
      setAutoDepositDay(String(initial?.autoDepositDay ?? 1))
      setEnableAuto(!!initial?.autoDepositAmount)
      setErrors({})
    }
  }, [open, initial])

  const handleSubmit = async () => {
    if (saving) return
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = t('validation.nameRequired')

    const parsedTarget = targetAmount ? parseAmount(targetAmount) : null
    if (targetAmount && (parsedTarget === null || parsedTarget <= 0)) {
      nextErrors.targetAmount = t('validation.targetMustBePositive')
    }

    let parsedAuto: number | null = null
    let parsedDay: number | null = null
    if (enableAuto) {
      parsedAuto = parseAmount(autoDepositAmount)
      parsedDay = parseInt(autoDepositDay, 10)
      if (!autoDepositAmount || parsedAuto <= 0) {
        nextErrors.autoDepositAmount = t('validation.autoDepositAmountRequired')
      }
      if (!parsedDay || parsedDay < 1 || parsedDay > 28) {
        nextErrors.autoDepositDay = t('validation.autoDepositDayRange')
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        icon,
        targetAmount: parsedTarget,
        targetDate: targetDate ? parseInputDateToISO(targetDate) : null,
        autoDepositAmount: enableAuto ? parsedAuto : null,
        autoDepositDay: enableAuto ? parsedDay : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? t('savings.modals.editTitle') : t('savings.modals.createTitle')}
    >
      <div className="saving-form">
        <Input
          label={t('common.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder={t('savings.modals.namePlaceholder')}
        />

        <Input
          label={t('common.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('common.optional')}
        />

        <div className="saving-form__icons">
          <span className="input-group__label">{t('common.icon')}</span>
          <div className="icon-picker">
            {SAVING_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`icon-picker__item${icon === emoji ? ' icon-picker__item--active' : ''}`}
                onClick={() => setIcon(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <AmountInput
          label={t('savings.modals.targetOptional')}
          value={targetAmount}
          onChange={setTargetAmount}
          currency={currency}
          error={errors.targetAmount}
          placeholder="1000"
        />

        <Input
          label={t('savings.modals.targetDateOptional')}
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />

        <div className="saving-form__auto">
          <label className="saving-form__auto-toggle">
            <input
              type="checkbox"
              checked={enableAuto}
              onChange={(e) => setEnableAuto(e.target.checked)}
            />
            <span>{t('savings.modals.autoDepositToggle')}</span>
          </label>
          {enableAuto && (
            <div className="saving-form__auto-fields">
              <AmountInput
                label={t('common.amount')}
                value={autoDepositAmount}
                onChange={setAutoDepositAmount}
                currency={currency}
                error={errors.autoDepositAmount}
                placeholder="50"
              />
              <Input
                label={t('savings.modals.autoDepositDayLabel')}
                type="number"
                min={1}
                max={28}
                value={autoDepositDay}
                onChange={(e) => setAutoDepositDay(e.target.value)}
                error={errors.autoDepositDay}
              />
            </div>
          )}
        </div>

        <Button fullWidth onClick={handleSubmit} loading={saving}>
          {initial ? t('common.save') : t('common.create')}
        </Button>
      </div>
    </Modal>
  )
}
