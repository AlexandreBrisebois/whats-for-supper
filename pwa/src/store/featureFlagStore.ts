'use client';

import { create } from 'zustand';
import { getFeatureFlags, updateFeatureFlag, type FeatureFlag } from '@/lib/api/featureFlags';

interface FeatureFlagState {
  memberId: string | null;
  flags: Record<string, FeatureFlag>;
  loading: boolean;
  error: string | null;
  pending: Record<string, boolean>;
  mutationErrors: Record<string, string>;
  load: (memberId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  setEnabled: (key: string, enabled: boolean) => Promise<boolean>;
}

export const useFeatureFlagStore = create<FeatureFlagState>((set, get) => ({
  memberId: null,
  flags: {},
  loading: false,
  error: null,
  pending: {},
  mutationErrors: {},
  load: async (memberId) => {
    set({ memberId, flags: {}, error: null, loading: Boolean(memberId), mutationErrors: {} });
    if (!memberId) return;
    try {
      const flags = await getFeatureFlags();
      if (get().memberId !== memberId) return;
      set({ flags: Object.fromEntries(flags.map((flag) => [flag.key, flag])), loading: false });
    } catch {
      if (get().memberId === memberId)
        set({ flags: {}, loading: false, error: 'Unable to load preview features.' });
    }
  },
  refresh: async () => get().load(get().memberId),
  setEnabled: async (key, enabled) => {
    const previous = get().flags[key];
    if (!previous || get().pending[key]) return false;
    set((state) => ({
      pending: { ...state.pending, [key]: true },
      mutationErrors: { ...state.mutationErrors, [key]: '' },
    }));
    try {
      const confirmed = await updateFeatureFlag(key, enabled);
      set((state) => ({
        flags: { ...state.flags, [key]: confirmed },
        pending: { ...state.pending, [key]: false },
      }));
      return true;
    } catch (error) {
      if ((error as { status?: number }).status === 409) {
        await get().refresh();
        return false;
      }
      set((state) => ({
        pending: { ...state.pending, [key]: false },
        mutationErrors: {
          ...state.mutationErrors,
          [key]: "Couldn't save. Try again.",
        },
      }));
      return false;
    }
  },
}));

export function useFeatureFlag(key: string): boolean {
  return useFeatureFlagStore((state) => state.flags[key]?.enabled ?? false);
}
