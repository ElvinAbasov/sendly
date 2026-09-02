import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { getPocketBaseUrl, isLocalPocketBaseUrl } from '../../lib/runtimeConfig'
import { getStoredServerUrl } from '../../lib/serverConfig'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface NativeServerSetupProps {
  onSave: (url: string) => Promise<void>
  compact?: boolean
}

export function NativeServerSetup({ onSave, compact = false }: NativeServerSetupProps) {
  const { t } = useI18n()
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    void getStoredServerUrl().then((stored) => {
      setUrl(stored ?? getPocketBaseUrl())
    })
  }, [])

  if (!Capacitor.isNativePlatform()) return null

  const needsSetup = isLocalPocketBaseUrl(url || getPocketBaseUrl())

  const handleSave = async () => {
    const trimmed = url.trim().replace(/\/$/, '')
    if (!trimmed) {
      setMessage(t('auth.server.urlRequired'))
      return
    }
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setMessage(t('auth.server.urlInvalid'))
      return
    }

    setSaving(true)
    setMessage('')
    try {
      await onSave(trimmed)
      setMessage(t('auth.server.saved'))
    } catch {
      setMessage(t('auth.server.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`native-server${compact ? ' native-server--compact' : ''}`}>
      {!compact && needsSetup && (
        <p className="native-server__hint">{t('auth.server.setupHint')}</p>
      )}
      <Input
        label={t('auth.server.urlLabel')}
        type="url"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={url}
        onChange={(e) => {
          setUrl(e.target.value)
          if (message) setMessage('')
        }}
        placeholder={t('auth.server.urlPlaceholder')}
      />
      <Button fullWidth size="sm" loading={saving} onClick={handleSave}>
        {t('auth.server.save')}
      </Button>
      {message && <p className="native-server__message">{message}</p>}
    </div>
  )
}
