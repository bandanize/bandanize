import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const language = (i18n.resolvedLanguage || i18n.language).startsWith('es') ? 'es' : 'en';

  return (
    <Select value={language} onValueChange={value => { void i18n.changeLanguage(value); }}>
      <SelectTrigger aria-label="Idioma / Language" className="w-auto min-w-[142px] gap-2 rounded-lg bg-card text-sm">
        <Languages className="size-4" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="es"><span lang="es">Español</span></SelectItem>
        <SelectItem value="en"><span lang="en">English</span></SelectItem>
      </SelectContent>
    </Select>
  );
}
