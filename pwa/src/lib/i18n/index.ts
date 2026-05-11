export type Locale = 'en' | 'fr';

export const DEFAULT_LOCALE: Locale =
  (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as Locale) === 'fr' ? 'fr' : 'en';
export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr'];

export function getLocale(): Locale {
  return DEFAULT_LOCALE;
}
