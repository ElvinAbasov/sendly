import { Link } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import type { ReactNode } from 'react'

interface AuthShellProps {
  title: string
  hint: string
  footer: ReactNode
  onSubmit: () => void | Promise<void>
  children: ReactNode
}

export function AuthShell({ title, hint, footer, onSubmit, children }: AuthShellProps) {
  return (
    <div className="onboarding auth-page">
      <div className="onboarding__hero">
        <div className="onboarding__logo">
          <Wallet size={40} />
        </div>
        <h1 className="onboarding__title">Spendly</h1>
        <p className="onboarding__subtitle">Учёт личных финансов</p>
      </div>

      <form
        className="onboarding__form auth-form"
        onSubmit={(event) => {
          event.preventDefault()
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
