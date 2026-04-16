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
      className="rounded-md px-2 py-1 text-sm font-semibold text-lavender transition-colors hover:bg-indigo-700"
      aria-label={locale === 'en' ? 'Switch to French' : 'Passer en anglais'}
    >
      {locale === 'en' ? 'FR' : 'EN'}
    </button>
  );
}
