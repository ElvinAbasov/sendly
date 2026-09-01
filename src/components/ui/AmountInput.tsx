import { useRef, useEffect } from 'react'
import { getCurrencySymbol } from '../../utils/format'

interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  currency: string
  error?: string
}

export function AmountInput({ value, onChange, currency, error }: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.,]/g, '')
    onChange(raw)
  }

  return (
    <div className="amount-input">
      <span className="amount-input__symbol">{getCurrencySymbol(currency)}</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className={`amount-input__field ${error ? 'amount-input__field--error' : ''}`}
        value={value}
        onChange={handleChange}
        placeholder="0"
        aria-label="Сумма"
      />
      {error && <span className="amount-input__error">{error}</span>}
    </div>
  )
}
