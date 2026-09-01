import { NavLink } from 'react-router-dom'
import { Home, History, Settings, Plus, Wallet } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Главная', end: true },
  { to: '/history', icon: History, label: 'История', end: false },
  { to: '/add', icon: Plus, label: 'Добавить', end: false },
  { to: '/savings', icon: Wallet, label: 'Накопления', end: false },
  { to: '/settings', icon: Settings, label: 'Настройки', end: false },
] as const

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
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <div className="bottom-nav__dock">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  )
}
