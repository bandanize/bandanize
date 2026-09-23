import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const isSpanish = (i18n.resolvedLanguage || i18n.language).startsWith('es');

  const toggleLanguage = () => {
    const newLang = isSpanish ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      type="button"
      aria-label={isSpanish ? 'Switch to English' : 'Cambiar a español'}
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="w-auto px-3 text-muted-foreground hover:text-foreground hover:bg-accent"
    >
      <Languages className="size-4" aria-hidden="true" />
      <span lang={isSpanish ? 'en' : 'es'}>{isSpanish ? 'English' : 'Español'}</span>
    </Button>
  );
}
