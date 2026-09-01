import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { AuthLink, AuthShell } from '../components/auth/AuthShell'
import { PasswordInput } from '../components/auth/PasswordInput'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { normalizeEmail, validateEmail } from '../utils/auth'

export function Login() {
  const { login } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const normalizedEmail = normalizeEmail(email)
    const newErrors: Record<string, string> = {}

    if (!normalizedEmail) newErrors.email = 'Введите email'
    else if (!validateEmail(normalizedEmail)) newErrors.email = 'Некорректный email'
    if (!password) newErrors.password = 'Введите пароль'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await login(normalizedEmail, password)
      setErrors({})
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Ошибка входа' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Вход"
      hint="Войдите в свой аккаунт"
      onSubmit={handleSubmit}
      footer={
        <>
          Нет аккаунта? <AuthLink to="/register">Зарегистрироваться</AuthLink>
        </>
      }
    >
      {errors.form && <span className="input-group__error auth-form__error">{errors.form}</span>}

      <Input
        label="Email"
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
        placeholder="example@mail.com"
        error={errors.email}
      />
      <PasswordInput
        label="Пароль"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          if (errors.password || errors.form) setErrors({})
        }}
        placeholder="••••••"
        error={errors.password}
      />
      <Button fullWidth size="lg" type="submit" loading={loading}>
        Войти
      </Button>
    </AuthShell>
  )
}
