'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { FamilySelector } from '@/components/identity/FamilySelector';
import { useFamily } from '@/hooks/useFamily';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ROUTES } from '@/lib/constants/routes';

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading, error, loadFamily } = useFamily();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  useEffect(() => {
    void loadFamily();
  }, [loadFamily]);

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

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-indigo">Who Are You?</h1>
        <p className="mt-2 text-charcoal-400">Select your name or add a new member</p>
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
        <FamilySelector onMemberSelected={handleMemberSelected} isLoading={isLoading} />
      </div>
    </main>
  );
}
