import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { AuthLink, AuthShell } from '../components/auth/AuthShell'
import { PasswordInput } from '../components/auth/PasswordInput'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CURRENCIES } from '../constants/categories'
import { normalizeEmail, validateEmail, validatePassword } from '../utils/auth'

export function Register() {
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

    if (!name.trim()) newErrors.name = 'Введите имя'
    if (!normalizedEmail) newErrors.email = 'Введите email'
    else if (!validateEmail(normalizedEmail)) newErrors.email = 'Некорректный email'

    const passwordError = validatePassword(password)
    if (passwordError) newErrors.password = passwordError
    if (password !== confirmPassword) newErrors.confirmPassword = 'Пароли не совпадают'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await register(normalizedEmail, password, name.trim(), currency)
      setErrors({})
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Ошибка регистрации' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Регистрация"
      hint="Создайте аккаунт для начала работы"
      onSubmit={handleSubmit}
      footer={
        <>
          Уже есть аккаунт? <AuthLink to="/login">Войти</AuthLink>
        </>
      }
    >
      {errors.form && <span className="input-group__error auth-form__error">{errors.form}</span>}

      <Input
        label="Ваше имя"
        autoComplete="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (errors.name || errors.form) setErrors({})
        }}
        placeholder="Как вас зовут?"
        error={errors.name}
      />
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
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          if (errors.password || errors.form) setErrors({})
        }}
        placeholder="Минимум 6 символов"
        error={errors.password}
      />
      <PasswordInput
        label="Подтверждение пароля"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value)
          if (errors.confirmPassword || errors.form) setErrors({})
        }}
        placeholder="Повторите пароль"
        error={errors.confirmPassword}
      />
      <Select
        label="Валюта"
        value={currency}
        onChange={setCurrency}
        sheetTitle="Валюта"
        searchable
        options={CURRENCIES.map((c) => ({
          value: c.code,
          label: `${c.symbol} ${c.name}`,
          emoji: c.symbol,
        }))}
      />
      <Button fullWidth size="lg" type="submit" loading={loading}>
        Зарегистрироваться
      </Button>
    </AuthShell>
  )
}
