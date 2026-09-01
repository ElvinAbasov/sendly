import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  padding?: 'sm' | 'md' | 'lg'
}

export function Card({
  children,
  className = '',
  onClick,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={`card card--${padding} ${onClick ? 'card--clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick()
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}
