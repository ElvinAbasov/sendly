import type { CapacitorConfig } from '@capacitor/cli'

/** APK грузит актуальный UI с GitHub Pages — дизайн обновляется без переустановки. */
const LIVE_APP_URL = 'https://elvinabasov.github.io/sendly/'

const config: CapacitorConfig = {
  appId: 'com.spendly.app',
  appName: 'Spendly',
  webDir: 'dist',
  server: {
    url: LIVE_APP_URL,
    androidScheme: 'https',
    cleartext: false,
  },
}

export default config
