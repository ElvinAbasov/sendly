import type { SavingGoal } from '../../types'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useI18n } from '../../i18n/I18nContext'
import { formatAmount } from '../../utils/format'

interface AutoDepositPromptProps {
  goal: SavingGoal
  currency: string
  loading?: boolean
  error?: string
  onConfirm: () => void | Promise<void>
  onSkip: () => void | Promise<void>
}

export function AutoDepositPrompt({
  goal,
  currency,
  loading,
  error,
  onConfirm,
  onSkip,
}: AutoDepositPromptProps) {
  const { t } = useI18n()

  return (
    <Card className="auto-deposit-prompt" padding="md">
      <div className="auto-deposit-prompt__header">
        <span className="auto-deposit-prompt__icon">{goal.icon}</span>
        <div>
          <p className="auto-deposit-prompt__title">{t('savings.autoDeposit.title')}</p>
          <p className="auto-deposit-prompt__amount">
            {formatAmount(goal.autoDepositAmount ?? 0, currency)}
          </p>
          <p className="auto-deposit-prompt__meta">{goal.name}</p>
        </div>
      </div>
      <div className="auto-deposit-prompt__actions">
        {error && <p className="input-group__error">{error}</p>}
        <Button fullWidth onClick={onConfirm} loading={loading}>
          {t('savings.autoDeposit.deposit')}
        </Button>
        <Button fullWidth variant="secondary" onClick={onSkip} disabled={loading}>
          {t('savings.autoDeposit.skip')}
        </Button>
      </div>
    </Card>
  )
}
