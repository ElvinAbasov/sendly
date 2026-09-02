import type { RecordModel } from 'pocketbase'
import type { AppSettings, Period, SavingGoal, Transaction, User } from '../types'

export function mapUser(record: RecordModel): User {
  return {
    id: record.id,
    email: String(record.email ?? ''),
    name: String(record.name ?? ''),
    currency: String(record.currency ?? 'USD'),
    createdAt: record.created,
  }
}

export function mapPeriod(record: RecordModel, userId: string): Period {
  return {
    id: record.id,
    userId,
    name: String(record.name ?? ''),
    startDate: String(record.startDate ?? ''),
    endDate: record.endDate ? String(record.endDate) : null,
    initialCapital: Number(record.initialCapital ?? 0),
    createdAt: record.created,
  }
}

export function mapTransaction(record: RecordModel, userId: string): Transaction {
  return {
    id: record.id,
    userId,
    periodId: String(record.period ?? ''),
    type: record.type as Transaction['type'],
    amount: Number(record.amount ?? 0),
    category: String(record.category ?? ''),
    title: String(record.title ?? ''),
    note: String(record.note ?? ''),
    date: String(record.date ?? ''),
    createdAt: record.created,
    savingId: record.savingId ? String(record.savingId) : undefined,
    sourceSavingId: record.sourceSavingId ? String(record.sourceSavingId) : undefined,
    destinationSavingId: record.destinationSavingId
      ? String(record.destinationSavingId)
      : undefined,
    balanceAfter:
      record.balanceAfter != null && record.balanceAfter !== ''
        ? Number(record.balanceAfter)
        : undefined,
  }
}

export function mapSaving(record: RecordModel, userId: string): SavingGoal {
  return {
    id: record.id,
    userId,
    name: String(record.name ?? ''),
    description: String(record.description ?? ''),
    icon: String(record.icon ?? '🎯'),
    targetAmount: record.targetAmount != null ? Number(record.targetAmount) : null,
    currentAmount: Number(record.currentAmount ?? 0),
    targetDate: record.targetDate ? String(record.targetDate) : null,
    createdAt: record.created,
    updatedAt: record.updated,
    completedAt: record.completedAt ? String(record.completedAt) : null,
    isCompleted: Boolean(record.isCompleted),
    autoDepositAmount:
      record.autoDepositAmount != null ? Number(record.autoDepositAmount) : null,
    autoDepositDay: record.autoDepositDay != null ? Number(record.autoDepositDay) : null,
    lastAutoDepositPromptMonth: record.lastAutoDepositPromptMonth
      ? String(record.lastAutoDepositPromptMonth)
      : null,
  }
}

export function mapSettings(record: RecordModel | null): AppSettings {
  if (!record) return { theme: 'dark' }

  return {
    theme: record.theme === 'light' ? 'light' : 'dark',
    customCategories: record.customCategories ?? undefined,
    customCategoryIcons: record.customCategoryIcons ?? undefined,
  }
}

export function savingToRecord(goal: SavingGoal): Record<string, unknown> {
  return {
    owner: goal.userId,
    name: goal.name,
    description: goal.description,
    icon: goal.icon,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    targetDate: goal.targetDate,
    isCompleted: goal.isCompleted,
    completedAt: goal.completedAt,
    autoDepositAmount: goal.autoDepositAmount ?? null,
    autoDepositDay: goal.autoDepositDay ?? null,
    lastAutoDepositPromptMonth: goal.lastAutoDepositPromptMonth ?? null,
  }
}

export function transactionToRecord(tx: Transaction): Record<string, unknown> {
  return {
    owner: tx.userId,
    period: tx.periodId,
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    title: tx.title,
    note: tx.note,
    date: tx.date,
    savingId: tx.savingId ?? '',
    sourceSavingId: tx.sourceSavingId ?? '',
    destinationSavingId: tx.destinationSavingId ?? '',
    balanceAfter: tx.balanceAfter ?? null,
  }
}
