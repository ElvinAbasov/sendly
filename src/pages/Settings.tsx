import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sun, Download, Upload, Trash2, User, Calendar,
  ChevronRight, AlertTriangle, LogOut, Smartphone, CheckCircle2, Languages,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAppInstall } from '../hooks/useAppInstall'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { Toggle } from '../components/ui/Toggle'
import { Modal } from '../components/ui/Modal'
import { CURRENCIES } from '../constants/categories'
import { useI18n } from '../i18n/I18nContext'
import { getErrorMessage } from '../utils/errorMessage'
import { formatAmount, formatDateFull, parseAmount } from '../utils/format'
import type { ExportData } from '../types'

export function Settings() {
  const { t, locale, setLocale } = useI18n()
  const navigate = useNavigate()
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
    logout,
  } = useApp()

  const fileRef = useRef<HTMLInputElement>(null)
  const clearConfirmWord = t('settings.data.clearConfirmWord')

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
  const [importError, setImportError] = useState('')
  const [showIosInstall, setShowIosInstall] = useState(false)
  const [installMessage, setInstallMessage] = useState('')

  const {
    showSection: showInstallSection,
    installed: appInstalled,
    installing: appInstalling,
    installApp,
    buttonLabel,
    buttonHint,
  } = useAppInstall()

  const handleSaveProfile = async () => {
    if (!name.trim()) return
    await updateUser({ name: name.trim(), currency })
  }

  const handleCreatePeriod = async () => {
    const capital = parseAmount(periodCapital)
    if (!periodName.trim()) {
      setPeriodError(t('settings.periods.periodNameRequired'))
      return
    }
    if (capital < 0) {
      setPeriodError(t('settings.periods.capitalNegative'))
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
    setImportError('')
    try {
      const text = await file.text()
      const data = JSON.parse(text) as ExportData
      await importData(data)
      if (data.user?.name) setName(data.user.name)
      if (data.user?.currency) setCurrency(data.user.currency)
    } catch (err) {
      setImportError(getErrorMessage(err, t, 'settings.data.importError'))
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClearData = async () => {
    if (clearConfirm !== clearConfirmWord) return
    setSaving(true)
    try {
      await clearAllData()
      setShowClearData(false)
      setClearConfirm('')
      navigate('/login')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleInstallApp = async () => {
    setInstallMessage('')
    const result = await installApp()
    if (result === 'installed') {
      setInstallMessage(t('settings.appInstall.successMessage'))
      return
    }
    if (result === 'ios-help') {
      setShowIosInstall(true)
      return
    }
    if (result === 'apk') {
      setInstallMessage(t('settings.appInstall.apkMessage'))
      return
    }
    if (result === 'dismissed') {
      setInstallMessage(t('settings.appInstall.dismissedMessage'))
      return
    }
    if (!appInstalled) {
      setInstallMessage(t('settings.appInstall.androidRetryMessage'))
    }
  }

  const closedPeriods = periods.filter((p) => p.endDate !== null)

  return (
    <div className="page settings-page">
      <header className="page__header">
        <h1 className="page__title">{t('settings.title')}</h1>
      </header>

      <section className="settings-section">
        <h3 className="settings-section__title">
          <User size={18} /> {t('settings.profile.title')}
        </h3>
        <Card>
          <Input label={t('settings.profile.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label={t('common.email')}
            type="email"
            value={user?.email ?? ''}
            disabled
          />
          <Select
            label={t('common.currency')}
            value={currency}
            onChange={setCurrency}
            sheetTitle={t('common.currency')}
            searchable
            options={CURRENCIES.map((c) => ({
              value: c.code,
              label: `${c.symbol} ${c.name}`,
              emoji: c.symbol,
            }))}
          />
          <Button onClick={handleSaveProfile} size="sm">
            {t('settings.profile.save')}
          </Button>
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">
          <Sun size={18} /> {t('settings.theme.title')}
        </h3>
        <Card>
          <Toggle
            label={settings.theme === 'dark' ? t('settings.theme.dark') : t('settings.theme.light')}
            checked={settings.theme === 'dark'}
            onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">
          <Languages size={18} /> {t('settings.language.title')}
        </h3>
        <Card>
          {(['ru', 'en', 'az'] as const).map((code) => (
            <button
              key={code}
              type="button"
              className={`settings-row settings-row--choice${locale === code ? ' settings-row--active' : ''}`}
              onClick={() => setLocale(code)}
              aria-pressed={locale === code}
            >
              <span>{t(`settings.language.${code}`)}</span>
              {locale === code && (
                <CheckCircle2 size={18} className="settings-row__check" aria-hidden />
              )}
            </button>
          ))}
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">
          <Calendar size={18} /> {t('settings.periods.title')}
        </h3>
        <Card>
          {activePeriod && (
            <div className="period-current">
              <div>
                <span className="period-current__name">{activePeriod.name}</span>
                <span className="period-current__meta">
                  {t('common.from')} {formatDateFull(activePeriod.startDate)} ·{' '}
                  {formatAmount(activePeriod.initialCapital, user?.currency ?? 'USD')}
                </span>
              </div>
              <span className="period-current__badge">{t('settings.periods.activeBadge')}</span>
            </div>
          )}
          <button className="settings-row" onClick={() => setShowNewPeriod(true)}>
            <span>{t('settings.periods.newPeriod')}</span>
            <ChevronRight size={18} />
          </button>
          {activePeriod && (
            <button className="settings-row" onClick={() => setShowClosePeriod(true)}>
              <span>{t('settings.periods.closeCurrent')}</span>
              <ChevronRight size={18} />
            </button>
          )}
        </Card>

        {closedPeriods.length > 0 && (
          <Card className="period-history">
            <h4 className="period-history__title">{t('settings.periods.historyTitle')}</h4>
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

      {showInstallSection && (
        <section className="settings-section">
          <h3 className="settings-section__title">
            <Smartphone size={18} /> {t('settings.appInstall.title')}
          </h3>
          <Card>
            {appInstalled ? (
              <div className="app-install-status">
                <CheckCircle2 size={20} className="app-install-status__icon" />
                <div>
                  <span className="app-install-status__title">{t('settings.appInstall.installedTitle')}</span>
                  <span className="app-install-status__hint">{buttonHint}</span>
                </div>
              </div>
            ) : (
              <>
                <Button fullWidth onClick={handleInstallApp} loading={appInstalling}>
                  <Smartphone size={18} />
                  {buttonLabel}
                </Button>
                <p className="settings-install-hint">{buttonHint}</p>
                {installMessage && (
                  <p className="settings-install-hint settings-install-hint--info">{installMessage}</p>
                )}
              </>
            )}
          </Card>
        </section>
      )}

      <section className="settings-section">
        <h3 className="settings-section__title">{t('settings.account.title')}</h3>
        <Card>
          <button className="settings-row" onClick={handleLogout}>
            <LogOut size={18} />
            <span>{t('settings.account.logout')}</span>
            <ChevronRight size={18} />
          </button>
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">{t('settings.data.title')}</h3>
        <Card>
          <button className="settings-row" onClick={handleExport}>
            <Download size={18} />
            <span>{t('settings.data.exportJson')}</span>
            <ChevronRight size={18} />
          </button>
          <button className="settings-row" onClick={() => fileRef.current?.click()}>
            <Upload size={18} />
            <span>{t('settings.data.importJson')}</span>
            <ChevronRight size={18} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            hidden
            onChange={handleImport}
          />
          {importError && (
            <p className="input-group__error settings-import-error">{importError}</p>
          )}
          <button
            className="settings-row settings-row--danger"
            onClick={() => setShowClearData(true)}
          >
            <Trash2 size={18} />
            <span>{t('settings.data.clearAll')}</span>
            <ChevronRight size={18} />
          </button>
        </Card>
      </section>

      <Modal open={showNewPeriod} onClose={() => setShowNewPeriod(false)} title={t('settings.periods.newPeriodModalTitle')}>
        <Input
          label={t('common.name')}
          value={periodName}
          onChange={(e) => setPeriodName(e.target.value)}
          placeholder={t('settings.periods.namePlaceholder')}
        />
        <Input
          label={t('settings.periods.initialCapitalLabel')}
          type="number"
          inputMode="decimal"
          value={periodCapital}
          onChange={(e) => setPeriodCapital(e.target.value)}
          placeholder="0"
        />
        {periodError && <span className="input-group__error">{periodError}</span>}
        <p className="modal-hint">
          {activePeriod
            ? t('settings.periods.closeActiveHint')
            : t('settings.periods.createHint')}
        </p>
        <Button fullWidth onClick={handleCreatePeriod} loading={saving}>
          {t('settings.periods.createButton')}
        </Button>
      </Modal>

      <Modal open={showClosePeriod} onClose={() => setShowClosePeriod(false)} title={t('settings.periods.closeModalTitle')}>
        <p className="modal-text">
          {t('settings.periods.closeModalText', { name: activePeriod?.name ?? '' })}
        </p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setShowClosePeriod(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleClosePeriod} loading={saving}>
            {t('common.closePeriod')}
          </Button>
        </div>
      </Modal>

      <Modal open={showIosInstall} onClose={() => setShowIosInstall(false)} title={t('settings.appInstall.iosModalTitle')}>
        <ol className="install-steps">
          <li>{t('settings.appInstall.iosStep1')}</li>
          <li>{t('settings.appInstall.iosStep2')}</li>
          <li>{t('settings.appInstall.iosStep3')}</li>
          <li>{t('settings.appInstall.iosStep4')}</li>
        </ol>
        <Button fullWidth onClick={() => setShowIosInstall(false)}>
          {t('common.understood')}
        </Button>
      </Modal>

      <Modal open={showClearData} onClose={() => setShowClearData(false)} title={t('settings.data.clearModalTitle')}>
        <div className="danger-warning">
          <AlertTriangle size={24} />
          <p>{t('settings.data.clearWarning')}</p>
        </div>
        <Input
          label={t('settings.data.clearConfirmLabel', { word: clearConfirmWord })}
          value={clearConfirm}
          onChange={(e) => setClearConfirm(e.target.value)}
        />
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setShowClearData(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleClearData}
            disabled={clearConfirm !== clearConfirmWord}
            loading={saving}
          >
            {t('settings.data.clearAllButton')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
