import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { AuthLink, AuthShell } from '../components/auth/AuthShell'
import { PasswordInput } from '../components/auth/PasswordInput'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CURRENCIES } from '../constants/categories'
import { useI18n } from '../i18n/I18nContext'
import { normalizeEmail, validateEmail, validatePassword } from '../utils/auth'
import { isAuthError } from '../utils/authErrors'

export function Register() {
  const { t } = useI18n()
  const { register } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currency, setCurrency] = useState('AZN')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const normalizedEmail = normalizeEmail(email)
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = t('auth.validation.nameRequired')
    if (!normalizedEmail) newErrors.email = t('auth.validation.emailRequired')
    else if (!validateEmail(normalizedEmail)) newErrors.email = t('auth.validation.emailInvalid')

    const passwordErrorKey = validatePassword(password)
    if (passwordErrorKey) newErrors.password = t(passwordErrorKey)
    if (!confirmPassword) newErrors.confirmPassword = t('auth.validation.confirmPasswordRequired')
    else if (password !== confirmPassword) newErrors.confirmPassword = t('auth.validation.passwordsMismatch')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await register(normalizedEmail, password, name.trim(), currency)
      setErrors({})
    } catch (err) {
      if (isAuthError(err)) {
        const message = t(err.message)
        if (err.field === 'email') setErrors({ email: message, form: message })
        else if (err.field === 'password') setErrors({ password: message, form: message })
        else setErrors({ form: message })
      } else {
        setErrors({
          form: err instanceof Error ? t(err.message) : t('auth.register.registerError'),
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.register.title')}
      hint={t('auth.register.hint')}
      onSubmit={handleSubmit}
      footer={
        <>
          {t('auth.register.hasAccount')}{' '}
          <AuthLink to="/login">{t('auth.register.loginLink')}</AuthLink>
        </>
      }
    >
      {errors.form &&
        !errors.email &&
        !errors.password &&
        !errors.name &&
        !errors.confirmPassword && (
        <span className="input-group__error auth-form__error">{errors.form}</span>
      )}

      <Input
        label={t('auth.register.nameLabel')}
        autoComplete="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (errors.name || errors.form) setErrors({})
        }}
        placeholder={t('auth.register.namePlaceholder')}
        error={errors.name}
      />
      <Input
        label={t('common.email')}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (errors.email || errors.form) setErrors({})
        }}
        onBlur={() => setEmail((value) => normalizeEmail(value))}
        placeholder={t('auth.register.emailPlaceholder')}
        error={errors.email}
      />
      <PasswordInput
        label={t('common.password')}
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          if (errors.password || errors.form) setErrors({})
        }}
        placeholder={t('auth.register.passwordPlaceholder')}
        error={errors.password}
      />
      <PasswordInput
        label={t('auth.register.confirmPasswordLabel')}
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value)
          if (errors.confirmPassword || errors.form) setErrors({})
        }}
        placeholder={t('auth.register.confirmPasswordPlaceholder')}
        error={errors.confirmPassword}
      />
      <Select
        label={t('common.currency')}
        value={currency}
        onChange={setCurrency}
        sheetTitle={t('common.currency')}
        searchable
        options={CURRENCIES.map((c) => ({
          value: c.code,
          label: `${c.symbol} ${c.name}`,
          emoji: c.symbol,
        }))}
      />
      <Button fullWidth size="lg" type="submit" loading={loading}>
        {t('auth.register.submit')}
      </Button>
    </AuthShell>
  )
}
