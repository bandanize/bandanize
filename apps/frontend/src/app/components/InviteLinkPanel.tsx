import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api, { extractErrorMessage } from '@/services/api';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

export function InviteLinkPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const create = async () => {
    setBusy(true); setMessage('');
    try {
      const { data } = await api.post('/bands/' + projectId + '/invite-link');
      setLink(window.location.origin + '/join/' + data.token);
    } catch (err) { setMessage(extractErrorMessage(err, t('invite.error'))); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    setBusy(true); setMessage('');
    try {
      await api.delete('/bands/' + projectId + '/invite-link');
      setLink(''); setMessage(t('invite.revoked'));
    } catch (err) { setMessage(extractErrorMessage(err, t('invite.error'))); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setMessage(t('invite.copied')); }
    catch { setMessage(t('invite.copy_manually')); }
  };
  return <section className="space-y-3 border-t border-border pt-4">
    <h3 className="font-medium">{t('invite.link_title')}</h3>
    <p className="text-sm text-muted-foreground">{t('invite.link_hint')}</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy} onClick={create}>{t('invite.generate')}</Button>
      <Button variant="outline" disabled={busy} onClick={revoke}>{t('invite.revoke')}</Button>
    </div>
    {link && <div className="flex gap-2">
      <Input aria-label={t('invite.link_title')} readOnly value={link} onFocus={event => event.target.select()} />
      <Button onClick={copy}>{t('invite.copy')}</Button>
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
