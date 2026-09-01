const ITERATIONS = 100_000
const KEY_LENGTH = 256

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveKey(password: string, salt: BufferSource): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH,
  )
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveKey(password, salt)
  return `${toBase64(salt)}:${toBase64(new Uint8Array(hash))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const separator = stored.indexOf(':')
  if (separator <= 0) return false

  const saltB64 = stored.slice(0, separator)
  const hashB64 = stored.slice(separator + 1)
  if (!saltB64 || !hashB64) return false

  const salt = fromBase64(saltB64)
  const expected = fromBase64(hashB64)
  const derived = new Uint8Array(await deriveKey(password, salt as BufferSource))
  if (derived.length !== expected.length) return false

  let mismatch = 0
  for (let i = 0; i < derived.length; i += 1) {
    mismatch |= derived[i]! ^ expected[i]!
  }
  return mismatch === 0
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'Пароль должен быть не менее 6 символов'
  return null
}

export function isPasswordHash(stored: string | undefined): stored is string {
  return Boolean(stored && stored.includes(':') && stored.indexOf(':') > 0)
}
