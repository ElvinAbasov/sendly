import { useEffect, type CSSProperties } from 'react'
import { Sparkles } from 'lucide-react'

interface GoalSuccessAnimationProps {
  goalName: string
  onComplete?: () => void
}

export function GoalSuccessAnimation({ goalName, onComplete }: GoalSuccessAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 3200)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="goal-success-overlay">
      <div className="goal-success">
        <div className="goal-success__burst">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="goal-success__particle"
              style={{ '--i': i } as CSSProperties}
            />
          ))}
        </div>
        <div className="goal-success__icon">
          <Sparkles size={32} />
        </div>
        <h2 className="goal-success__title">Цель достигнута!</h2>
        <p className="goal-success__subtitle">{goalName}</p>
      </div>
    </div>
  )
}
