import { useState, useRef } from 'react'
import {
  Sun, Download, Upload, Trash2, User, Calendar,
  ChevronRight, AlertTriangle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { Toggle } from '../components/ui/Toggle'
import { Modal } from '../components/ui/Modal'
import { CURRENCIES } from '../constants/categories'
import { formatAmount, formatDateFull, parseAmount } from '../utils/format'
import type { ExportData } from '../types'

export function Settings() {
  const {
    user,
    periods,
    activePeriod,
    settings,
    setTheme,
    updateUser,
    setupPeriod,
    closeCurrentPeriod,
    exportData,
    importData,
    clearAllData,
  } = useApp()

  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [currency, setCurrency] = useState(user?.currency ?? 'USD')
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [periodName, setPeriodName] = useState('')
  const [periodCapital, setPeriodCapital] = useState('')
  const [showClosePeriod, setShowClosePeriod] = useState(false)
  const [showClearData, setShowClearData] = useState(false)
  const [clearConfirm, setClearConfirm] = useState('')
  const [periodError, setPeriodError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSaveProfile = async () => {
    if (!name.trim()) return
    await updateUser({ name: name.trim(), currency })
  }

  const handleCreatePeriod = async () => {
    const capital = parseAmount(periodCapital)
    if (!periodName.trim()) {
      setPeriodError('Введите название периода')
      return
    }
    if (capital < 0) {
      setPeriodError('Капитал не может быть отрицательным')
      return
    }
    setSaving(true)
    try {
      if (activePeriod) await closeCurrentPeriod()
      await setupPeriod(periodName.trim(), capital)
      setShowNewPeriod(false)
      setPeriodName('')
      setPeriodCapital('')
      setPeriodError('')
    } finally {
      setSaving(false)
    }
  }

  const handleClosePeriod = async () => {
    setSaving(true)
    try {
      await closeCurrentPeriod()
      setShowClosePeriod(false)
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    const data = await exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spendly-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as ExportData
      if (!data.version || !data.periods || !data.transactions) {
        throw new Error('Неверный формат файла')
      }
      await importData(data)
      setName(data.user?.name ?? '')
      setCurrency(data.user?.currency ?? 'USD')
    } catch {
      alert('Ошибка импорта. Проверьте формат файла.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClearData = async () => {
    if (clearConfirm !== 'УДАЛИТЬ') return
    setSaving(true)
    try {
      await clearAllData()
      setShowClearData(false)
      setClearConfirm('')
    } finally {
      setSaving(false)
    }
  }

  const closedPeriods = periods.filter((p) => p.endDate !== null)

  return (
    <div className="page settings-page">
      <header className="page__header">
        <h1 className="page__title">Настройки</h1>
      </header>

      <section className="settings-section">
        <h3 className="settings-section__title">
          <User size={18} /> Профиль
        </h3>
        <Card>
          <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            label="Валюта"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={CURRENCIES.map((c) => ({
              value: c.code,
              label: `${c.symbol} ${c.name}`,
            }))}
          />
          <Button onClick={handleSaveProfile} size="sm">
            Сохранить
          </Button>
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">
          <Sun size={18} /> Тема
        </h3>
        <Card>
          <Toggle
            label={settings.theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
            checked={settings.theme === 'dark'}
            onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">
          <Calendar size={18} /> Периоды
        </h3>
        <Card>
          {activePeriod && (
            <div className="period-current">
              <div>
                <span className="period-current__name">{activePeriod.name}</span>
                <span className="period-current__meta">
                  С {formatDateFull(activePeriod.startDate)} ·{' '}
                  {formatAmount(activePeriod.initialCapital, user?.currency ?? 'USD')}
                </span>
              </div>
              <span className="period-current__badge">Активный</span>
            </div>
          )}
          <button className="settings-row" onClick={() => setShowNewPeriod(true)}>
            <span>Новый период</span>
            <ChevronRight size={18} />
          </button>
          {activePeriod && (
            <button className="settings-row" onClick={() => setShowClosePeriod(true)}>
              <span>Закрыть текущий период</span>
              <ChevronRight size={18} />
            </button>
          )}
        </Card>

        {closedPeriods.length > 0 && (
          <Card className="period-history">
            <h4 className="period-history__title">История периодов</h4>
            {closedPeriods.map((p) => (
              <div key={p.id} className="period-history__item">
                <span className="period-history__name">{p.name}</span>
                <span className="period-history__dates">
                  {formatDateFull(p.startDate)} — {p.endDate ? formatDateFull(p.endDate) : ''}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">Данные</h3>
        <Card>
          <button className="settings-row" onClick={handleExport}>
            <Download size={18} />
            <span>Экспорт в JSON</span>
            <ChevronRight size={18} />
          </button>
          <button className="settings-row" onClick={() => fileRef.current?.click()}>
            <Upload size={18} />
            <span>Импорт из JSON</span>
            <ChevronRight size={18} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            hidden
            onChange={handleImport}
          />
          <button
            className="settings-row settings-row--danger"
            onClick={() => setShowClearData(true)}
          >
            <Trash2 size={18} />
            <span>Удалить все данные</span>
            <ChevronRight size={18} />
          </button>
        </Card>
      </section>

      <Modal open={showNewPeriod} onClose={() => setShowNewPeriod(false)} title="Новый период">
        <Input
          label="Название"
          value={periodName}
          onChange={(e) => setPeriodName(e.target.value)}
          placeholder="Например: Октябрь 2026"
        />
        <Input
          label="Стартовый капитал"
          type="number"
          inputMode="decimal"
          value={periodCapital}
          onChange={(e) => setPeriodCapital(e.target.value)}
          placeholder="0"
        />
        {periodError && <span className="input-group__error">{periodError}</span>}
        <p className="modal-hint">
          {activePeriod
            ? 'Текущий период будет закрыт, история сохранится.'
            : 'Создайте период для начала учёта.'}
        </p>
        <Button fullWidth onClick={handleCreatePeriod} loading={saving}>
          Создать период
        </Button>
      </Modal>

      <Modal open={showClosePeriod} onClose={() => setShowClosePeriod(false)} title="Закрыть период?">
        <p className="modal-text">
          Период «{activePeriod?.name}» будет закрыт. Все операции сохранятся в истории.
        </p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setShowClosePeriod(false)}>
            Отмена
          </Button>
          <Button onClick={handleClosePeriod} loading={saving}>
            Закрыть
          </Button>
        </div>
      </Modal>

      <Modal open={showClearData} onClose={() => setShowClearData(false)} title="Удалить все данные?">
        <div className="danger-warning">
          <AlertTriangle size={24} />
          <p>Это действие необратимо. Все операции, периоды и настройки будут удалены.</p>
        </div>
        <Input
          label='Введите "УДАЛИТЬ" для подтверждения'
          value={clearConfirm}
          onChange={(e) => setClearConfirm(e.target.value)}
        />
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setShowClearData(false)}>
            Отмена
          </Button>
          <Button
            variant="danger"
            onClick={handleClearData}
            disabled={clearConfirm !== 'УДАЛИТЬ'}
            loading={saving}
          >
            Удалить всё
          </Button>
        </div>
      </Modal>
    </div>
  )
}
