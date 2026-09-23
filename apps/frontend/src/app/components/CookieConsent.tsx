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
      className="fixed bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-50 rounded-xl border border-border bg-card shadow-xl p-4 space-y-3">
      <h2 className="font-semibold">{t('consent.title')}</h2>
      <p className="text-sm text-muted-foreground">{t(purposes.length ? 'consent.description' : 'consent.essential_only')}</p>
      <Link className="text-sm text-primary underline" to="/cookies">{t('consent.details')}</Link>
      <div className="flex gap-2 flex-wrap">
        {purposes.length > 0 ? <>
          <Button variant="outline" className="flex-1" onClick={() => all(false)}>{t('consent.reject')}</Button>
          <Button variant="outline" className="flex-1" onClick={() => all(true)}>{t('consent.accept')}</Button>
        </> : <Button variant="outline" onClick={() => all(false)}>{t('consent.understood')}</Button>}
        <Button variant="outline" onClick={() => setOpen(true)}>{t('consent.settings')}</Button>
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
