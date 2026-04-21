'use client';

import { create } from 'zustand';
import {
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from '@/lib/api/family';
import {
  getFamilyMemberIdCookie,
  setFamilyMemberIdCookie,
  removeFamilyMemberIdCookie,
} from '@/lib/identity/cookie';
import type { FamilyMember } from '@/types/domain';

interface FamilyState {
  familyMembers: FamilyMember[];
  selectedFamilyMemberId: string | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;

  setFamilyMembers: (members: FamilyMember[]) => void;
  selectFamilyMember: (id: string | null) => void;
  addMember: (name: string) => Promise<FamilyMember | null>;
  updateMember: (id: string, name: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  loadFamilyMembers: () => Promise<void>;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  familyMembers: [],
  // Initialize from cookie if on client
  selectedFamilyMemberId:
    typeof window !== 'undefined' ? (getFamilyMemberIdCookie() ?? null) : null,
  isLoading: false,
  error: null,
  _hasHydrated: typeof window !== 'undefined',

  setFamilyMembers: (members) => set({ familyMembers: members }),

  selectFamilyMember: (id) => {
    if (id) {
      setFamilyMemberIdCookie(id);
    } else {
      removeFamilyMemberIdCookie();
    }
    set({ selectedFamilyMemberId: id });
  },

  addMember: async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    set({ isLoading: true, error: null });
    try {
      const member = await createFamilyMember({ name: trimmed });
      set((state) => ({
        familyMembers: [...state.familyMembers, member],
        isLoading: false,
      }));
      return member;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add member';
      set({ isLoading: false, error: message });
      return null;
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
      const isSelected = get().selectedFamilyMemberId === id;
      if (isSelected) {
        removeFamilyMemberIdCookie();
      }
      set((state) => ({
        familyMembers: state.familyMembers.filter((m) => m.id !== id),
        selectedFamilyMemberId: isSelected ? null : state.selectedFamilyMemberId,
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
      set({ familyMembers: members ?? [], isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load family members';
      set({ isLoading: false, error: message });
    }
  },
}));
