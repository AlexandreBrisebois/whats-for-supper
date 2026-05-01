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
import { apiClient } from '@/lib/api/api-client';
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
  selectFamilyMember: (id: string | null) => void;
  addMember: (name: string) => Promise<FamilyMember | null>;
  updateMember: (id: string, name: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  loadFamilyMembers: () => Promise<void>;
  loadSetting: (key: string) => Promise<unknown | null>;
  saveSetting: (key: string, value: unknown) => Promise<void>;
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
      set({ familyMembers: members ?? [], isLoading: false, hasLoaded: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load family members';
      set({ isLoading: false, error: message, hasLoaded: true });
    }
  },

  loadSetting: async (key: string) => {
    try {
      const response = await apiClient.api.settings.byKey(key).get();
      // SettingsDto_value is an AdditionalDataHolder — raw fields live in additionalData
      const value = response?.data?.value?.additionalData ?? null;
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

  saveSetting: async (key: string, value: unknown) => {
    // Kiota's SettingsDto_value serializer only writes additionalData.
    // We must put the value fields into additionalData so they survive serialization.
    const valueAsRecord = value as Record<string, unknown>;
    const response = await apiClient.api.settings.byKey(key).post({
      key,
      value: { additionalData: valueAsRecord } as any,
    });
    // On GET, Kiota puts unknown fields into additionalData — use that if available,
    // otherwise fall back to the value we sent (optimistic update).
    const saved = response?.data?.value?.additionalData ?? valueAsRecord;
    set((state) => ({
      familySettings: { ...state.familySettings, [key]: saved },
    }));
  },
}));
