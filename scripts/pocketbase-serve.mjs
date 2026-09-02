import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { chmod, mkdir, stat } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const POCKETBASE_HOST = process.env.POCKETBASE_HOST?.trim() || '0.0.0.0'
const POCKETBASE_PORT = process.env.POCKETBASE_PORT?.trim() || '8090'
const POCKETBASE_HEALTH = `http://127.0.0.1:${POCKETBASE_PORT}`

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const pbDir = path.join(root, 'pocketbase')
const dataDir = path.join(pbDir, 'pb_data')
const hooksDir = path.join(pbDir, 'pb_hooks')
const migrationsDir = path.join(pbDir, 'pb_migrations')

const isWindows = process.platform === 'win32'
const binaryName = isWindows ? 'pocketbase.exe' : 'pocketbase'
const binaryPath = path.join(pbDir, binaryName)

const POCKETBASE_VERSION = '0.28.4'
const downloadUrl = isWindows
  ? `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_windows_amd64.zip`
  : process.platform === 'darwin'
    ? `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_darwin_amd64.zip`
    : `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip`

async function fileExists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function downloadBinary() {
  console.log(`Downloading PocketBase v${POCKETBASE_VERSION}...`)
  const response = await fetch(downloadUrl)
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`)
  }

  await mkdir(pbDir, { recursive: true })

  const zipPath = path.join(pbDir, 'pocketbase.zip')
  await pipeline(response.body, createWriteStream(zipPath))

  const { execFileSync } = await import('node:child_process')
  if (isWindows) {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${pbDir.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: 'inherit' },
    )
  } else {
    execFileSync('tar', ['-xf', zipPath, '-C', pbDir], { stdio: 'inherit' })
    await chmod(binaryPath, 0o755)
  }

  const { unlink } = await import('node:fs/promises')
  await unlink(zipPath).catch(() => undefined)
  console.log(`PocketBase installed: ${binaryPath}`)
}

async function isPocketBaseRunning() {
  try {
    const response = await fetch(`${POCKETBASE_HEALTH}/api/health`, {
      signal: AbortSignal.timeout(1500),
    })
    return response.ok
  } catch {
    return false
  }
}

function getLanAddresses() {
  const addresses = []
  for (const entries of Object.values(networkInterfaces())) {
    if (!entries) continue
    for (const entry of entries) {
      if (entry.family !== 'IPv4' || entry.internal) continue
      addresses.push(entry.address)
    }
  }
  return addresses
}

async function main() {
  await mkdir(dataDir, { recursive: true })

  if (await isPocketBaseRunning()) {
    console.log(`PocketBase уже запущен: http://127.0.0.1:${POCKETBASE_PORT}`)
    const lan = getLanAddresses()
    if (lan.length > 0) {
      console.log('В локальной сети (только HTTP dev):')
      for (const ip of lan) console.log(`  http://${ip}:${POCKETBASE_PORT}`)
    }
    console.log(`Админка: http://127.0.0.1:${POCKETBASE_PORT}/_/`)
    return
  }

  if (!(await fileExists(binaryPath))) {
    await downloadBinary()
  }

  const args = [
    'serve',
    `--http=${POCKETBASE_HOST}:${POCKETBASE_PORT}`,
    `--dir=${dataDir}`,
    `--hooksDir=${hooksDir}`,
    `--migrationsDir=${migrationsDir}`,
  ]

  console.log(`Starting PocketBase at http://127.0.0.1:${POCKETBASE_PORT}`)
  const lan = getLanAddresses()
  if (lan.length > 0) {
    console.log('Доступ в локальной Wi‑Fi сети:')
    for (const ip of lan) console.log(`  http://${ip}:${POCKETBASE_PORT}`)
  }
  const child = spawn(binaryPath, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  })

  child.on('exit', (code) => process.exit(code ?? 0))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
