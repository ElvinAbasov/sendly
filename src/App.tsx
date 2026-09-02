import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext'
import { useI18n } from './i18n/I18nContext'
import { Layout } from './components/layout/Layout'
import { Button } from './components/ui/Button'
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
import { DownloadPage } from './pages/DownloadPage'
import { DashboardSkeleton } from './components/ui/Skeleton'

function AppRoutes() {
  const { t } = useI18n()
  const { loading, initError, init, isAuthenticated, activePeriod } = useApp()

  if (initError && !loading) {
    return (
      <div className="init-error-screen">
        <AlertTriangle size={48} className="init-error-screen__icon" aria-hidden />
        <h1 className="init-error-screen__title">{t('common.error')}</h1>
        <p className="init-error-screen__text">{t(initError)}</p>
        <Button onClick={() => init()}>{t('common.retry')}</Button>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/download" element={<DownloadPage />} />

      {loading ? (
        <Route
          path="*"
          element={
            <div className="layout">
              <main className="layout__content">
                <DashboardSkeleton />
              </main>
            </div>
          }
        />
      ) : !isAuthenticated ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : !activePeriod ? (
        <Route path="*" element={<Onboarding />} />
      ) : (
        <>
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
        </>
      )}
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
