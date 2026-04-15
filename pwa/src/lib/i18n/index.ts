export type Locale = 'en' | 'fr';

export const DEFAULT_LOCALE: Locale = 'en';
export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr'];

export function getLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const lang = navigator.language.split('-')[0] as Locale;
  return SUPPORTED_LOCALES.includes(lang) ? lang : DEFAULT_LOCALE;
}
