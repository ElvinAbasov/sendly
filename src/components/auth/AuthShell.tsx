import { Link } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '../../i18n/I18nContext'

interface AuthShellProps {
  title: string
  hint: string
  footer: ReactNode
  onSubmit: () => void | Promise<void>
  isSubmitting?: boolean
  children: ReactNode
}

export function AuthShell({
  title,
  hint,
  footer,
  onSubmit,
  isSubmitting = false,
  children,
}: AuthShellProps) {
  const { t } = useI18n()

  return (
    <div className="onboarding auth-page">
      <div className="onboarding__hero">
        <div className="onboarding__logo">
          <Wallet size={40} />
        </div>
        <h1 className="onboarding__title">{t('app.name')}</h1>
        <p className="onboarding__subtitle">{t('app.tagline')}</p>
      </div>

      <form
        className="onboarding__form auth-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (isSubmitting) return
          void onSubmit?.()
        }}
      >
        <h2>{title}</h2>
        <p className="onboarding__hint">{hint}</p>
        {children}
        <p className="auth-form__footer">{footer}</p>
      </form>
    </div>
  )
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to}>{children}</Link>
}
