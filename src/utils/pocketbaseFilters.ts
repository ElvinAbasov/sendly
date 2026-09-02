import { getPb } from '../lib/pocketbase'

export function ownerFilter(userId: string): string {
  return getPb().filter('owner = {:userId}', { userId })
}

export function activePeriodFilter(userId: string): string {
  return getPb().filter('owner = {:userId} && endDate = ""', { userId })
}

export function periodTransactionsFilter(userId: string, periodId: string): string {
  return getPb().filter('owner = {:userId} && period = {:periodId}', { userId, periodId })
}
