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
    <div className="flex flex-col gap-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(ROUTES.PROFILE)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 border border-white/40 shadow-glass hover:bg-white/60 transition-colors active:scale-90"
          aria-label={t('buttons.back', 'Back')}
        >
          <ChevronLeft className="h-6 w-6 text-indigo" />
        </button>
        <div>
          <h2 className="font-outfit text-2xl font-bold text-charcoal tracking-tight">
            {t('profile.settings', 'Settings')}
          </h2>
          <p className="text-sm font-medium text-charcoal-300">
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
