import { Link } from 'react-router-dom'
import { Download, Globe, Smartphone, Wallet } from 'lucide-react'
import {
  APP_APK_DOWNLOAD_URL,
  APP_APK_RELEASE_URL,
  APP_PUBLIC_URL,
  PRODUCTS,
} from '../constants/app'
import { Button } from '../components/ui/Button'

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
  return (
    <div className="products-page">
      <header className="products-page__hero">
        <div className="products-page__logo">
          <Wallet size={36} />
        </div>
        <h1 className="products-page__title">Мои приложения</h1>
        <p className="products-page__subtitle">Скачайте и установите Spendly на телефон</p>
      </header>

      <div className="products-page__grid">
        {PRODUCTS.map((product) => (
          <article key={product.id} className="product-card">
            <div className="product-card__head">
              <span className="product-card__emoji" aria-hidden>
                {product.emoji}
              </span>
              <div>
                <h2 className="product-card__name">{product.name}</h2>
                <p className="product-card__desc">{product.description}</p>
              </div>
            </div>

            <div className="product-card__blocks">
              <section className="product-block">
                <div className="product-block__icon product-block__icon--web">
                  <Globe size={22} />
                </div>
                <div className="product-block__body">
                  <h3>На телефон через браузер</h3>
                  <p>
                    Откройте сайт в Chrome на Android. В приложении: Настройки → «Установить
                    Spendly», или добавьте на главный экран через меню браузера.
                  </p>
                  <Button fullWidth size="lg" onClick={openWebApp}>
                    Открыть Spendly
                  </Button>
                </div>
              </section>

              <section className="product-block">
                <div className="product-block__icon product-block__icon--apk">
                  <Smartphone size={22} />
                </div>
                <div className="product-block__body">
                  <h3>На телефон — APK файл</h3>
                  <p>
                    Скачайте Android-приложение. Откройте файл Spendly.apk и подтвердите
                    установку.
                  </p>
                  <Button fullWidth size="lg" variant="secondary" onClick={downloadApk}>
                    <Download size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
                    Скачать APK
                  </Button>
                  <a
                    className="product-block__link"
                    href={APP_APK_RELEASE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Страница релиза на GitHub
                  </a>
                </div>
              </section>
            </div>
          </article>
        ))}
      </div>

      <section className="product-block product-block--note">
        <div className="product-block__body">
          <h3>⚠️ Вход с телефона</h3>
          <p>
            Сайт и APK не видят PocketBase на вашем компьютере (127.0.0.1). Для входа с телефона
            нужен сервер PocketBase в интернете (например Fly.io). Пока используйте Spendly на
            компьютере или настройте сервер — инструкция в файле <code>.env.example</code> в
            репозитории.
          </p>
        </div>
      </section>

      <p className="products-page__footer">
        Уже установили? <Link to="/login">Войти в аккаунт</Link>
      </p>
    </div>
  )
}
