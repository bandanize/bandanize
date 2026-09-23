import CookiesImage from '@/assets/cookies.svg';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsent } from '@/contexts/CookieConsentContext';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';

function Preferences() {
  const { t } = useTranslation();
  const { record, purposes, save } = useConsent();
  const [choices, setChoices] = useState<Record<string, boolean>>(record?.choices || {});
  return <div className="space-y-4">
    <p className="text-sm">{t('consent.necessary_description')}</p>
    <label className="flex gap-3 items-center"><input type="checkbox" checked disabled />{t('consent.necessary')}</label>
    {purposes.length ? purposes.map(purpose => <label key={purpose.id} className="flex gap-3 items-start border-t border-border pt-3">
      <input type="checkbox" className="mt-1 accent-lime-400"
        checked={choices[purpose.id] === true}
        onChange={event => setChoices(previous => ({ ...previous, [purpose.id]: event.target.checked }))} />
      <span><span className="font-medium">{purpose.name}</span><span className="block text-sm text-muted-foreground">{purpose.description}</span></span>
    </label>) : <p className="text-sm text-muted-foreground">{t('consent.no_optional')}</p>}
    <Button className="w-full" onClick={() => save(Object.fromEntries(purposes.map(purpose => [purpose.id, choices[purpose.id] === true])))}>{t('consent.save')}</Button>
  </div>;
}
export function CookieConsent() {
  const { t } = useTranslation();
  const { record, purposes, open, setOpen, save } = useConsent();
  const needsChoice = !record || purposes.some(purpose => !(purpose.id in record.choices));
  const all = (allowed: boolean) => save(Object.fromEntries(purposes.map(purpose => [purpose.id, allowed])));
  return <>
    {needsChoice && !open && <section role="region" aria-label={t('consent.title')}
      className="fixed bottom-4 left-4 right-4 sm:right-auto sm:w-[400px] z-50 max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[14px] border border-white/10 bg-card shadow-[0_16px_64px_rgba(0,0,0,0.45)]">
      <div className="flex h-[140px] sm:h-[180px] items-center justify-center overflow-hidden bg-white/5">
        <img src={CookiesImage} alt="" className="h-full w-full object-contain" />
      </div>
      <div className="p-5 sm:p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="font-poppins text-xl font-medium tracking-tight">{t('consent.title')}</h2>
          <p className="text-[13px] leading-relaxed text-foreground/75">{t(purposes.length ? 'consent.description' : 'consent.essential_only')}</p>
        </div>
        <div className="flex gap-3">
          {purposes.length > 0 ? <>
            <Button variant="outline" className="flex-1 h-10 rounded-lg border-primary/35 bg-primary/10 text-primary hover:bg-primary/20" onClick={() => all(false)}>{t('consent.reject')}</Button>
            <Button variant="outline" className="flex-1 h-10 rounded-lg border-primary/35 bg-primary/10 text-primary hover:bg-primary/20" onClick={() => all(true)}>{t('consent.accept')}</Button>
          </> : <Button className="w-full h-10 rounded-lg" onClick={() => all(false)}>{t('consent.understood')}</Button>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
          <Link className="text-muted-foreground underline underline-offset-4 hover:text-foreground" to="/cookies">{t('consent.details')}</Link>
          <button type="button" className="text-primary text-xs underline underline-offset-4 focus-visible:outline focus-visible:outline-2" onClick={() => setOpen(true)}>{t('consent.settings')}</button>
        </div>
      </div>
    </section>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t('consent.title')}</DialogTitle>
          <DialogDescription>{t('consent.description')}</DialogDescription></DialogHeader>
        {open && <Preferences />}
        <Button variant="outline" onClick={() => all(false)}>{t('consent.reject')}</Button>
        <Link className="text-sm text-primary underline" to="/cookies" onClick={() => setOpen(false)}>{t('consent.details')}</Link>
      </DialogContent>
    </Dialog>
  </>;
}
