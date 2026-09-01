import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { AddTransaction } from './pages/AddTransaction'
import { History } from './pages/History'
import { Statistics } from './pages/Statistics'
import { Settings } from './pages/Settings'
import { Savings } from './pages/Savings'
import { SavingDetail } from './pages/SavingDetail'
import { Onboarding } from './pages/Onboarding'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { DashboardSkeleton } from './components/ui/Skeleton'

function AppRoutes() {
  const { loading, isAuthenticated, activePeriod } = useApp()

  if (loading) {
    return (
      <div className="layout">
        <main className="layout__content">
          <DashboardSkeleton />
        </main>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (!activePeriod) {
    return <Onboarding />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="history" element={<History />} />
        <Route path="savings" element={<Savings />} />
        <Route path="savings/:id" element={<SavingDetail />} />
        <Route path="stats" element={<Statistics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="add" element={<AddTransaction />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={routerBasename || undefined}>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
