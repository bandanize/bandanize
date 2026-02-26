import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { AxiosError } from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useTranslation } from 'react-i18next';
import Logo from '@/assets/logo.svg';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { t } = useTranslation();
  
  // Initialize state based on token presence to avoid effect update
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : t('verify_email_no_token', 'No verification token found.'));
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get(`/auth/verify-email?token=${token}`);
        if (response.status === 200) {
          setStatus('success');
          // Auto redirect after 5 seconds
          setTimeout(() => {
             navigate('/login');
          }, 5000);
        } else {
             // Should be caught by catch block if status is not 2xx, but just in case
          setStatus('error');
          setMessage(t('verify_email_failed', 'Verification failed.'));
        }
      } catch (error: unknown) {
        setStatus('error');
        const err = error as AxiosError<string>;
        const errorText = err.response?.data || t('verify_email_failed', 'Verification failed.');
        setMessage(errorText);
      }
    };

    verifyToken();
  }, [token, navigate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-[448px] bg-card border-border rounded-[14px] p-6 shadow-none">
        <CardHeader className="space-y-4 flex flex-col items-center p-0 mb-8">
            <div className="flex items-center justify-center">
             <div className="w-[112px] h-[112px] flex items-center justify-center bg-white/5 rounded-full mb-4">
               <img src={Logo} alt="Bandanize Logo" className="size-16" />
            </div>
          </div>
          <CardTitle className="text-[30px] font-bold text-foreground font-sans text-center leading-8">
            {t('verify_email_title', 'Email Verification')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 text-center">
          {status === 'loading' && (
             <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-foreground opacity-60">{t('verifying_email', 'Verifying your email...')}</p>
             </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="text-primary text-5xl mb-4">✓</div>
              <h3 className="text-xl font-medium text-foreground">{t('email_verified_success', 'Email Verified!')}</h3>
              <p className="text-muted-foreground text-[14px]">
                {t('email_verified_msg', 'Your account has been activated. You can log in now.')}
              </p>
               <p className="text-muted-foreground/50 text-[12px]">
                {t('redirecting_login', 'Redirecting to login in 5 seconds...')}
              </p>
              <Button 
                onClick={() => navigate('/login')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-[14px] h-[40px] rounded-[8px] mt-4"
              >
                {t('go_to_login', 'Go to Login')}
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
               <div className="text-destructive text-5xl mb-4">✕</div>
              <h3 className="text-xl font-medium text-foreground">{t('verification_failed', 'Verification Failed')}</h3>
               <p className="text-destructive-foreground text-[14px]">{message}</p>
              <Button 
                onClick={() => navigate('/login')}
                variant="outline"
                className="w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[36px] rounded-[8px] mt-4"
              >
                {t('back_to_login', 'Back to Login')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
