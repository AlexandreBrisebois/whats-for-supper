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
      // 1. Wait for store hydration (now from cookies)
      if (!_hasHydrated) return;

      // 2. Landing page redirects to Home (if authenticated) or Onboarding (if fresh user)
      if (pathname === ROUTES.LANDING) {
        if (selectedFamilyMemberId) {
          router.replace(ROUTES.HOME);
        } else {
          router.replace(ROUTES.ONBOARDING);
        }
        return;
      }

      // 3. Onboarding page redirects to Home if already authenticated
      if (pathname === ROUTES.ONBOARDING) {
        if (selectedFamilyMemberId) {
          router.replace(ROUTES.HOME);
          return;
        }
        setIsReady(true);
        return;
      }

      // 4. Protected routes: if no identity, redirect to onboarding
      if (!selectedFamilyMemberId) {
        console.warn('[IdentityValidator] No identity found. Redirecting to onboarding.');
        router.replace(ROUTES.ONBOARDING);
        return;
      }

      // 5. Validate if the stored ID actually exists in the family
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
