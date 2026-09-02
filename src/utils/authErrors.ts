export type AuthField = 'email' | 'password' | 'both' | 'form'

export class AuthError extends Error {
  field: AuthField

  constructor(field: AuthField, message: string) {
    super(message)
    this.name = 'AuthError'
    this.field = field
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}
