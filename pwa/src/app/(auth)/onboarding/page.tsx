'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setFamilyMemberCookie } from '@/lib/auth';
import { FamilySelector } from '@/components/identity/FamilySelector';
import { useFamily } from '@/hooks/useFamily';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ROUTES } from '@/lib/constants/routes';
import { t } from '@/locales';

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading, error, selectedFamilyMemberId, loadFamily, selectFamilyMember } = useFamily();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  const isSwitching = !!selectedFamilyMemberId;

  useEffect(() => {
    void loadFamily();
  }, [loadFamily]);

  async function handleFamilyMemberSelected(familyMemberId: string) {
    // Set cookie via Server Action for middleware awareness
    await setFamilyMemberCookie(familyMemberId);

    // Update client-side store
    selectFamilyMember(familyMemberId);
    completeOnboarding();
    router.replace(ROUTES.HOME);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-cream px-6 py-12">
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1
          className="font-heading text-4xl font-bold text-charcoal tracking-tight"
          data-testid="onboarding-title"
        >
          {isSwitching
            ? t('auth.switchMember', 'Switch Member')
            : t('auth.onboardingTitle', 'Who Are You?')}
        </h1>
        <p className="mt-2 text-sm font-medium text-charcoal-600">
          {isSwitching
            ? t('auth.switchMemberSubtitle', 'Select a different name to change perspective')
            : t('auth.onboardingSubtitle', 'Select your name or add a new family member')}
        </p>
      </div>

      {/* Status messages */}
      {isLoading && (
        <p className="text-center text-sm text-charcoal-600">
          {t('profile.loading', 'Loading family members…')}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-terracotta-200 bg-terracotta-50 px-4 py-3 text-center text-sm font-medium text-terracotta-700"
        >
          {error}
        </p>
      )}

      {/* Family selector */}
      <div className="w-full max-w-sm">
        <FamilySelector onFamilyMemberSelected={handleFamilyMemberSelected} isLoading={isLoading} />
      </div>
    </main>
  );
}
