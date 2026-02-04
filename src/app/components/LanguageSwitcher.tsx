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
      className="text-[#EDEDED]/60 hover:text-[#EDEDED] hover:bg-[#2B2B31]"
    >
      <Languages className="size-4 mr-2" />
      <span className="uppercase">{i18n.language}</span>
    </Button>
  );
}
