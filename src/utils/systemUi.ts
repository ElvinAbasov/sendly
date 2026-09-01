import { Capacitor } from '@capacitor/core'

const THEME_COLORS = {
  dark: '#0f0f14',
  light: '#f5f5f8',
} as const

export function applySystemUi(theme: 'light' | 'dark') {
  const color = THEME_COLORS[theme]

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)

  if (!Capacitor.isNativePlatform()) return

  void import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) =>
      Promise.all([
        StatusBar.setOverlaysWebView({ overlay: true }),
        StatusBar.setBackgroundColor({ color: '#00000000' }),
        StatusBar.setStyle({ style: theme === 'dark' ? Style.Light : Style.Dark }),
      ]),
    )
    .catch(() => {})
}
