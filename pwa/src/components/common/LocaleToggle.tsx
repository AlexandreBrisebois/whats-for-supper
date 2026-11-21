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
      className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-hearth-line bg-white px-3 py-2 text-sm font-semibold text-hearth-ink transition-colors hover:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
      aria-label={locale === 'en' ? 'Switch to French' : 'Passer en anglais'}
    >
      {locale === 'en' ? 'FR' : 'EN'}
    </button>
  );
}
