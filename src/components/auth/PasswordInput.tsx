import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useI18n } from '../../i18n/I18nContext'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = '', id, autoComplete, ...props }, ref) => {
    const { t } = useI18n()
    const [visible, setVisible] = useState(false)
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

    return (
      <div className={`input-group input-group--password ${className}`}>
        {label && (
          <label htmlFor={inputId} className="input-group__label">
            {label}
          </label>
        )}
        <div className="input-group__password-wrap">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            autoComplete={autoComplete}
            className={`input ${error ? 'input--error' : ''}`}
            {...props}
          />
          <button
            type="button"
            className="input-group__password-toggle"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && <span className="input-group__error">{error}</span>}
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'
