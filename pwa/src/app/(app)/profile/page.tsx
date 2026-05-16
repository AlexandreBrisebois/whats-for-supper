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
  const { selectFamilyMember, selectedFamilyMemberId, selectedMember, loadFamily, hasLoaded } =
    useFamily();
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
    <div className="flex flex-col gap-12 pt-8 pb-20 max-w-sm mx-auto w-full px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
      {/* Decorative background element */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,#FDFCF0_0%,#FFFFFF_100%)]" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150%] h-[40%] -z-10 bg-ochre/5 blur-[120px] rounded-[100%]" />
      {/* Header with Settings Link */}
      <div className="relative w-full flex flex-col items-center">
        <button
          onClick={() => router.push(ROUTES.PROFILE_SETTINGS as any)}
          className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-full bg-white/40 backdrop-blur-xl border border-white/60 shadow-glass hover:bg-white/60 transition-all active:scale-90"
          data-testid="settings-btn"
          aria-label={t('profile.settings', 'Settings')}
        >
          <Settings className="h-5 w-5 text-terracotta" />
        </button>

        <div className="text-center px-12 mt-4">
          <h1 className="font-outfit text-4xl font-bold text-charcoal tracking-tight leading-tight">
            {t('profile.title', "Who's Eating?")}
          </h1>
          <p className="mt-3 text-base font-medium text-charcoal/60 leading-relaxed">
            {t('profile.subtitle', 'Pick a family member to get started.')}
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-8">
        <ProfileDropdown onSelect={handleFamilyMemberSelected} />

        {selectedMember && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
            <Button
              variant="ghost"
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
