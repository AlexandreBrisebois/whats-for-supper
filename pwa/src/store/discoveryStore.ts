import { create } from 'zustand';

interface DiscoveryState {
  hasPendingCards: boolean;
  setHasPendingCards: (hasCards: boolean) => void;
}

/**
 * Lightweight store to track if the discovery queue has items.
 * Used primarily by the Navigation component to trigger the pulse signal.
 */
export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  hasPendingCards: false,
  setHasPendingCards: (hasCards) => set({ hasPendingCards: hasCards }),
}));
