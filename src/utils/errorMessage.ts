export function getErrorMessage(
  error: unknown,
  t: (key: string) => string,
  fallbackKey: string,
): string {
  if (error instanceof Error) return t(error.message)
  return t(fallbackKey)
}
