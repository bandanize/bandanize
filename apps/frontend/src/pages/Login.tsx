import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { extractErrorMessage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import Logo from '@/assets/logo.svg';

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, t('auth.login_error')));
    }
  };

  if (showRegister) {
    return <Register onBack={() => setShowRegister(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[448px] bg-card border-border rounded-[14px] p-6 shadow-none">
          <div className="flex justify-end"><LanguageSwitcher /></div>
        <CardHeader className="space-y-4 flex flex-col items-center p-0 mb-8">
          <div className="flex items-center justify-center">
             <img src={Logo} alt="Bandanize Logo" className="size-28 mb-4" />
          </div>
          <CardTitle className="text-[30px] font-bold text-foreground font-sans text-center leading-8">Bandanize</CardTitle>
          <CardDescription className="text-[16px] text-muted-foreground text-center font-normal font-sans">
            {t('auth.login_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[14px] text-foreground font-normal">{t('email')}</Label>
              <Input
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
            
            {error && (
              <div role="alert" className="text-sm text-red-500 bg-red-500/10 p-2 rounded text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 mt-4">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-[14px] h-[40px] rounded-[8px]"
              >
                {t('auth.login')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[40px] rounded-[8px] box-border"
                onClick={() => setShowRegister(true)}
              >
                {t('auth.create_account')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Decorative background images simulation based on CSS if possible, but skipping complex absolute positioning without assets */}
    </div>
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
  const [success, setSuccess] = useState(false); // New success state

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(email.trim().toLowerCase(), password, name, username);
      setSuccess(true); // Set success on successful registration
    } catch (err: unknown) {
      setError(extractErrorMessage(err, t('auth.register_error')));
    }
  };

  if (success) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-[448px] bg-card border-border rounded-[14px] p-6 shadow-none">
          <div className="flex justify-end"><LanguageSwitcher /></div>
            <CardHeader className="space-y-4 flex flex-col items-center p-0 mb-8">
              <div className="flex items-center justify-center">
                 <img src={Logo} alt="Bandanize Logo" className="size-28 mb-4" />
              </div>
              <CardTitle className="text-[30px] font-bold text-foreground font-sans text-center leading-8">{t('auth.check_email')}</CardTitle>
              <CardDescription className="text-[16px] text-muted-foreground text-center font-normal font-sans">
                 {t('auth.verification_sent', { email })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="text-center space-y-4">
                    <p className="text-foreground/80 text-[14px]">
                        {t('auth.verify_instructions')}
                    </p>
                    <Button 
                        onClick={onBack}
                        variant="outline"
                        className="w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[40px] rounded-[8px] box-border"
                    >
                        {t('auth.back_to_login')}
                    </Button>
               </div>
            </CardContent>
          </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[448px] bg-card border-border rounded-[14px] p-6 shadow-none">
          <div className="flex justify-end"><LanguageSwitcher /></div>
        <CardHeader className="space-y-4 flex flex-col items-center p-0 mb-8">
          <div className="flex items-center justify-center">
             <img src={Logo} alt="Bandanize Logo" className="size-28 mb-4" />
          </div>
          <CardTitle className="text-[30px] font-bold text-foreground font-sans text-center leading-8">{t('auth.create_account')}</CardTitle>
          <CardDescription className="text-[16px] text-muted-foreground text-center font-normal font-sans">
            {t('auth.register_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
             <div className="space-y-2">
              <Label htmlFor="name" className="text-[14px] text-foreground font-normal">{t('name')}</Label>
              <Input
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
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-[14px] h-[40px] rounded-[8px]">
                {t('auth.register')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[40px] rounded-[8px] box-border"
                onClick={onBack}
              >
                {t('auth.back_to_login')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
