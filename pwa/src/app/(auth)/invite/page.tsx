'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFamily } from '@/hooks/useFamily';
import { useOnboardingStore } from '@/store/onboardingStore';

import { validateHearthSecret, setHearthCookie, setFamilyMemberCookie } from '@/lib/auth';

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectFamilyMember } = useFamily();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const [status, setStatus] = useState<'validating' | 'error'>('validating');

  useEffect(() => {
    const secret = searchParams.get('secret');
    const memberId = searchParams.get('memberId');
    const redirect = (searchParams.get('redirect') as string) || '/home';

    if (!secret) {
      setTimeout(() => setStatus('error'), 0);
      return;
    }

    async function handleJoin() {
      if (!secret) return;
      try {
        const isValid = await validateHearthSecret(secret);
        if (isValid) {
          // The 'secret' parameter in the URL is actually the signed token
          await setHearthCookie(secret);

          if (memberId) {
            await setFamilyMemberCookie(memberId);
            selectFamilyMember(memberId);
            completeOnboarding();
          }

          router.replace(redirect as any);
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    }

    handleJoin();
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
