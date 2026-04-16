'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getFamilyMembers, createFamilyMember, deleteFamilyMember } from '@/lib/api/family';
import type { FamilyMember } from '@/types/domain';

interface FamilyState {
  familyMembers: FamilyMember[];
  selectedMemberId: string | null;
  isLoading: boolean;
  error: string | null;

  setFamilyMembers: (members: FamilyMember[]) => void;
  selectMember: (id: string | null) => void;
  addMember: (name: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  loadFamilyMembers: () => Promise<void>;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      familyMembers: [],
      selectedMemberId: null,
      isLoading: false,
      error: null,

      setFamilyMembers: (members) => set({ familyMembers: members }),

      selectMember: (id) => set({ selectedMemberId: id }),

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

      removeMember: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await deleteFamilyMember(id);
          set((state) => ({
            familyMembers: state.familyMembers.filter((m) => m.id !== id),
            selectedMemberId: state.selectedMemberId === id ? null : state.selectedMemberId,
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
      partialize: (state) => ({ selectedMemberId: state.selectedMemberId }),
    }
  )
);
