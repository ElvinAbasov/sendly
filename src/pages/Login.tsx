import { useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useApp } from '../context/AppContext'
import { AuthLink, AuthShell } from '../components/auth/AuthShell'
import { NativeServerSetup } from '../components/auth/NativeServerSetup'
import { PasswordInput } from '../components/auth/PasswordInput'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useI18n } from '../i18n/I18nContext'
import { normalizeEmail, validateEmail } from '../utils/auth'
import { isAuthError } from '../utils/authErrors'

export function Login() {
  const { t } = useI18n()
  const { login, configureServerUrl } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const submittingRef = useRef(false)

  const handleSubmit = async () => {
    if (submittingRef.current || loading) return

    const normalizedEmail = normalizeEmail(email)
    const newErrors: Record<string, string> = {}

    if (!normalizedEmail) newErrors.email = t('auth.validation.emailRequired')
    else if (!validateEmail(normalizedEmail)) newErrors.email = t('auth.validation.emailInvalid')
    if (!password) newErrors.password = t('auth.validation.passwordRequired')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    submittingRef.current = true
    setLoading(true)
    try {
      await login(normalizedEmail, password)
      setErrors({})
    } catch (err) {
      if (isAuthError(err)) {
        const message = t(err.message)
        if (err.field === 'both') {
          setErrors({ email: message, password: message, form: message })
        } else if (err.field === 'email') {
          setErrors({ email: message, form: message })
        } else if (err.field === 'password') {
          setErrors({ password: message, form: message })
        } else {
          setErrors({ form: message })
        }
      } else {
        setErrors({
          form: err instanceof Error ? t(err.message) : t('auth.login.loginError'),
        })
      }
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.login.title')}
      hint={t('auth.login.hint')}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      footer={
        <>
          {t('auth.login.noAccount')}{' '}
          <AuthLink to="/register">{t('auth.login.registerLink')}</AuthLink>
        </>
      }
    >
      {errors.form && !errors.email && !errors.password && (
        <span className="input-group__error auth-form__error">{errors.form}</span>
      )}

      {Capacitor.isNativePlatform() && (
        <NativeServerSetup onSave={configureServerUrl} compact />
      )}

      <Input
        label={t('common.email')}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={loading}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (errors.email || errors.form) setErrors({})
        }}
        onBlur={() => setEmail((value) => normalizeEmail(value))}
        placeholder={t('auth.login.emailPlaceholder')}
        error={errors.email}
      />
      <PasswordInput
        label={t('common.password')}
        autoComplete="current-password"
        disabled={loading}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          if (errors.password || errors.form) setErrors({})
        }}
        placeholder={t('auth.login.passwordPlaceholder')}
        error={errors.password}
      />
      <Button fullWidth size="lg" type="submit" loading={loading}>
        {t('auth.login.submit')}
      </Button>
    </AuthShell>
  )
}
