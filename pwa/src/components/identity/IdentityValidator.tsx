'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useFamily } from '@/hooks/useFamily';
import { useFamilyStore } from '@/store/familyStore';
import { ROUTES } from '@/lib/constants/routes';
import { getMemberIdFromCookie, clearMemberIdCookie } from '@/lib/identity/cookie';

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
  const { familyMembers, loadFamily } = useFamily();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    async function verifyIdentity() {
      const isPublicPage = pathname === ROUTES.LANDING || pathname === ROUTES.ONBOARDING;
      
      // If we're on a public page, we're always "verified" to see it
      if (isPublicPage) {
        setIsVerified(true);
        return;
      }

      // Read the member_id cookie
      const cookieMemberId = getMemberIdFromCookie();

      if (cookieMemberId) {
        // Ensure family members are loaded in the client-side store
        // (Note: If coming from HomePage, they are already hydrated)
        if (familyMembers.length === 0) {
          await loadFamily();
        }
        
        const latestMembers = useFamilyStore.getState().familyMembers;
        const isValid = latestMembers.some((m) => m.id === cookieMemberId);
        
        if (!isValid) {
          console.warn('Stale identity detected. Clearing session.');
          clearMemberIdCookie();
          localStorage.removeItem('selectedMemberId');
          router.replace(ROUTES.ONBOARDING);
          return;
        }
      }

      setIsVerified(true);
    }

    void verifyIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // We don't block rendering anymore because middleware protects against guests.
  // This allows the app to feel snappy while the "stale check" runs in the background.
  return <>{children}</>;
}
