'use client';

import type { Locale } from '@/lib/i18n';
import { useLocale } from './LocaleProvider';

export function LocaleToggle() {
  const { locale, setCurrentLocale } = useLocale();

  function toggle() {
    const next: Locale = locale === 'en' ? 'fr' : 'en';
    setCurrentLocale(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-terracotta-200 bg-white px-3 py-2 text-sm font-semibold text-terracotta-700 transition-colors hover:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal"
      aria-label={locale === 'en' ? 'Switch to French' : 'Passer en anglais'}
    >
      {locale === 'en' ? 'FR' : 'EN'}
    </button>
  );
}
