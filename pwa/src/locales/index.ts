import { Locale, DEFAULT_LOCALE } from '@/lib/i18n';

import enCommon from './en/common.json';
import enHints from './en/hints.json';
import enJourneys from './en/journeys.json';
import frCommon from './fr/common.json';
import frHints from './fr/hints.json';
import frJourneys from './fr/journeys.json';

export type { Locale };

const LOCALE_KEY = 'locale';

function mergeTranslations(...tables: Array<Record<string, unknown>>): Record<string, unknown> {
  return tables.reduce<Record<string, unknown>>((merged, table) => {
    for (const [key, value] of Object.entries(table)) {
      const existing = merged[key];
      if (
        existing &&
        value &&
        typeof existing === 'object' &&
        typeof value === 'object' &&
        !Array.isArray(existing) &&
        !Array.isArray(value)
      ) {
        merged[key] = mergeTranslations(
          existing as Record<string, unknown>,
          value as Record<string, unknown>
        );
      } else {
        merged[key] = value;
      }
    }
    return merged;
  }, {});
}

// Eagerly merged translation tables — small enough for Phase 0
const translations: Record<Locale, Record<string, unknown>> = {
  en: mergeTranslations(enCommon, enHints, enJourneys),
  fr: mergeTranslations(frCommon, frHints, frJourneys),
};

export function getLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  // 1. Check for manual override (user's explicit choice in this browser)
  const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
  if (stored === 'en' || stored === 'fr') return stored;

  // 2. Fallback to environment default
  return DEFAULT_LOCALE;
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
