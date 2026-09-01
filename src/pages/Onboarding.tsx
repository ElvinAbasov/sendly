import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CURRENCIES } from '../constants/categories'
import { parseAmount } from '../utils/format'

type Step = 'user' | 'period'

export function Onboarding() {
  const { user, setupUser, setupPeriod } = useApp()
  const [step, setStep] = useState<Step>(user ? 'period' : 'user')

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [periodName, setPeriodName] = useState('')
  const [initialCapital, setInitialCapital] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleUserSubmit = async () => {
    if (!name.trim()) {
      setErrors({ name: 'Введите имя' })
      return
    }
    setLoading(true)
    try {
      await setupUser(name.trim(), currency)
      setStep('period')
      setErrors({})
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodSubmit = async () => {
    const name = periodName.trim() || defaultPeriodName
    const capital = parseAmount(initialCapital)
    const newErrors: Record<string, string> = {}
    if (!name) newErrors.periodName = 'Введите название периода'
    if (initialCapital && capital < 0) newErrors.initialCapital = 'Капитал не может быть отрицательным'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setLoading(true)
    try {
      await setupPeriod(name, capital)
    } finally {
      setLoading(false)
    }
  }

  const defaultPeriodName = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="onboarding">
      <div className="onboarding__hero">
        <div className="onboarding__logo">
          <Wallet size={40} />
        </div>
        <h1 className="onboarding__title">Spendly</h1>
        <p className="onboarding__subtitle">Учёт личных финансов</p>
      </div>

      {step === 'user' ? (
        <div className="onboarding__form">
          <h2>Добро пожаловать!</h2>
          <p className="onboarding__hint">Настройте профиль для начала работы</p>
          <Input
            label="Ваше имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как вас зовут?"
            error={errors.name}
          />
          <Select
            label="Валюта"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={CURRENCIES.map((c) => ({
              value: c.code,
              label: `${c.symbol} ${c.name}`,
            }))}
          />
          <Button fullWidth size="lg" onClick={handleUserSubmit} loading={loading}>
            Продолжить
          </Button>
        </div>
      ) : (
        <div className="onboarding__form">
          <h2>Создайте период</h2>
          <p className="onboarding__hint">
            Период — это отрезок времени для учёта финансов
          </p>
          <Input
            label="Название периода"
            value={periodName || defaultPeriodName}
            onChange={(e) => setPeriodName(e.target.value)}
            placeholder={defaultPeriodName}
            error={errors.periodName}
          />
          <Input
            label="Стартовый капитал"
            type="number"
            inputMode="decimal"
            value={initialCapital}
            onChange={(e) => setInitialCapital(e.target.value)}
            placeholder="0"
            error={errors.initialCapital}
          />
          <Button fullWidth size="lg" onClick={handlePeriodSubmit} loading={loading}>
            Начать
          </Button>
        </div>
      )}
    </div>
  )
}
