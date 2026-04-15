'use client';

import { useFamilyStore } from '@/store/familyStore';

/**
 * Custom hook that wraps the family Zustand store.
 * Exposes family members, selection state, and async actions.
 */
export function useFamily() {
  const {
    familyMembers,
    selectedMemberId,
    isLoading,
    error,
    selectMember,
    addMember,
    removeMember,
    loadFamilyMembers,
  } = useFamilyStore();

  const selectedMember = familyMembers?.find((m) => m.id === selectedMemberId) ?? null;

  return {
    familyMembers,
    selectedMember,
    selectedMemberId,
    isLoading,
    error,
    selectMember,
    addMember,
    removeMember,
    loadFamily: loadFamilyMembers,
  };
}
