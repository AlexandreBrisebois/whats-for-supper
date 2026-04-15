import type { Locale } from '@/lib/i18n';

import enCommon from './en/common.json';
import enHints from './en/hints.json';
import frCommon from './fr/common.json';
import frHints from './fr/hints.json';

export type { Locale };

const LOCALE_KEY = 'locale';

// Eagerly merged translation tables — small enough for Phase 0
const translations: Record<Locale, Record<string, unknown>> = {
  en: { ...enCommon, ...enHints },
  fr: { ...frCommon, ...frHints },
};

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
  if (stored === 'en' || stored === 'fr') return stored;
  const lang = navigator.language.split('-')[0];
  return lang === 'fr' ? 'fr' : 'en';
}

export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_KEY, locale);
}

function getNestedValue(obj: Record<string, unknown>, keys: string[]): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function t(key: string, defaultValue: string, locale?: Locale): string {
  const resolvedLocale = locale ?? getLocale();
  const parts = key.split('.');
  const value = getNestedValue(translations[resolvedLocale], parts);
  return typeof value === 'string' ? value : defaultValue;
}

export function tWithVars(
  key: string,
  defaultValue: string,
  vars: Record<string, string | number>,
  locale?: Locale
): string {
  let result = t(key, defaultValue, locale);
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(`{{${k}}}`, String(v));
  }
  return result;
}
