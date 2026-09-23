import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import api, { extractErrorMessage } from '@/services/api';
import { rememberInvite, clearPendingInvite } from '@/lib/pending-invite';
import { Button } from '@/app/components/ui/button';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';

export function JoinProject() {
  const { token = '' } = useParams();
  const { user } = useAuth();
  const { refreshProjects } = useProjects();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{ bandName: string; expiresAt: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    rememberInvite(token);
    api.get('/invite-links/' + encodeURIComponent(token), { signal: controller.signal })
      .then(response => { setPreview(response.data); setError(''); })
      .catch(err => {
        if (!controller.signal.aborted) setError(extractErrorMessage(err, t('invite.invalid')));
      });
    return () => controller.abort();
  }, [token, t]);
  const join = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/invite-links/' + encodeURIComponent(token) + '/accept');
      await refreshProjects();
      clearPendingInvite();
      navigate('/project/' + data.bandId, { replace: true });
    } catch (err) { setError(extractErrorMessage(err, t('invite.error'))); }
    finally { setBusy(false); }
  };
  return <main className="min-h-[80dvh] flex items-center justify-center p-4">
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex justify-end"><LanguageSwitcher /></div>
      <h1 className="text-2xl font-bold">{t('invite.title')}</h1>
      {preview && <><p>{t('invite.to_project', { name: preview.bandName })}</p>
        <p className="text-sm text-muted-foreground">{t('invite.expires', { date: new Date(preview.expiresAt).toLocaleDateString() })}</p></>}
      {error && <p role="alert" className="text-destructive-foreground">{error}</p>}
      {!preview && !error && <p role="status">{t('invite.loading')}</p>}
      {preview && (user
        ? <Button className="w-full" disabled={busy} onClick={join}>{t(busy ? 'invite.joining' : 'invite.join')}</Button>
        : <><p className="text-sm text-muted-foreground">{t('invite.account_hint')}</p>
          <Button asChild className="w-full"><Link to="/login?register=1">{t('auth.create_account')}</Link></Button>
          <Button asChild variant="outline" className="w-full"><Link to="/login">{t('auth.login')}</Link></Button></>)}
      <Link className="block text-sm text-primary underline" to="/dashboard">{t('invite.back')}</Link>
    </section>
  </main>;
}
