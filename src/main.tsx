import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { I18nProvider } from './i18n/I18nContext'
import { initNativeApp } from './native/initNativeApp'
import './index.css'

if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true })
}

void initNativeApp()

function Root() {
  useEffect(() => {
    document.documentElement.classList.add('platform-' + Capacitor.getPlatform())
    if (Capacitor.isNativePlatform()) {
      document.documentElement.classList.add('platform-native')
    }
  }, [])

  return (
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
