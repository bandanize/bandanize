import { useEffect } from 'react';
import { useCookies } from 'react-cookie';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';
import CookiesImage from '@/assets/cookies.svg';
import { useAuth } from '@/contexts/AuthContext';

export function CookieConsent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [cookies, setCookie] = useCookies(['cookieConsent']);

  const setZarazConsent = (allowed: boolean) => {
    const attemptSet = (retries: number) => {
      if (window.zaraz) {
        try {
          window.zaraz.consent.set({ 'Analytics': allowed });
          console.debug(`Zaraz consent updated: Analytics=${allowed}`);
        } catch (e) {
          console.error("Failed to set Zaraz consent:", e);
        }
      } else if (retries > 0) {
        setTimeout(() => attemptSet(retries - 1), 500);
      } else {
        console.warn("Zaraz window object not found after retries.");
      }
    };
    attemptSet(10); // Try for 5 seconds
  };

  useEffect(() => {
    // Sync with Zaraz if cookie exists
    if (cookies.cookieConsent) {
      setZarazConsent(cookies.cookieConsent === 'true');
    }
  }, [cookies.cookieConsent]);

  const handleAccept = () => {
    setCookie('cookieConsent', 'true', { path: '/', maxAge: 365 * 24 * 60 * 60 });
    setZarazConsent(true);
  };

  const handleDecline = () => {
    setCookie('cookieConsent', 'declined', { path: '/', maxAge: 365 * 24 * 60 * 60 });
    setZarazConsent(false);
  };

  // Only show if user is logged in and hasn't consented yet
  if (!user || cookies.cookieConsent) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[calc(100vw-32px)] sm:w-[400px] h-auto bg-card rounded-[14px] flex flex-col shadow-2xl border border-white/5 overflow-hidden">
      {/* Image placeholder */}
      <div className="w-full h-[200px] bg-white/5 flex items-center justify-center">
        <img src={CookiesImage} alt="Cookies" />
      </div>
      
      <div className="px-6 pb-6 pt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-[20px] font-medium font-poppins text-foreground leading-6">{t('cookies_privacy')}</h4>
          <p className="text-[12px] font-normal font-poppins text-foreground leading-4">
            {t('cookies_text')}
          </p>
        </div>
        
        <div className="flex gap-4 w-full">
          <Button 
            onClick={handleDecline}
            className="flex-1 h-[36px] bg-card border border-border rounded-[8px] text-foreground font-poppins text-[14px] hover:bg-accent"
          >
            {t('decline')}
          </Button>
          <Button 
            onClick={handleAccept}
            className="flex-1 h-[36px] bg-primary hover:bg-primary/90 rounded-[8px] text-primary-foreground font-poppins text-[14px]"
          >
            {t('accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
