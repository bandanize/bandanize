export interface ConsentRecord {
  version: 2;
  choices: Record<string, boolean>;
  expiresAt: number;
}
export interface ConsentPurpose { id: string; name: string; description: string }
interface ZarazConsent {
  APIReady?: boolean;
  purposes?: Record<string, { name?: string | Record<string, string>; description?: string | Record<string, string> }>;
  getAll: () => Record<string, boolean>;
  set: (choices: Record<string, boolean>) => void;
}
function api(): ZarazConsent | undefined {
  return (window as Window & { zaraz?: { consent?: ZarazConsent } }).zaraz?.consent;
}
const COOKIE = 'bandanizeConsent';
export function readConsent(): ConsentRecord | null {
  try {
    const raw = document.cookie.split('; ').find(value => value.startsWith(COOKIE + '='));
    const value = raw ? JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1))) : null;
    if (value?.version === 2 && value.expiresAt > Date.now() && value.choices
        && typeof value.choices === 'object' && !Array.isArray(value.choices)
        && Object.values(value.choices).every(choice => typeof choice === 'boolean')) return value;
  } catch { /* Invalid or old consent is not permission. */ }
  return null;
}
export function consentPurposes(language = 'es'): ConsentPurpose[] {
  const localized = (value: string | Record<string, string> | undefined) =>
    typeof value === 'string' ? value : value?.[language.split('-')[0]] || value?.en || value?.es || '';
  return Object.entries(api()?.purposes || {}).map(([id, purpose]) => ({
    id, name: localized(purpose.name) || id, description: localized(purpose.description),
  }));
}
export function syncConsent(record = readConsent()) {
  const consent = api();
  if (!consent?.APIReady) return;
  const ids = new Set([...Object.keys(consent.getAll()), ...Object.keys(consent.purposes || {})]);
  const values = Object.fromEntries([...ids].map(id => [id, record?.choices[id] === true]));
  // Never infer consent from a label such as "Analytics", or grant unknown purposes.
  consent.set(values);
}
export function saveConsent(choices: Record<string, boolean>): ConsentRecord {
  const record: ConsentRecord = { version: 2, choices, expiresAt: Date.now() + 180 * 86400000 };
  document.cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify(record))
    + '; Path=/; Max-Age=15552000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  document.cookie = 'cookieConsent=; Path=/; Max-Age=0; SameSite=Lax';
  syncConsent(record);
  window.dispatchEvent(new Event('bandanize-consent-updated'));
  return record;
}
export function initializeConsent() {
  syncConsent();
  document.addEventListener('zarazConsentAPIReady', () => {
    syncConsent();
    window.dispatchEvent(new Event('bandanize-consent-ready'));
  });
}
