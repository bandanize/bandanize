import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { consentPurposes, readConsent, saveConsent, type ConsentRecord, type ConsentPurpose } from '@/lib/consent';

const Context = createContext<{
  record: ConsentRecord | null; purposes: ConsentPurpose[]; open: boolean;
  setOpen: (value: boolean) => void; save: (choices: Record<string, boolean>) => void;
} | null>(null);
export function ConsentProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [record, setRecord] = useState(readConsent);
  const [purposes, setPurposes] = useState(() => consentPurposes(i18n.language));
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const refresh = () => { setPurposes(consentPurposes(i18n.language)); setRecord(readConsent()); };
    refresh();
    window.addEventListener('bandanize-consent-ready', refresh);
    window.addEventListener('bandanize-consent-updated', refresh);
    return () => {
      window.removeEventListener('bandanize-consent-ready', refresh);
      window.removeEventListener('bandanize-consent-updated', refresh);
    };
  }, [i18n.language]);
  const save = (choices: Record<string, boolean>) => { setRecord(saveConsent(choices)); setOpen(false); };
  return <Context.Provider value={{ record, purposes, open, setOpen, save }}>{children}</Context.Provider>;
}
export function useConsent() {
  const value = useContext(Context);
  if (!value) throw new Error('ConsentProvider is required');
  return value;
}
