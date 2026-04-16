'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getFamilyMembers, createFamilyMember, updateFamilyMember, deleteFamilyMember } from '@/lib/api/family';
import type { FamilyMember } from '@/types/domain';

interface FamilyState {
  familyMembers: FamilyMember[];
  selectedFamilyMemberId: string | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;

  setFamilyMembers: (members: FamilyMember[]) => void;
  selectFamilyMember: (id: string | null) => void;
  addMember: (name: string) => Promise<void>;
  updateMember: (id: string, name: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  loadFamilyMembers: () => Promise<void>;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      familyMembers: [],
      selectedFamilyMemberId: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setFamilyMembers: (members) => set({ familyMembers: members }),

      selectFamilyMember: (id) => set({ selectedFamilyMemberId: id }),

      addMember: async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({ isLoading: true, error: null });
        try {
          const member = await createFamilyMember({ name: trimmed });
          set((state) => ({
            familyMembers: [...state.familyMembers, member],
            isLoading: false,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to add member';
          set({ isLoading: false, error: message });
        }
      },

      updateMember: async (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({ isLoading: true, error: null });
        try {
          const updated = await updateFamilyMember(id, { name: trimmed });
          set((state) => ({
            familyMembers: state.familyMembers.map((m) => (m.id === id ? updated : m)),
            isLoading: false,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to update member';
          set({ isLoading: false, error: message });
        }
      },

      removeMember: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await deleteFamilyMember(id);
          set((state) => ({
            familyMembers: state.familyMembers.filter((m) => m.id !== id),
            selectedFamilyMemberId: state.selectedFamilyMemberId === id ? null : state.selectedFamilyMemberId,
            isLoading: false,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to remove member';
          set({ isLoading: false, error: message });
        }
      },

      loadFamilyMembers: async () => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          const members = await getFamilyMembers();
          set({ familyMembers: members, isLoading: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load family members';
          set({ isLoading: false, error: message });
        }
      },
    }),
    {
      name: 'family-storage',
      partialize: (state) => ({ selectedFamilyMemberId: state.selectedFamilyMemberId }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    }
  )
);
