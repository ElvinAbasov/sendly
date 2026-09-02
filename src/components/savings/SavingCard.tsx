import { ChevronRight } from 'lucide-react'
import type { SavingGoal } from '../../types'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useI18n } from '../../i18n/I18nContext'
import { formatAmount } from '../../utils/format'
import { getRemainingAmount, getSavingProgress } from '../../utils/savings'

interface SavingCardProps {
  goal: SavingGoal
  currency: string
  compact?: boolean
  onClick?: () => void
  onDeposit?: () => void
  onWithdraw?: () => void
}

export function SavingCard({
  goal,
  currency,
  compact = false,
  onClick,
  onDeposit,
  onWithdraw,
}: SavingCardProps) {
  const { t } = useI18n()
  const progress = getSavingProgress(goal)
  const remaining = getRemainingAmount(goal)
  const hasTarget = goal.targetAmount != null && goal.targetAmount > 0

  return (
    <Card
      className={`saving-card${goal.isCompleted ? ' saving-card--completed' : ''}${compact ? ' saving-card--compact' : ''}`}
      padding="md"
      onClick={onClick}
    >
      <div className="saving-card__header">
        <span className="saving-card__icon">{goal.icon}</span>
        <div className="saving-card__info">
          <h3 className="saving-card__name">{goal.name}</h3>
          {!compact && goal.description && (
            <p className="saving-card__desc">{goal.description}</p>
          )}
        </div>
        {onClick && (
          <ChevronRight size={18} className="saving-card__chevron" />
        )}
      </div>

      <div className="saving-card__amounts">
        <span className="saving-card__current">
          {formatAmount(goal.currentAmount, currency)}
        </span>
        {hasTarget && (
          <span className="saving-card__target">
            / {formatAmount(goal.targetAmount!, currency)}
          </span>
        )}
      </div>

      {hasTarget && (
        <div className="saving-card__progress-wrap">
          <div className="saving-card__progress-bar">
            <div
              className="saving-card__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="saving-card__progress-meta">
            <span>{Math.round(progress)}%</span>
            {remaining != null && remaining > 0 && (
              <span>
                {t('savings.card.remaining', { amount: formatAmount(remaining, currency) })}
              </span>
            )}
            {goal.isCompleted && (
              <span className="saving-card__badge">{t('savings.card.goalReached')}</span>
            )}
          </div>
        </div>
      )}

      {!compact && (onDeposit || onWithdraw) && (
        <div className="saving-card__actions" onClick={(e) => e.stopPropagation()}>
          {onDeposit && (
            <Button size="sm" fullWidth onClick={onDeposit}>
              {t('savings.card.deposit')}
            </Button>
          )}
          {onWithdraw && (
            <Button size="sm" variant="secondary" fullWidth onClick={onWithdraw}>
              {t('savings.card.withdraw')}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
