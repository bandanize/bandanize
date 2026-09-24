import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();

  const language = (i18n.resolvedLanguage || i18n.language).startsWith('es') ? 'es' : 'en';

  return (
    <Select value={language} onValueChange={value => { void i18n.changeLanguage(value); }}>
      <SelectTrigger aria-label="Idioma / Language" className={compact ? "h-10 w-auto min-w-0 gap-1.5 rounded-xl border-transparent bg-transparent px-2 text-xs hover:bg-accent sm:gap-2" : "w-auto min-w-[142px] gap-2 rounded-lg bg-card text-sm"}>
        <Languages className={compact ? "hidden sm:block size-4 text-muted-foreground" : "size-4"} aria-hidden="true" />
        {compact ? <><span className="sm:hidden">{language.toUpperCase()}</span><span className="hidden sm:inline"><SelectValue /></span></> : <SelectValue />}
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="es"><span lang="es">Español</span></SelectItem>
        <SelectItem value="en"><span lang="en">English</span></SelectItem>
      </SelectContent>
    </Select>
  );
}
