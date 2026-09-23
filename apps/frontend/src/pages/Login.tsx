import { LoaderCircle } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { extractErrorMessage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/app/components/AuthLayout';

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showRegister, setShowRegister] = useState(() => new URLSearchParams(window.location.search).get('register') === '1');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      await login(username.trim(), password, remember);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, t('auth.login_error')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showRegister) {
    return <Register onBack={() => setShowRegister(false)} />;
  }

  return (
    <AuthLayout>
      <Card className="auth-card">
        <p className="auth-form-kicker">{t('auth.ready_to_play')}</p>
        <CardHeader className="auth-card-header">
          <CardTitle className="auth-card-title">{t('auth.welcome_back')}</CardTitle>
          <CardDescription className="auth-card-description">
            {t('auth.login_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form aria-busy={isSubmitting} onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[14px] text-foreground font-normal">{t('email')}</Label>
              <Input
                disabled={isSubmitting}
                id="username"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={t('auth.email_placeholder')}
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                autoComplete="email"
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground placeholder:text-muted-foreground/50 h-[36px] rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[14px] text-foreground font-normal">{t('auth.password')}</Label>
              <Input
                disabled={isSubmitting}
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground h-[36px] rounded-[8px]"
              />
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-[14px] text-muted-foreground underline font-sans">{t('auth.forgot_password')}</Link>
              </div>
            </div>
            
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} disabled={isSubmitting} className="auth-remember" aria-describedby="remember-hint" />
              <span>{t('auth.remember')}<span id="remember-hint" className="block mt-1 text-xs text-muted-foreground">{t('auth.remember_hint')}</span></span>
            </label>
            {error && (
              <div role="alert" className="text-sm text-red-500 bg-red-500/10 p-2 rounded text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 mt-4">
              <Button 
                type="submit" disabled={isSubmitting} 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-[14px] h-[40px] rounded-[8px]"
              >
                {isSubmitting && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                {t(isSubmitting ? 'auth.signing_in' : 'auth.login')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="auth-secondary w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[40px] rounded-[8px] box-border"
                disabled={isSubmitting}
                onClick={() => setShowRegister(true)}
              >
                {t('auth.create_account')}
              </Button>
            </div>
            <span role="status" className="sr-only">{isSubmitting ? t('auth.please_wait') : ''}</span>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

function Register({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false); // New success state

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      await register(email.trim().toLowerCase(), password, name, username);
      setSuccess(true); // Set success on successful registration
    } catch (err: unknown) {
      setError(extractErrorMessage(err, t('auth.register_error')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
      return (
        <AuthLayout>
          <Card className="auth-card">
            <CardHeader className="auth-card-header">
              <CardTitle className="auth-card-title">{t('auth.check_email')}</CardTitle>
              <CardDescription className="auth-card-description">
                 {t('auth.verification_sent', { email })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="text-center space-y-4">
                    <p className="text-foreground/80 text-[14px]">
                        {t('auth.verify_instructions')}
                    </p>
                    <Button 
                        disabled={isSubmitting} onClick={onBack}
                        variant="outline"
                        className="auth-secondary w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[40px] rounded-[8px] box-border"
                    >
                        {t('auth.back_to_login')}
                    </Button>
               </div>
            </CardContent>
          </Card>
    </AuthLayout>
      );
  }

  return (
    <AuthLayout>
      <Card className="auth-card">
        <CardHeader className="auth-card-header">
          <CardTitle className="auth-card-title">{t('auth.create_account')}</CardTitle>
          <CardDescription className="auth-card-description">
            {t('auth.register_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form aria-busy={isSubmitting} onSubmit={handleRegister} className="flex flex-col gap-4">
             <div className="space-y-2">
              <Label htmlFor="name" className="text-[14px] text-foreground font-normal">{t('name')}</Label>
              <Input
                disabled={isSubmitting}
                id="name"
                type="text"
                placeholder={t('auth.name_placeholder')}
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground placeholder:text-foreground/25 h-[36px] rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[14px] text-foreground font-normal">{t('auth.username')}</Label>
              <Input
                disabled={isSubmitting}
                id="username"
                type="text"
                placeholder={t('auth.username_placeholder')}
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground placeholder:text-muted-foreground/50 h-[36px] rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[14px] text-foreground font-normal">{t('email')}</Label>
              <Input
                disabled={isSubmitting}
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={t('auth.email_placeholder')}
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground placeholder:text-muted-foreground/50 h-[36px] rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[14px] text-foreground font-normal">{t('auth.password')}</Label>
              <Input
                disabled={isSubmitting}
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground h-[36px] rounded-[8px]"
              />
            </div>
            {error && (
              <div role="alert" className="text-sm text-red-500 bg-red-500/10 p-2 rounded text-center">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3 mt-4">
              <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-[14px] h-[40px] rounded-[8px]">
                {isSubmitting && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                {t(isSubmitting ? 'auth.registering' : 'auth.register')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="auth-secondary w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[40px] rounded-[8px] box-border"
                disabled={isSubmitting} onClick={onBack}
              >
                {t('auth.back_to_login')}
              </Button>
            </div>
            <span role="status" className="sr-only">{isSubmitting ? t('auth.please_wait') : ''}</span>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
