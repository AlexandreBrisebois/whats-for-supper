'use client';

import { create } from 'zustand';
import {
  getFamilyMembers,
  getCurrentFamilyMember,
  createFamilyMember,
  updateFamilyMember,
  updateFamilyMemberPreferences,
  deleteFamilyMember,
} from '@/lib/api/family';
import {
  getFamilyMemberIdCookie,
  setFamilyMemberIdCookie,
  removeFamilyMemberIdCookie,
} from '@/lib/identity/cookie';
import { setFamilyMemberCookie, clearFamilyMemberCookie } from '@/lib/auth';
import { apiClient } from '@/lib/api/api-client';
import type { GoToListDto, GoToItem } from '@/lib/api/generated/models/index';
import type { FamilyMember } from '@/types/domain';

interface FamilyState {
  familyMembers: FamilyMember[];
  selectedFamilyMemberId: string | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
  hasLoaded: boolean;
  familySettings: Record<string, unknown>;

  setFamilyMembers: (members: FamilyMember[]) => void;
  selectFamilyMember: (id: string | null) => Promise<void>;
  addMember: (name: string) => Promise<FamilyMember | null>;
  updateMember: (id: string, name: string) => Promise<void>;
  updateMemberPreferences: (
    id: string,
    preferences: { browseViewMode?: 'stack' | 'list'; preferredLanguage?: 'en' | 'fr' }
  ) => Promise<FamilyMember | null>;
  removeMember: (id: string) => Promise<void>;
  loadFamilyMembers: () => Promise<void>;
  loadSetting: (key: string) => Promise<unknown | null>;
  saveSetting: (key: string, value: any) => Promise<void>;
  loadGoTo: () => Promise<GoToListDto | null>;
  saveGoTo: (dto: GoToListDto) => Promise<void>;
  loadActiveGoTo: () => Promise<GoToItem | null>;
  loadCurrentIdentity: () => Promise<void>;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  familyMembers: [],
  // Initialize from cookie if on client
  selectedFamilyMemberId:
    typeof window !== 'undefined' ? (getFamilyMemberIdCookie() ?? null) : null,
  isLoading: false,
  error: null,
  _hasHydrated: typeof window !== 'undefined',
  hasLoaded: false,
  familySettings: {},

  setFamilyMembers: (members) => set({ familyMembers: members }),

  selectFamilyMember: async (id) => {
    if (id) {
      await setFamilyMemberCookie(id);
      // Fallback for non-HttpOnly environments (local dev/test)
      setFamilyMemberIdCookie(id);
    } else {
      await clearFamilyMemberCookie();
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

  updateMemberPreferences: async (
    id: string,
    preferences: { browseViewMode?: 'stack' | 'list'; preferredLanguage?: 'en' | 'fr' }
  ) => {
    set({ error: null });
    const existing = get().familyMembers.find((member) => member.id === id);
    if (!existing) return null;

    set((state) => ({
      familyMembers: state.familyMembers.map((member) =>
        member.id === id ? { ...member, ...preferences } : member
      ),
    }));

    try {
      const updated = await updateFamilyMemberPreferences(id, preferences as any);
      set((state) => ({
        familyMembers: state.familyMembers.map((member) => (member.id === id ? updated : member)),
      }));
      return updated;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update family member preferences';
      set((state) => ({
        familyMembers: state.familyMembers.map((member) => (member.id === id ? existing : member)),
        error: message,
      }));
      return null;
    }
  },

  removeMember: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteFamilyMember(id);
      const isSelected = get().selectedFamilyMemberId === id;
      if (isSelected) {
        await clearFamilyMemberCookie();
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
      set({ familyMembers: members ?? [], isLoading: false, hasLoaded: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load family members';
      set({ isLoading: false, error: message, hasLoaded: true });
    }
  },

  loadSetting: async (key: string) => {
    try {
      const response = await apiClient.api.settings.byKey(key).get();
      // value is now a typed GoToSettingValue — read it directly.
      const value = response?.data?.value ?? null;
      set((state) => ({
        familySettings: { ...state.familySettings, [key]: value },
      }));
      return value;
    } catch (err: unknown) {
      // 404 means not configured yet — store null and return null
      const status =
        err != null && typeof err === 'object' && 'responseStatusCode' in err
          ? (err as { responseStatusCode: number }).responseStatusCode
          : undefined;
      if (status === 404) {
        set((state) => ({
          familySettings: { ...state.familySettings, [key]: null },
        }));
        return null;
      }
      console.error(`Failed to load setting "${key}":`, err);
      return null;
    }
  },

  saveSetting: async (key: string, value: any) => {
    const response = await apiClient.api.settings.byKey(key).post({ key, value });
    // Use the echoed value from the server, fall back to what we sent.
    const saved = response?.data?.value ?? value;
    set((state) => ({
      familySettings: { ...state.familySettings, [key]: saved },
    }));
  },

  loadGoTo: async () => {
    try {
      const response = await apiClient.api.goto.get();
      const value = response?.data ?? { items: [] };
      set((state) => ({
        familySettings: { ...state.familySettings, family_goto: value },
      }));
      return value;
    } catch (err) {
      console.error('Failed to load GOTO list:', err);
      return null;
    }
  },

  saveGoTo: async (dto: GoToListDto) => {
    await apiClient.api.goto.put(dto);
    set((state) => ({
      familySettings: { ...state.familySettings, family_goto: dto },
    }));
  },

  loadActiveGoTo: async () => {
    try {
      const response = await apiClient.api.goto.active.get();
      return response?.data ?? null;
    } catch (err) {
      // 404 is normal if no ready recipes
      return null;
    }
  },

  loadCurrentIdentity: async () => {
    // If we already have a selected member, no need to reload unless explicitly requested.
    // However, for hydration recovery, we check the server.
    try {
      const member = await getCurrentFamilyMember();
      if (member) {
        set({ selectedFamilyMemberId: member.id });
        // Also ensure it's in the list
        const members = get().familyMembers;
        if (!members.find((m) => m.id === member.id)) {
          set({ familyMembers: [...members, member] });
        }
      }
    } catch (err) {
      console.error('Failed to recover family identity from server:', err);
    }
  },
}));
