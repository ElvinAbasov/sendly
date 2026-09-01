import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CURRENCIES } from '../constants/categories'
import { validateEmail, validatePassword } from '../utils/auth'

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
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Введите имя'
    if (!email.trim()) newErrors.email = 'Введите email'
    else if (!validateEmail(email)) newErrors.email = 'Некорректный email'
    const passwordError = validatePassword(password)
    if (passwordError) newErrors.password = passwordError
    if (password !== confirmPassword) newErrors.confirmPassword = 'Пароли не совпадают'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await register(email, password, name.trim(), currency)
      setErrors({})
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Ошибка регистрации' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding__hero">
        <div className="onboarding__logo">
          <Wallet size={40} />
        </div>
        <h1 className="onboarding__title">Spendly</h1>
        <p className="onboarding__subtitle">Учёт личных финансов</p>
      </div>

      <div className="onboarding__form">
        <h2>Регистрация</h2>
        <p className="onboarding__hint">Создайте аккаунт для начала работы</p>

        {errors.form && <span className="input-group__error auth-form__error">{errors.form}</span>}

        <Input
          label="Ваше имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Как вас зовут?"
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@mail.com"
          error={errors.email}
        />
        <Input
          label="Пароль"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Минимум 6 символов"
          error={errors.password}
        />
        <Input
          label="Подтверждение пароля"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        <Button fullWidth size="lg" onClick={handleSubmit} loading={loading}>
          Зарегистрироваться
        </Button>

        <p className="auth-form__footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  )
}
