import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Keyboard } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'

export async function initNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    await Keyboard.setAccessoryBarVisible({ isVisible: false })
  } catch {
    // optional on some devices
  }
}

export async function hideNativeSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await SplashScreen.hide()
  } catch {
    // ignore
  }
}

export function setupAndroidBackButton(onBack: () => boolean): () => void {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return () => {}
  }

  let handle: { remove: () => void } | null = null

  void CapApp.addListener('backButton', () => {
    const handled = onBack()
    if (!handled) {
      void CapApp.exitApp()
    }
  }).then((listener) => {
    handle = listener
  })

  return () => {
    handle?.remove()
  }
}
