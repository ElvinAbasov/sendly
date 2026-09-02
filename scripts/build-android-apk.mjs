import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const isWindows = process.platform === 'win32'
const gradle = isWindows ? 'gradlew.bat' : './gradlew'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows,
    ...options,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const pocketBaseUrl = process.env.VITE_POCKETBASE_URL?.trim()
if (!pocketBaseUrl) {
  console.warn(
    'VITE_POCKETBASE_URL is not set. APK will use 127.0.0.1 unless user configures server URL in the app.',
  )
}

console.log('Building web assets...')
run('npm', ['run', 'build'], {
  env: { ...process.env, VITE_BASE_PATH: '/', VITE_POCKETBASE_URL: pocketBaseUrl ?? '' },
})

console.log('Syncing Capacitor Android project...')
run('npx', ['cap', 'sync', 'android'])

console.log('Building Android APK...')
run(gradle, ['assembleDebug', '--no-daemon', '--stacktrace'], {
  cwd: path.join(root, 'android'),
})

const apkSource = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const apkTarget = path.join(root, 'Spendly.apk')

if (!existsSync(apkSource)) {
  console.error('APK not found:', apkSource)
  process.exit(1)
}

mkdirSync(path.dirname(apkTarget), { recursive: true })
copyFileSync(apkSource, apkTarget)
console.log(`\nAPK ready: ${apkTarget}`)
