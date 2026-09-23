import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsent } from '@/contexts/CookieConsentContext';
export function LegalFooter() {
  const { t } = useTranslation();
  const { setOpen } = useConsent();
  return <footer className="border-t border-border/50 px-4 py-4 text-xs text-muted-foreground">
    <nav aria-label={t('legal.title')} className="flex flex-wrap justify-center gap-x-5 gap-y-2">
      <Link className="hover:text-primary underline-offset-4 hover:underline" to="/cookies">{t('legal.cookies')}</Link>
      <Link className="hover:text-primary underline-offset-4 hover:underline" to="/privacy">{t('legal.privacy')}</Link>
      <Link className="hover:text-primary underline-offset-4 hover:underline" to="/terms&conditions">{t('legal.terms')}</Link>
      <button type="button" className="text-xs hover:text-primary underline-offset-4 hover:underline" onClick={() => setOpen(true)}>{t('consent.settings')}</button>
    </nav>
  </footer>;
}
