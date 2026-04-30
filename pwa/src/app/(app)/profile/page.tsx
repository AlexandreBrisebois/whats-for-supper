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
  const { selectFamilyMember } = useFamily();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  function handleFamilyMemberSelected(familyMemberId: string) {
    selectFamilyMember(familyMemberId);
    completeOnboarding();
    router.push(ROUTES.HOME);
  }

  return (
    <div className="flex flex-col items-center gap-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
            {t('profile.title', 'Family Profile')}
          </h2>
          <p className="mt-2 text-sm font-medium text-charcoal-300">
            {t('profile.subtitle', 'Switch active family member to see what they think.')}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md">
        <ProfileDropdown onSelect={handleFamilyMemberSelected} />
      </div>

      <p className="max-w-[200px] text-center text-xs font-medium text-charcoal-300/60">
        {t('profile.manageHint', 'Manage your family members and app language in settings.')}
      </p>
    </div>
  );
}
