'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { FamilyManagement } from '@/components/profile/FamilyManagement';
import { PassThePhoneSettingsSection } from '@/components/profile/PassThePhoneSettingsSection';
import { FailedCapturesSection } from '@/components/profile/FailedCapturesSection';
import { t } from '@/locales';
import { ROUTES } from '@/lib/constants/routes';
import { useFamilyStore } from '@/store/familyStore';
import { PreviewFeaturesSection } from '@/components/profile/PreviewFeaturesSection';
import { UsualPortionsSection } from '@/components/profile/UsualPortionsSection';
import { SearchIndexSection } from '@/components/profile/SearchIndexSection';

interface SettingsPageContentProps {
  buildVersion?: string;
}

export function SettingsPageContent({ buildVersion }: SettingsPageContentProps) {
  const router = useRouter();
  const { selectedFamilyMemberId, updateMemberPreferences } = useFamilyStore();

  return (
    <div
      data-testid="settings-content"
      className="flex w-[min(calc(100vw-2rem),24rem)] min-w-0 flex-col gap-10 py-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"
    >
      {/* Decorative background element */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,#FDFCF0_0%,#FFFFFF_100%)]" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150%] h-[40%] -z-10 bg-terracotta/[0.03] blur-[120px] rounded-[100%]" />
      {/* Header */}
      <div className="flex items-center gap-5">
        <button
          onClick={() => router.push(ROUTES.PROFILE)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-chrome-line shadow-card hover:bg-cream-100 transition-all active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
          aria-label={t('buttons.back', 'Back')}
        >
          <ChevronLeft className="h-6 w-6 text-hearth-ink" />
        </button>
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink-body tracking-tight leading-none">
            {t('profile.settings', 'Settings')}
          </h1>
          <p className="mt-1 text-base font-medium text-ink-muted leading-relaxed">
            {t('profile.settingsSubtitle', 'Family & app preferences')}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-8">
        <FamilyManagement />

        <PassThePhoneSettingsSection />

        <UsualPortionsSection />

        <SearchIndexSection />

        <FailedCapturesSection />

        <PreviewFeaturesSection />
      </div>

      {buildVersion && (
        <p
          data-testid="build-version"
          className="-mt-4 text-center text-xs font-medium text-ink-muted"
        >
          Build {buildVersion}
        </p>
      )}
    </div>
  );
}
