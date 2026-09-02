import { Wallet } from 'lucide-react'
import { useI18n } from '../../i18n/I18nContext'

export function AuthBootSplash() {
  const { t } = useI18n()

  return (
    <div className="auth-boot" role="status" aria-live="polite" aria-busy="true">
      <div className="auth-boot__logo">
        <Wallet size={40} />
      </div>
      <p className="auth-boot__title">{t('app.name')}</p>
      <span className="auth-boot__spinner" aria-hidden />
      <p className="auth-boot__text">{t('common.loading')}</p>
    </div>
  )
}
