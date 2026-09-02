import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useI18n } from '../i18n/I18nContext'
import { formatPeriodName, parseAmount } from '../utils/format'

export function Onboarding() {
  const { t } = useI18n()
  const { setupPeriod } = useApp()

  const [periodName, setPeriodName] = useState('')
  const [initialCapital, setInitialCapital] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const defaultPeriodName = formatPeriodName()

  const handlePeriodSubmit = async () => {
    const name = periodName.trim() || defaultPeriodName
    const capital = parseAmount(initialCapital)
    const newErrors: Record<string, string> = {}
    if (!name) newErrors.periodName = t('onboarding.periodNameRequired')
    if (initialCapital && capital < 0) newErrors.initialCapital = t('onboarding.capitalNegative')
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

  return (
    <div className="onboarding">
      <div className="onboarding__hero">
        <div className="onboarding__logo">
          <Wallet size={40} />
        </div>
        <h1 className="onboarding__title">{t('app.name')}</h1>
        <p className="onboarding__subtitle">{t('app.tagline')}</p>
      </div>

      <div className="onboarding__form">
        <h2>{t('onboarding.createPeriodTitle')}</h2>
        <p className="onboarding__hint">{t('onboarding.createPeriodHint')}</p>
        <Input
          label={t('onboarding.periodNameLabel')}
          value={periodName || defaultPeriodName}
          onChange={(e) => setPeriodName(e.target.value)}
          placeholder={defaultPeriodName}
          error={errors.periodName}
        />
        <Input
          label={t('onboarding.initialCapitalLabel')}
          type="number"
          inputMode="decimal"
          value={initialCapital}
          onChange={(e) => setInitialCapital(e.target.value)}
          placeholder="0"
          error={errors.initialCapital}
        />
        <Button fullWidth size="lg" onClick={handlePeriodSubmit} loading={loading}>
          {t('onboarding.startButton')}
        </Button>
      </div>
    </div>
  )
}
