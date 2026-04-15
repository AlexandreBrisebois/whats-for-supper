import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { FamilyMember } from '@/types/domain';

interface IdentityState {
  currentMemberId: string | null;
  members: FamilyMember[];
  setCurrentMember: (id: string) => void;
  addMember: (member: FamilyMember) => void;
  clearIdentity: () => void;
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      currentMemberId: null,
      members: [],
      setCurrentMember: (id) => set({ currentMemberId: id }),
      addMember: (member) => set((state) => ({ members: [...state.members, member] })),
      clearIdentity: () => set({ currentMemberId: null }),
    }),
    {
      name: 'identity-storage',
    }
  )
);
