'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useFamily } from '@/hooks/useFamily';
import { useFamilyStore } from '@/store/familyStore';
import { ROUTES } from '@/lib/constants/routes';
import { getFamilyMemberIdCookie } from '@/lib/identity/cookie';

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
  const { familyMembers, selectedFamilyMemberId, _hasHydrated, hasLoaded, isLoading, loadFamily } =
    useFamily();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function verifyIdentity() {
      try {
        if (!_hasHydrated) {
          return;
        }

        const isLanding = pathname === ROUTES.LANDING;
        const isOnboarding = pathname === ROUTES.ONBOARDING;
        const isPublic = pathname === ROUTES.WELCOME || pathname === ROUTES.INVITE;

        // 1. Landing page: Instant redirect based on identity
        if (isLanding) {
          const target = selectedFamilyMemberId ? ROUTES.HOME : ROUTES.ONBOARDING;
          if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'test') {
            console.log(
              `[IdentityValidator] Landing redirect: ${target} (memberId: ${selectedFamilyMemberId})`
            );
          }
          router.replace(target);
          return;
        }

        // 2. Onboarding & Public pages: Always allow (Ready).
        if (isOnboarding || isPublic) {
          setIsReady(true);
          return;
        }

        if (!selectedFamilyMemberId) {
          // Attempt recovery from cookie (legacy/non-HttpOnly) or server (HttpOnly)
          const cookieId = getFamilyMemberIdCookie();
          if (cookieId) {
            useFamilyStore.getState().selectFamilyMember(cookieId);
            return;
          }

          await useFamilyStore.getState().loadCurrentIdentity();

          if (useFamilyStore.getState().selectedFamilyMemberId) {
            return; // useEffect will re-run
          }

          // If we are in test environment, give it one more tick to hydrate before bailing
          const isTest = process.env.NEXT_PUBLIC_ENVIRONMENT === 'test';
          if (isTest) {
            await new Promise((r) => setTimeout(r, 100));
            if (useFamilyStore.getState().selectedFamilyMemberId) return;

            console.log(
              `[IdentityValidator] Identity missing at ${pathname}, redirecting to /onboarding`
            );
          }

          router.replace(ROUTES.ONBOARDING);
          return;
        }

        // 4. Validate if the stored ID actually exists in the family
        // Only load if not already loaded AND not currently loading
        if (!hasLoaded && !isLoading && familyMembers?.length === 0) {
          await loadFamily();
        }

        const latestMembers = useFamilyStore.getState().familyMembers ?? [];
        const exists = latestMembers.some(
          (m) => String(m.id).toLowerCase() === String(selectedFamilyMemberId).toLowerCase()
        );

        // Only clear and redirect if we HAVE members but the ID is missing (e.g. deleted on another device)
        // We only do this after a successful load to avoid race conditions during onboarding
        if (hasLoaded && !exists && latestMembers.length > 0) {
          console.warn('[IdentityValidator] Selected member no longer exists. Clearing identity.');
          useFamilyStore.getState().selectFamilyMember(null);
          router.replace(ROUTES.ONBOARDING);
          return;
        }

        setIsReady(true);
      } catch (error) {
        console.error('[IdentityValidator] Error during verification:', error);
        router.replace(ROUTES.ONBOARDING);
      }
    }

    void verifyIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, selectedFamilyMemberId, _hasHydrated, hasLoaded, familyMembers?.length]);

  if (!isReady) {
    return null; // Prevent flicker while checking identity or performing client-side redirects
  }

  return <>{children}</>;
}
