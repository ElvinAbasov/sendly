import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { AddTransaction } from './pages/AddTransaction'
import { History } from './pages/History'
import { Statistics } from './pages/Statistics'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'
import { DashboardSkeleton } from './components/ui/Skeleton'

function AppRoutes() {
  const { loading, user, activePeriod } = useApp()

  if (loading) {
    return (
      <div className="layout">
        <main className="layout__content">
          <DashboardSkeleton />
        </main>
      </div>
    )
  }

  if (!user || !activePeriod) {
    return <Onboarding />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="history" element={<History />} />
        <Route path="stats" element={<Statistics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="add" element={<AddTransaction />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
