import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function Layout() {
  const location = useLocation()

  return (
    <div className="layout">
      <main className="layout__content">
        <div key={location.pathname} className="layout__page">
          <Outlet />
        </div>
      </main>
      <div className="layout__nav-fade" aria-hidden />
      <BottomNav />
    </div>
  )
}
