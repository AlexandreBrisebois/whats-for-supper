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

// A member can switch away and back while a request is still in flight.
let memberVersion = 0;

export const useFeatureFlagStore = create<FeatureFlagState>((set, get) => ({
  memberId: null,
  flags: {},
  loading: false,
  error: null,
  pending: {},
  mutationErrors: {},
  load: async (memberId) => {
    const memberChanged = get().memberId !== memberId;
    if (memberChanged) memberVersion += 1;
    const requestVersion = memberVersion;
    set({
      memberId,
      flags: {},
      error: null,
      loading: Boolean(memberId),
      mutationErrors: {},
      ...(memberChanged ? { pending: {} } : {}),
    });
    if (!memberId) return;
    try {
      const flags = await getFeatureFlags();
      if (memberVersion !== requestVersion) return;
      set({ flags: Object.fromEntries(flags.map((flag) => [flag.key, flag])), loading: false });
    } catch {
      if (memberVersion === requestVersion)
        set({ flags: {}, loading: false, error: 'Unable to load preview features.' });
    }
  },
  refresh: async () => get().load(get().memberId),
  setEnabled: async (key, enabled) => {
    const previous = get().flags[key];
    if (!previous || get().pending[key]) return false;
    const requestVersion = memberVersion;
    set((state) => ({
      pending: { ...state.pending, [key]: true },
      mutationErrors: { ...state.mutationErrors, [key]: '' },
    }));
    try {
      const confirmed = await updateFeatureFlag(key, enabled);
      if (memberVersion !== requestVersion) return false;
      set((state) => ({
        flags: { ...state.flags, [key]: confirmed },
        pending: { ...state.pending, [key]: false },
      }));
      return true;
    } catch (error) {
      if (memberVersion !== requestVersion) return false;
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
    } finally {
      if (memberVersion === requestVersion) {
        set((state) => ({ pending: { ...state.pending, [key]: false } }));
      }
    }
  },
}));

export function useFeatureFlag(key: string): boolean {
  return useFeatureFlagStore((state) => state.flags[key]?.enabled ?? false);
}
