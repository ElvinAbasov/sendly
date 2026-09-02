import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { APP_APK_DOWNLOAD_URL } from '../constants/app'
import { useI18n } from '../i18n/I18nContext'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type AppPlatform = 'android' | 'ios' | 'other'
export type InstallResult = 'installed' | 'apk' | 'ios-help' | 'dismissed' | 'unavailable'

function getPlatform(): AppPlatform {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'other'
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function downloadApk() {
  const link = document.createElement('a')
  link.href = APP_APK_DOWNLOAD_URL
  link.download = 'Spendly.apk'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function useAppInstall() {
  const { t } = useI18n()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandaloneDisplay)
  const [installing, setInstalling] = useState(false)
  const platform = getPlatform()
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    if (isNative) return

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
      setInstalling(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [isNative])

  const canInstallPwa = Boolean(deferredPrompt)
  const showSection = !isNative

  const installApp = useCallback(async (): Promise<InstallResult> => {
    if (installed || isNative || installing) return 'unavailable'

    setInstalling(true)

    try {
      if (deferredPrompt) {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        setDeferredPrompt(null)
        if (outcome === 'accepted') {
          setInstalled(true)
          return 'installed'
        }
        return 'dismissed'
      }

      if (platform === 'android') {
        downloadApk()
        return 'apk'
      }

      if (platform === 'ios') return 'ios-help'

      return 'unavailable'
    } finally {
      setInstalling(false)
    }
  }, [deferredPrompt, installed, installing, isNative, platform])

  const buttonLabel = installed ? t('install.buttonInstalled') : t('install.buttonInstall')

  const buttonHint = installed
    ? t('install.hintInstalled')
    : canInstallPwa
      ? t('install.hintPwa')
      : platform === 'android'
        ? t('install.hintAndroidApk')
        : platform === 'ios'
          ? t('install.hintIos')
          : t('install.hintOther')

  return {
    platform,
    showSection,
    installed,
    installing,
    canInstallPwa,
    installApp,
    buttonLabel,
    buttonHint,
  }
}
