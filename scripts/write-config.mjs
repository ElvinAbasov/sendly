import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const url = process.env.VITE_POCKETBASE_URL?.trim() || ''

await mkdir(publicDir, { recursive: true })
await writeFile(
  path.join(publicDir, 'config.json'),
  `${JSON.stringify({ pocketbaseUrl: url }, null, 2)}\n`,
  'utf8',
)

console.log(url ? `config.json -> ${url}` : 'config.json -> (empty, use runtime default)')
