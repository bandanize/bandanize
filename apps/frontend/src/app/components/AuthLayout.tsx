import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Asterisk, AudioLines } from 'lucide-react';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import Logo from '@/assets/logo.svg';
import Welcome from '@/assets/welcome.svg';
import '@/styles/auth.css';

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <main className="auth-page">
      <header className="auth-header">
        <a href="https://bandanize.com/" className="auth-brand" aria-label={t('auth.brand_home')}>
          <img src={Logo} alt="" width="40" height="40" />
          <span>bandanize<span className="auth-brand-dot">.</span></span>
        </a>
        <LanguageSwitcher />
      </header>

      <div className="auth-stage">
        <section className="auth-art" aria-labelledby="auth-headline">
          <div className="auth-eyebrow"><span /> {t('auth.your_backstage')}</div>
          <h1 id="auth-headline">{t('auth.less_chaos')}<br /><span>{t('auth.more_music')}</span></h1>
          <p className="auth-intro">{t('auth.brand_intro')}</p>
          <div className="auth-illustration">
            <div className="auth-orbit" aria-hidden="true" />
            <Asterisk className="auth-art-star" size={52} strokeWidth={1.5} aria-hidden="true" />
            <img src={Welcome} alt={t('auth.mascot_alt')} width="1031" height="844" fetchPriority="high" />
            <span className="auth-art-note" aria-hidden="true"><AudioLines size={18} /> {t('auth.make_it_loud')}</span>
          </div>
          <div className="auth-art-footer"><span>{t('auth.your_space')}</span><span aria-hidden="true">VOL. 01 / ∞</span></div>
        </section>

        <section className="auth-form-panel" aria-label={t('auth.account_access')}>
          <div className="auth-form-wrap">{children}</div>
          <a className="auth-home-link" href="https://bandanize.com/">{t('auth.discover')} <ArrowUpRight size={15} aria-hidden="true" /></a>
        </section>
      </div>
    </main>
  );
}
