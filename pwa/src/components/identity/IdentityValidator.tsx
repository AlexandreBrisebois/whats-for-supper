'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useFamily } from '@/hooks/useFamily';
import { useFamilyStore } from '@/store/familyStore';
import { ROUTES } from '@/lib/constants/routes';

interface IdentityValidatorProps {
  children: React.ReactNode;
}

/**
 * IdentityValidator acts as the primary safety net and router.
 * It enforces identity presence on protected routes and handles
 * public redirects (e.g. landing page logic).
 * It also checks if the selected member actually exists in the database.
 */
export function IdentityValidator({ children }: IdentityValidatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { familyMembers, selectedFamilyMemberId, _hasHydrated, loadFamily } = useFamily();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function verifyIdentity() {
      if (!_hasHydrated) return;

      const isLanding = pathname === ROUTES.LANDING;
      const isOnboarding = pathname === ROUTES.ONBOARDING;

      // 1. Landing page: Instant redirect based on identity
      if (isLanding) {
        router.replace(selectedFamilyMemberId ? ROUTES.HOME : ROUTES.ONBOARDING);
        return;
      }

      // 2. Onboarding page: Always allow (Ready).
      // If the user is already authenticated, the page component can choose to redirect,
      // but we don't force a router.replace here to avoid collisions during the 'add member' flow.
      if (isOnboarding) {
        setIsReady(true);
        return;
      }

      // 3. Protected routes: If no identity, redirect to onboarding
      if (!selectedFamilyMemberId) {
        console.warn('[IdentityValidator] No identity found. Redirecting to onboarding.');
        router.replace(ROUTES.ONBOARDING);
        return;
      }

      // 4. Validate if the stored ID actually exists in the family
      if (familyMembers.length === 0) {
        await loadFamily();
      }

      const latestMembers = useFamilyStore.getState().familyMembers;
      const exists = latestMembers.some((m) => m.id === selectedFamilyMemberId);

      // Only clear and redirect if we HAVE members but the ID is missing (e.g. deleted on another device)
      if (!exists && latestMembers.length > 0) {
        console.warn('Selected member no longer exists. Clearing identity.');
        useFamilyStore.getState().selectFamilyMember(null);
        router.replace(ROUTES.ONBOARDING);
        return;
      }

      setIsReady(true);
    }

    void verifyIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, selectedFamilyMemberId, _hasHydrated, familyMembers.length]);

  if (!isReady) {
    return null; // Prevent flicker while checking identity or performing client-side redirects
  }

  return <>{children}</>;
}
