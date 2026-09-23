import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { legalContent } from '@/content/legal';
import { useConsent } from '@/contexts/CookieConsentContext';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { Button } from '@/app/components/ui/button';

export function LegalPage({ kind }: { kind: 'cookies' | 'privacy' | 'terms' }) {
  const { t, i18n } = useTranslation();
  const { purposes, setOpen } = useConsent();
  const content = legalContent[i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es'];
  const owner = import.meta.env.VITE_LEGAL_OWNER;
  const contact = import.meta.env.VITE_PRIVACY_EMAIL;
  const country = import.meta.env.VITE_LEGAL_COUNTRY;
  return <main className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
    <div className="flex justify-between items-center"><Link to="/dashboard" className="text-primary underline">Bandanize</Link><LanguageSwitcher /></div>
    <nav className="flex flex-wrap gap-4 text-sm" aria-label={t('legal.title')}>
      {(['cookies', 'privacy', 'terms'] as const).map(page => <Link key={page}
        aria-current={page === kind ? 'page' : undefined}
        className={page === kind ? 'font-bold text-primary underline' : 'text-muted-foreground underline'}
        to={page === 'terms' ? '/terms&conditions' : '/' + page}>{t('legal.' + page)}</Link>)}
    </nav>
    <h1 className="text-3xl font-bold">{t('legal.' + kind)}</h1>
    <p className="text-sm text-muted-foreground">{content.updated}</p>
    {(!owner || !contact || !country) && <p className="rounded-xl border border-border bg-card p-4 text-sm">{content.draft}</p>}
    {kind === 'cookies' ? <>
      <p>{t('legal.cookies_intro')}</p>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left">
        <thead><tr className="border-b border-border"><th className="p-2">{t('legal.storage')}</th><th className="p-2">{t('legal.purpose')}</th><th className="p-2">{t('legal.duration')}</th></tr></thead>
        <tbody>{[
          ['bandanizeConsent', t('legal.consent_purpose'), t('legal.days_180')],
          ['token / currentUser', t('legal.session_purpose'), t('legal.until_logout')],
          ['i18next / i18nextLng', t('legal.language_purpose'), t('legal.language_duration')],
          ['vite-ui-theme', t('legal.theme_purpose'), t('legal.until_clear')],
          ['bandanize.pendingInvite', t('legal.invite_purpose'), t('legal.days_7')],
          ['Cache Storage / Service Worker', t('legal.cache_purpose'), t('legal.cache_duration')],
        ].map(row => <tr key={row[0]} className="border-b border-border"><td className="p-2 break-words">{row[0]}</td><td className="p-2">{row[1]}</td><td className="p-2">{row[2]}</td></tr>)}</tbody>
      </table></div>
      <p>{t('legal.technical_storage')}</p>
      <h2 className="text-xl font-semibold">{t('legal.optional')}</h2>
      {purposes.length ? <ul className="space-y-3">{purposes.map(purpose => <li key={purpose.id}><strong>{purpose.name}</strong><p>{purpose.description}</p></li>)}</ul>
        : <p>{t('consent.no_optional')}</p>}
      <p>{t('legal.cookies_control')}</p>
      <Button variant="outline" onClick={() => setOpen(true)}>{t('consent.settings')}</Button>
    </> : content[kind].map(([heading, body]) => <section key={heading} className="space-y-2"><h2 className="text-xl font-semibold">{heading}</h2><p className="leading-relaxed text-muted-foreground">{body}</p></section>)}
    <section className="border-t border-border pt-4 space-y-2"><h2 className="font-semibold">{t('legal.contact')}</h2>
      {owner && <p>{owner}{country ? ' · ' + country : ''}</p>}
      {contact ? <a className="text-primary underline" href={'mailto:' + contact}>{contact}</a> : <p className="text-sm text-muted-foreground">{t('legal.contact_pending')}</p>}
    </section>
  </main>;
}
