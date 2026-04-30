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
          console.log('[IdentityValidator] Landing page redirect to:', target);
          router.replace(target);
          return;
        }

        // 2. Onboarding & Public pages: Always allow (Ready).
        if (isOnboarding || isPublic) {
          console.log('[IdentityValidator] On public or onboarding page. Ready.');
          setIsReady(true);
          return;
        }

        // 3. Protected routes: If no identity, redirect to onboarding
        if (!selectedFamilyMemberId) {
          console.warn(
            '[IdentityValidator] No identity found for protected route. Redirecting to onboarding.'
          );
          router.replace(ROUTES.ONBOARDING);
          return;
        }

        // 4. Validate if the stored ID actually exists in the family
        // Only load if not already loaded AND not currently loading
        if (!hasLoaded && !isLoading && familyMembers?.length === 0) {
          console.log('[IdentityValidator] Loading family members...');
          await loadFamily();
        }

        const latestMembers = useFamilyStore.getState().familyMembers ?? [];
        const exists = latestMembers.some(
          (m) => String(m.id).toLowerCase() === String(selectedFamilyMemberId).toLowerCase()
        );

        console.log('[IdentityValidator] Member exists check:', {
          exists,
          count: latestMembers.length,
        });

        // Only clear and redirect if we HAVE members but the ID is missing (e.g. deleted on another device)
        if (!exists && latestMembers.length > 0) {
          console.warn('[IdentityValidator] Selected member no longer exists. Clearing identity.');
          useFamilyStore.getState().selectFamilyMember(null);
          router.replace(ROUTES.ONBOARDING);
          return;
        }

        console.log('[IdentityValidator] Identity verified. Setting isReady=true');
        setIsReady(true);
      } catch (error) {
        console.error('[IdentityValidator] Error during verification:', error);
        router.replace(ROUTES.ONBOARDING);
      }
    }

    void verifyIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, selectedFamilyMemberId, _hasHydrated, familyMembers?.length]);

  if (!isReady) {
    return null; // Prevent flicker while checking identity or performing client-side redirects
  }

  return <>{children}</>;
}
