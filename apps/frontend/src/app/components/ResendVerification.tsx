import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderCircle } from 'lucide-react';
import api, { extractErrorMessage } from '@/services/api';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

export function ResendVerification() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setSent(false);
    try {
      await api.post('/auth/resend-verification', { email: email.trim() });
      setSent(true);
    } catch (failure) { setError(extractErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} aria-busy={busy} className="mt-6 space-y-3 border-t border-border pt-5 text-left">
    <p className="text-sm text-muted-foreground">{t('verification_resend_hint', '¿No te llegó el correo o ha caducado el enlace? Pide uno nuevo con el email de tu cuenta.')}</p>
    <Input type="email" required autoComplete="email" aria-label={t('email')} value={email} disabled={busy}
      onChange={event => setEmail(event.target.value)} placeholder={t('email')} />
    <Button type="submit" variant="outline" className="w-full" disabled={busy}>
      {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {t('verification_resend', 'Reenviar correo de verificación')}
    </Button>
    {sent && <p role="status" className="text-sm text-muted-foreground">{t('verification_resend_sent', 'Si tu cuenta está pendiente de verificación, te hemos enviado un enlace nuevo. Revisa también spam.')}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>;
}
