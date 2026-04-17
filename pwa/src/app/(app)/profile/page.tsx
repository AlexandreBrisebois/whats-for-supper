'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';

import { FamilySelector } from '@/components/identity/FamilySelector';
import { useFamily } from '@/hooks/useFamily';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ROUTES } from '@/lib/constants/routes';
import { t } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';

export default function ProfilePage() {
  const router = useRouter();
  const { isLoading, error, selectedFamilyMemberId, loadFamily, selectFamilyMember } = useFamily();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const { locale, setCurrentLocale } = useLocale();

  const isSwitching = !!selectedFamilyMemberId;

  useEffect(() => {
    void loadFamily();
  }, [loadFamily]);

  function handleFamilyMemberSelected(familyMemberId: string) {
    selectFamilyMember(familyMemberId);
    completeOnboarding();
    router.push(ROUTES.HOME);
  }

  return (
    <div className="flex flex-col items-center gap-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-charcoal tracking-tight">
          {t('profile.title', 'Family Profile')}
        </h2>
        <p className="mt-2 text-sm font-medium text-charcoal-300">
          {t('profile.subtitle', 'Switch active family member or manage your group.')}
        </p>
      </div>

      <div className="w-full max-w-md rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 p-6 shadow-glass">
        <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-indigo/60">
          {t('profile.activeMember', 'Active Member')}
        </h3>

        {/* Status messages */}
        {isLoading && (
          <p className="text-center text-sm text-charcoal-400 py-8">
            {t('profile.loading', 'Loading family members…')}
          </p>
        )}
        {error && (
          <p role="alert" className="text-center text-sm text-pink py-8">
            {error}
          </p>
        )}

        {/* Family selector */}
        <FamilySelector onFamilyMemberSelected={handleFamilyMemberSelected} isLoading={isLoading} />
      </div>

      <div className="w-full max-w-md rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 p-6 shadow-glass">
        <div className="flex items-center gap-2 mb-6">
          <Languages className="h-4 w-4 text-indigo/60" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo/60">
            {t('profile.language', 'Language')}
          </h3>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrentLocale('en')}
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
            onClick={() => setCurrentLocale('fr')}
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
    </div>
  );
}
