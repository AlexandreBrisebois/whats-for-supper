import { create } from 'zustand';

interface SearchPromotionState {
  version: number;
  invalidate: () => void;
  reset: () => void;
}

/** Search-only schedule freshness signal; Discovery must not consume this state. */
export const useSearchPromotionStore = create<SearchPromotionState>((set) => ({
  version: 0,
  invalidate: () => set((state) => ({ version: state.version + 1 })),
  reset: () => set({ version: 0 }),
}));
