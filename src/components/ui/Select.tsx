import { type SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className={`input-group ${className}`}>
        {label && (
          <label htmlFor={selectId} className="input-group__label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`select ${error ? 'input--error' : ''}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="input-group__error">{error}</span>}
      </div>
    )
  },
)

Select.displayName = 'Select'
