'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { FamilyManagement } from '@/components/profile/FamilyManagement';
import { FamilyGOTOSettings } from '@/components/profile/FamilyGOTOSettings';
import { FailedCapturesSection } from '@/components/profile/FailedCapturesSection';
import { t } from '@/locales';
import { ROUTES } from '@/lib/constants/routes';
import { useFamilyStore } from '@/store/familyStore';

export default function SettingsPage() {
  const router = useRouter();
  const { selectedFamilyMemberId, updateMemberPreferences } = useFamilyStore();

  return (
    <div className="flex flex-col gap-10 py-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
      {/* Decorative background element */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,#FDFCF0_0%,#FFFFFF_100%)]" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150%] h-[40%] -z-10 bg-terracotta/[0.03] blur-[120px] rounded-[100%]" />
      {/* Header */}
      <div className="flex items-center gap-5">
        <button
          onClick={() => router.push(ROUTES.PROFILE)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/40 backdrop-blur-xl border border-white/60 shadow-glass hover:bg-white/60 transition-all active:scale-90"
          aria-label={t('buttons.back', 'Back')}
        >
          <ChevronLeft className="h-6 w-6 text-terracotta" />
        </button>
        <div>
          <h1 className="font-outfit text-3xl font-bold text-charcoal tracking-tight leading-none">
            {t('profile.settings', 'Settings')}
          </h1>
          <p className="mt-1 text-base font-medium text-charcoal/60 leading-relaxed">
            {t('profile.settingsSubtitle', 'Family & app preferences')}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Family Management */}
        <FamilyManagement />

        {/* Family GOTO */}
        <FamilyGOTOSettings />

        {/* Failed Captures */}
        <FailedCapturesSection />
      </div>
    </div>
  );
}
