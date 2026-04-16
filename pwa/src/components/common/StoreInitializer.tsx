'use client';

import { useRef } from 'react';
import { useFamilyStore } from '@/store/familyStore';
import type { FamilyMember } from '@/types/domain';

interface StoreInitializerProps {
  familyMembers: FamilyMember[];
  selectedMemberId: string | null;
}

/**
 * StoreInitializer is a small utility component that "hydrates" 
 * the Zustand store with data fetched from a Server Component.
 * This ensures the client-side state is ready immediately on load.
 */
export function StoreInitializer({ familyMembers, selectedMemberId }: StoreInitializerProps) {
  const initialized = useRef(false);

  if (!initialized.current) {
    useFamilyStore.setState({
      familyMembers,
      selectedMemberId,
    });
    initialized.current = true;
  }

  return null;
}
