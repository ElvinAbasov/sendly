import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { validateEmail } from '../utils/auth'

export function Login() {
  const { login } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!email.trim()) newErrors.email = 'Введите email'
    else if (!validateEmail(email)) newErrors.email = 'Некорректный email'
    if (!password) newErrors.password = 'Введите пароль'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      setErrors({})
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Ошибка входа' })
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
        <h2>Вход</h2>
        <p className="onboarding__hint">Войдите в свой аккаунт</p>

        {errors.form && <span className="input-group__error auth-form__error">{errors.form}</span>}

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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          error={errors.password}
        />
        <Button fullWidth size="lg" onClick={handleSubmit} loading={loading}>
          Войти
        </Button>

        <p className="auth-form__footer">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
