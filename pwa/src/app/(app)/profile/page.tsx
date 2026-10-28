'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { LanguageSelection } from '@/components/profile/LanguageSelection';
import { useFamily } from '@/hooks/useFamily';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ROUTES } from '@/lib/constants/routes';
import { t, tWithVars } from '@/locales';

export default function ProfilePage() {
  const router = useRouter();
  const { selectFamilyMember, selectedMember, loadFamily, hasLoaded } = useFamily();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  useEffect(() => {
    if (!hasLoaded) {
      void loadFamily();
    }
  }, [hasLoaded, loadFamily]);

  function handleFamilyMemberSelected(familyMemberId: string) {
    selectFamilyMember(familyMemberId);
    completeOnboarding();
    router.push(ROUTES.HOME);
  }

  return (
    <div
      data-testid="profile-page"
      className="mx-auto flex w-full max-w-md flex-col gap-8 px-[8px] pt-4 pb-12 sm:px-[16px]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="font-outfit text-4xl font-bold text-charcoal tracking-tight leading-tight">
            {t('profile.title', "Table's Set!")}
          </h1>
          <p className="mt-3 text-base text-charcoal-600 leading-relaxed">
            {t('profile.subtitle', 'Pick a family member to get started.')}
          </p>
        </div>
        <button
          onClick={() => router.push(ROUTES.PROFILE_SETTINGS as any)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/70 text-terracotta-700 shadow-glass hover:bg-terracotta-50 active:bg-terracotta-100 scroll-mb-[calc(8rem+env(safe-area-inset-bottom))] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta-700"
          data-testid="settings-btn"
          aria-label={t('profile.settings', 'Settings')}
        >
          <Settings aria-hidden="true" className="h-5 w-5" />
        </button>
      </header>

      <div className="flex w-full flex-col gap-6">
        <ProfileDropdown onSelect={handleFamilyMemberSelected} />

        {selectedMember && (
          <div>
            <Button
              variant="ghost"
              className="min-h-12 whitespace-normal break-words text-terracotta-700 scroll-mb-[calc(8rem+env(safe-area-inset-bottom))] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta-700"
              fullWidth
              onClick={() => router.push(ROUTES.HOME)}
              data-testid="continue-as-btn"
            >
              {tWithVars('profile.continueAs', 'Continue as {{name}}', {
                name: selectedMember.name,
              })}
            </Button>
          </div>
        )}

        <LanguageSelection />
      </div>
    </div>
  );
}
