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
    <div className="w-full rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/60 p-8 shadow-glass">
      <div className="flex items-center gap-3 mb-8">
        <Languages className="h-4 w-4 text-terracotta" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-terracotta">
          {t('profile.language', 'Language')}
        </h3>
      </div>

      <div className="flex gap-3">
        <button
          data-testid="locale-btn-en"
          onClick={() => handleLanguageChange('en')}
          className={[
            'flex-1 rounded-2xl py-4 text-sm font-black transition-all active:scale-[0.98]',
            locale === 'en'
              ? 'bg-terracotta text-white shadow-card'
              : 'bg-white/50 text-charcoal/60 hover:bg-white/70 border border-white/80 shadow-sm',
          ].join(' ')}
        >
          {t('profile.english', 'English')}
        </button>
        <button
          data-testid="locale-btn-fr"
          onClick={() => handleLanguageChange('fr')}
          className={[
            'flex-1 rounded-2xl py-4 text-sm font-black transition-all active:scale-[0.98]',
            locale === 'fr'
              ? 'bg-terracotta text-white shadow-card'
              : 'bg-white/50 text-charcoal/60 hover:bg-white/70 border border-white/80 shadow-sm',
          ].join(' ')}
        >
          {t('profile.french', 'French')}
        </button>
      </div>
    </div>
  );
}
