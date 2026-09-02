import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.spendly.app',
  appName: 'Spendly',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
}

export default config
