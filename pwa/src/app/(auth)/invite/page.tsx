'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFamily } from '@/hooks/useFamily';
import { useOnboardingStore } from '@/store/onboardingStore';

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectFamilyMember } = useFamily();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const [status, setStatus] = useState<'validating' | 'error'>('validating');

  useEffect(() => {
    const secret = searchParams.get('secret');
    const memberId = searchParams.get('memberId');
    if (!secret || !memberId) {
      setTimeout(() => setStatus('error'), 0);
      return;
    }

    fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, memberId }),
    })
      .then(async (res) => {
        if (res.ok) {
          selectFamilyMember(memberId);
          completeOnboarding();
          router.replace('/home');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [searchParams, router, selectFamilyMember, completeOnboarding]);

  if (status === 'error') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 bg-cream">
        <h1 className="text-2xl font-bold text-charcoal">Invalid invite link</h1>
        <p className="text-sm text-charcoal/60">
          This link may have expired or been tampered with.
        </p>
        <a href="/welcome" className="text-ochre underline text-sm">
          Go to welcome
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream">
      <p className="text-sm text-charcoal/60">Joining your family…</p>
    </main>
  );
}
