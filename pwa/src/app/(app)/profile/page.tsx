'use client';

import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';

import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { useFamily } from '@/hooks/useFamily';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ROUTES } from '@/lib/constants/routes';
import { t } from '@/locales';

export default function ProfilePage() {
  const router = useRouter();
  const { selectFamilyMember, selectedFamilyMemberId, selectedMember } = useFamily();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  function handleFamilyMemberSelected(familyMemberId: string) {
    selectFamilyMember(familyMemberId);
    completeOnboarding();
    router.push(ROUTES.HOME);
  }

  return (
    <div className="flex flex-col gap-10 pt-4 pb-20 max-w-sm mx-auto w-full px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header with Settings Link */}
      <div className="relative w-full flex flex-col items-center">
        <button
          onClick={() => router.push(ROUTES.PROFILE_SETTINGS as any)}
          className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/40 border border-white/40 shadow-glass hover:bg-white/60 transition-colors active:scale-90"
          aria-label={t('profile.settings', 'Settings')}
        >
          <Settings className="h-5 w-5 text-indigo" />
        </button>

        <div className="text-center px-12">
          <h2 className="font-outfit text-3xl font-bold text-charcoal tracking-tight">
            {t('profile.title', "Who's Eating?")}
          </h2>
          <p className="mt-2 text-sm font-medium text-charcoal-300">
            {t('profile.subtitle', 'Pick a family member to get started.')}
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm">
        <ProfileDropdown onSelect={handleFamilyMemberSelected} />
      </div>
    </div>
  );
}
