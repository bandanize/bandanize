import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="w-9 sm:w-auto px-0 sm:px-4 text-muted-foreground hover:text-foreground hover:bg-accent"
    >
      <Languages className="size-4 sm:mr-2" />
      <span className="uppercase hidden sm:inline">{i18n.language}</span>
    </Button>
  );
}
