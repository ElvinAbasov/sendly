import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className={`input-group ${className}`}>
        {label && (
          <label htmlFor={inputId} className="input-group__label">
            {label}
          </label>
        )}
        <input ref={ref} id={inputId} className={`input ${error ? 'input--error' : ''}`} {...props} />
        {error && <span className="input-group__error">{error}</span>}
      </div>
    )
  },
)

Input.displayName = 'Input'
