'use client';

import { useId } from 'react';
import { Check, Languages } from 'lucide-react';
import { useLocale } from '@/components/common/LocaleProvider';
import { useFamilyStore } from '@/store/familyStore';
import { t } from '@/locales';

export function LanguageSelection() {
  const headingId = useId();
  const { locale, setCurrentLocale } = useLocale();
  const { selectedFamilyMemberId, updateMemberPreferences } = useFamilyStore();

  const handleLanguageChange = (next: 'en' | 'fr') => {
    setCurrentLocale(next);
    if (selectedFamilyMemberId) {
      void updateMemberPreferences(selectedFamilyMemberId, { preferredLanguage: next });
    }
  };

  return (
    <section
      role="group"
      aria-labelledby={headingId}
      className="w-full rounded-3xl bg-white/50 border border-white/80 p-[20px] shadow-[0_6px_24px_-10px_rgba(31,41,55,0.12)]"
    >
      <div className="mb-4 flex items-center gap-3">
        <Languages aria-hidden="true" className="h-5 w-5 text-terracotta-700" />
        <h2 id={headingId} className="text-base font-semibold text-charcoal">
          {t('profile.language', 'Language')}
        </h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {(['en', 'fr'] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            data-testid={`locale-btn-${choice}`}
            aria-pressed={locale === choice}
            onClick={() => handleLanguageChange(choice)}
            className={[
              'flex min-h-12 min-w-12 flex-1 basis-[8rem] items-center justify-center gap-2 rounded-2xl px-3 py-3 text-base font-semibold scroll-mb-[calc(8rem+env(safe-area-inset-bottom))] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta-700',
              locale === choice
                ? 'bg-terracotta-50 text-terracotta-700 hover:bg-terracotta-100 active:bg-terracotta-100'
                : 'bg-white/80 text-charcoal hover:bg-cream active:bg-terracotta-50',
            ].join(' ')}
          >
            {locale === choice && (
              <Check data-language-check aria-hidden="true" className="h-5 w-5 shrink-0" />
            )}
            {choice === 'en' ? t('profile.english', 'English') : t('profile.french', 'French')}
          </button>
        ))}
      </div>
    </section>
  );
}
