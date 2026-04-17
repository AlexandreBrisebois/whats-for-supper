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
 * IdentityValidator acts as a client-side safety net.
 * While middleware handles redirection if the cookie is missing,
 * this component checks once per mount if the selected member
 * actually exists in the database.
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

      const isPublicPage = pathname === ROUTES.LANDING || pathname === ROUTES.ONBOARDING;

      // 2. If we're on a public page, we're always "verified"
      if (isPublicPage) {
        setIsReady(true);
        return;
      }

      // 3. Identify selected member from store (Cookie)
      if (!selectedFamilyMemberId) {
        // Redirection should have been handled by middleware.
        // We only redirect here as a fallback if client state is out of sync.
        setIsReady(true);
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

  // Prevent flicker on protected pages by only rendering when verified
  const isPublicPage = pathname === ROUTES.LANDING || pathname === ROUTES.ONBOARDING;

  if (!isReady && !isPublicPage) {
    return null; // Or show a minimalist loader
  }

  return <>{children}</>;
}
