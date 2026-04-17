'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

import type { Locale } from '@/lib/i18n';
import { getLocale, setLocale as persistLocale } from '@/locales';

interface LocaleContextValue {
  locale: Locale;
  setCurrentLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setCurrentLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getLocale());

  const setCurrentLocale = useCallback((next: Locale) => {
    persistLocale(next);
    setLocaleState(next);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setCurrentLocale }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
