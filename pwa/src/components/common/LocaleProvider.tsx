'use client';

import { createContext, useContext, useState, useCallback } from 'react';

import { Locale, DEFAULT_LOCALE } from '@/lib/i18n';
import { getLocale, setLocale as persistLocale } from '@/locales';
import { useFamilyStore } from '@/store/familyStore';

interface LocaleContextValue {
  locale: Locale;
  setCurrentLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setCurrentLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { familyMembers, selectedFamilyMemberId } = useFamilyStore();
  const [localLocale, setLocalLocale] = useState<Locale>(() => getLocale());

  const setCurrentLocale = useCallback((next: Locale) => {
    persistLocale(next);
    setLocalLocale(next);
  }, []);

  // Derive locale: use selected member's preference if available, fallback to local state
  const member = familyMembers.find((m) => m.id === selectedFamilyMemberId);
  const backendLocale =
    member?.preferredLanguage === 'en' || member?.preferredLanguage === 'fr'
      ? (member.preferredLanguage as Locale)
      : undefined;

  const locale = backendLocale ?? localLocale;

  return (
    <LocaleContext.Provider value={{ locale, setCurrentLocale }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
