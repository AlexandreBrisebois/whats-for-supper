'use client';

import { Languages } from 'lucide-react';
import { useLocale } from '@/components/common/LocaleProvider';
import { useFamilyStore } from '@/store/familyStore';
import { t } from '@/locales';

export function LanguageSelection() {
  const { locale, setCurrentLocale } = useLocale();
  const { selectedFamilyMemberId, updateMemberPreferences } = useFamilyStore();

  const handleLanguageChange = (next: 'en' | 'fr') => {
    setCurrentLocale(next);
    if (selectedFamilyMemberId) {
      void updateMemberPreferences(selectedFamilyMemberId, { preferredLanguage: next });
    }
  };

  return (
    <div className="w-full rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 p-6 shadow-glass">
      <div className="flex items-center gap-2 mb-6">
        <Languages className="h-4 w-4 text-indigo" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo">
          {t('profile.language', 'Language')}
        </h3>
      </div>

      <div className="flex gap-2">
        <button
          data-testid="locale-btn-en"
          onClick={() => handleLanguageChange('en')}
          className={[
            'flex-1 rounded-2xl py-3 text-sm font-bold transition-all',
            locale === 'en'
              ? 'bg-indigo text-lavender shadow-card'
              : 'bg-white/60 text-charcoal hover:bg-indigo/5 border border-transparent',
          ].join(' ')}
        >
          {t('profile.english', 'English')}
        </button>
        <button
          data-testid="locale-btn-fr"
          onClick={() => handleLanguageChange('fr')}
          className={[
            'flex-1 rounded-2xl py-3 text-sm font-bold transition-all',
            locale === 'fr'
              ? 'bg-indigo text-lavender shadow-card'
              : 'bg-white/60 text-charcoal hover:bg-indigo/5 border border-transparent',
          ].join(' ')}
        >
          {t('profile.french', 'French')}
        </button>
      </div>
    </div>
  );
}
