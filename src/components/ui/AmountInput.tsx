import { useRef, useEffect } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { getCurrencySymbol } from '../../utils/format'

interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  currency: string
  label?: string
  placeholder?: string
  error?: string
  autoFocus?: boolean
}

export function AmountInput({
  value,
  onChange,
  currency,
  label,
  placeholder = '0',
  error,
  autoFocus = true,
}: AmountInputProps) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.,]/g, '')
    onChange(raw)
  }

  return (
    <div className="amount-input-wrap">
      {label && <span className="input-group__label">{label}</span>}
      <div className="amount-input">
        <span className="amount-input__symbol">{getCurrencySymbol(currency)}</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className={`amount-input__field ${error ? 'amount-input__field--error' : ''}`}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          aria-label={label ?? t('common.amount')}
        />
      </div>
      {error && <span className="input-group__error">{error}</span>}
    </div>
  )
}
