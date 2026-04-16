'use client';

import { useRef } from 'react';
import { useFamilyStore } from '@/store/familyStore';
import type { FamilyMember } from '@/types/domain';

interface StoreInitializerProps {
  familyMembers: FamilyMember[];
}

/**
 * StoreInitializer is a small utility component that "hydrates" 
 * the Zustand store with data fetched from a Server Component.
 * This ensures the client-side state is ready immediately on load.
 */
export function StoreInitializer({ familyMembers }: StoreInitializerProps) {
  const initialized = useRef(false);

  if (!initialized.current) {
    useFamilyStore.setState({
      familyMembers,
    });
    initialized.current = true;
  }

  return null;
}
