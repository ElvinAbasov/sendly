import { NavLink } from 'react-router-dom'
import { Home, History, Settings, Plus, Wallet } from 'lucide-react'
import { useI18n } from '../../i18n/I18nContext'

function NavItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string
  icon: typeof Home
  label: string
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
      }
    >
      <span className="bottom-nav__pill" data-label={label}>
        <Icon size={22} strokeWidth={2} className="bottom-nav__icon" aria-hidden />
      </span>
    </NavLink>
  )
}

export function BottomNav() {
  const { t } = useI18n()

  const navItems = [
    { to: '/', icon: Home, label: t('nav.home'), end: true },
    { to: '/history', icon: History, label: t('nav.history'), end: false },
    { to: '/add', icon: Plus, label: t('nav.add'), end: false },
    { to: '/savings', icon: Wallet, label: t('nav.savings'), end: false },
    { to: '/settings', icon: Settings, label: t('nav.settings'), end: false },
  ] as const

  return (
    <nav className="bottom-nav" aria-label={t('nav.mainNav')}>
      <div className="bottom-nav__dock">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  )
}
