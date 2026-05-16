'use client';

import { useFamilyStore } from '@/store/familyStore';

/**
 * Custom hook that wraps the family Zustand store.
 * Exposes family members, selection state, and async actions.
 */
export function useFamily() {
  const {
    familyMembers,
    selectedFamilyMemberId,
    isLoading,
    error,
    selectFamilyMember,
    addMember,
    updateMember,
    updateMemberPreferences,
    removeMember,
    loadFamilyMembers,
    _hasHydrated,
    hasLoaded,
  } = useFamilyStore();

  const selectedMember =
    familyMembers?.find(
      (m) => String(m.id).toLowerCase() === String(selectedFamilyMemberId).toLowerCase()
    ) ?? null;

  return {
    familyMembers,
    selectedMember,
    selectedFamilyMemberId,
    isLoading,
    error,
    _hasHydrated,
    hasLoaded,
    selectFamilyMember,
    addMember,
    updateMember,
    updateMemberPreferences,
    removeMember,
    loadFamily: loadFamilyMembers,
  };
}
