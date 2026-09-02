export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Пароль должен быть не менее 8 символов'
  return null
}
