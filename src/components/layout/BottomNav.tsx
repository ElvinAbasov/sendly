import { NavLink } from 'react-router-dom'
import { Home, History, BarChart3, Settings, Plus } from 'lucide-react'

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
        <Home size={22} />
        <span>Главная</span>
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
        <History size={22} />
        <span>История</span>
      </NavLink>
      <NavLink to="/add" className="bottom-nav__fab">
        <Plus size={28} strokeWidth={2.5} />
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
        <BarChart3 size={22} />
        <span>Статистика</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
        <Settings size={22} />
        <span>Настройки</span>
      </NavLink>
    </nav>
  )
}
