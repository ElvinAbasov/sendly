import { Link } from 'react-router-dom'
import { Download, Globe, Smartphone, Wallet } from 'lucide-react'
import {
  APP_APK_DOWNLOAD_URL,
  APP_APK_RELEASE_URL,
  APP_PUBLIC_URL,
  PRODUCTS,
} from '../constants/app'
import { Button } from '../components/ui/Button'
import { useI18n } from '../i18n/I18nContext'

function openWebApp() {
  window.location.href = APP_PUBLIC_URL
}

function downloadApk() {
  const link = document.createElement('a')
  link.href = APP_APK_DOWNLOAD_URL
  link.download = 'Spendly.apk'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function DownloadPage() {
  const { t } = useI18n()

  return (
    <div className="products-page">
      <header className="products-page__hero">
        <div className="products-page__logo">
          <Wallet size={36} />
        </div>
        <h1 className="products-page__title">{t('download.pageTitle')}</h1>
        <p className="products-page__subtitle">{t('download.pageSubtitle')}</p>
      </header>

      <div className="products-page__grid">
        {PRODUCTS.map((product) => (
          <article key={product.id} className="product-card">
            <div className="product-card__head">
              <span className="product-card__emoji" aria-hidden>
                {product.emoji}
              </span>
              <div>
                <h2 className="product-card__name">{t('app.name')}</h2>
                <p className="product-card__desc">{t('app.productDescription')}</p>
              </div>
            </div>

            <div className="product-card__blocks">
              <section className="product-block">
                <div className="product-block__icon product-block__icon--web">
                  <Globe size={22} />
                </div>
                <div className="product-block__body">
                  <h3>{t('download.webBlockTitle')}</h3>
                  <p>{t('download.webBlockText')}</p>
                  <Button fullWidth size="lg" onClick={openWebApp}>
                    {t('download.openApp')}
                  </Button>
                </div>
              </section>

              <section className="product-block">
                <div className="product-block__icon product-block__icon--apk">
                  <Smartphone size={22} />
                </div>
                <div className="product-block__body">
                  <h3>{t('download.apkBlockTitle')}</h3>
                  <p>{t('download.apkBlockText')}</p>
                  <Button fullWidth size="lg" variant="secondary" onClick={downloadApk}>
                    <Download size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
                    {t('download.downloadApk')}
                  </Button>
                  <a
                    className="product-block__link"
                    href={APP_APK_RELEASE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('download.githubRelease')}
                  </a>
                </div>
              </section>
            </div>
          </article>
        ))}
      </div>

      <section className="product-block product-block--note">
        <div className="product-block__body">
          <h3>⚠️ {t('download.mobileLoginTitle')}</h3>
          <p>{t('download.mobileLoginText')}</p>
        </div>
      </section>

      <p className="products-page__footer">
        {t('download.footerInstalled')}{' '}
        <Link to="/login">{t('download.footerLogin')}</Link>
      </p>
    </div>
  )
}
