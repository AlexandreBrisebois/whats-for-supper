'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { FamilySelector } from '@/components/identity/FamilySelector';
import { HintOverlay } from '@/components/hints/HintOverlay';
import { useLocale } from '@/components/common/LocaleProvider';
import { useFamily } from '@/hooks/useFamily';
import { useHintTour } from '@/hooks/useHintTour';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ROUTES } from '@/lib/constants/routes';

export default function OnboardingPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { isLoading, error, loadFamily } = useFamily();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  const {
    isActive: isTourActive,
    currentStep,
    totalSteps,
    nextStep,
    completeTour: finishTour,
    getCurrentHint,
    skipTour,
    start: startTour,
  } = useHintTour('phase0-onboarding');

  useEffect(() => {
    void loadFamily();
  }, [loadFamily]);

  // Auto-start the tour for first-time visitors
  useEffect(() => {
    startTour();
  }, [startTour]);

  function handleMemberSelected(memberId: string) {
    // Persist in cookie so server-side middleware can read it
    document.cookie = `member_id=${memberId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    // Persist in localStorage for client-side access
    try {
      localStorage.setItem('selectedMemberId', memberId);
    } catch {
      // localStorage may be unavailable in private-browsing edge cases
    }
    completeOnboarding();
    router.push(ROUTES.HOME);
  }

  const currentHint = getCurrentHint();

  return (
    <>
      {isTourActive && currentHint && (
        <HintOverlay
          isActive={isTourActive}
          step={currentHint}
          stepNumber={currentStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onSkip={skipTour}
          onTargetMissed={nextStep}
          locale={locale}
        />
      )}

      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
        {/* Heading — spotlight target for step 6 (welcome) */}
        <div className="text-center" data-hint="welcome">
          <h1 className="text-3xl font-bold text-sage-green">Who Are You?</h1>
          <p className="mt-2 text-charcoal-400">Select your name or add a new member</p>
        </div>

        {/* Status messages */}
        {isLoading && (
          <p className="text-center text-sm text-charcoal-400">Loading family members…</p>
        )}
        {error && (
          <p role="alert" className="text-center text-sm text-terracotta">
            {error}
          </p>
        )}

        {/* Family selector */}
        <div className="w-full max-w-sm">
          <FamilySelector onMemberSelected={handleMemberSelected} isLoading={isLoading} />
        </div>
      </main>
    </>
  );
}
