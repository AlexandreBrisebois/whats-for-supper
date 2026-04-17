'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FamilySelector } from '@/components/identity/FamilySelector';
import { useFamily } from '@/hooks/useFamily';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ROUTES } from '@/lib/constants/routes';

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading, error, selectedFamilyMemberId, loadFamily, selectFamilyMember } = useFamily();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  const isSwitching = !!selectedFamilyMemberId;

  useEffect(() => {
    void loadFamily();
  }, [loadFamily]);

  function handleFamilyMemberSelected(familyMemberId: string) {
    selectFamilyMember(familyMemberId);
    completeOnboarding();
    router.replace(ROUTES.HOME);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl font-bold text-indigo tracking-tight">
          {isSwitching ? 'Switch Member' : 'Who Are You?'}
        </h1>
        <p className="mt-2 text-sm font-medium text-charcoal-300">
          {isSwitching
            ? 'Select a different name to change perspective'
            : 'Select your name or add a new family member'}
        </p>
      </div>

      {/* Status messages */}
      {isLoading && (
        <p className="text-center text-sm text-charcoal-400">Loading family members…</p>
      )}
      {error && (
        <p role="alert" className="text-center text-sm text-pink">
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
