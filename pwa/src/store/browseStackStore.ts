import { create } from 'zustand';
import type { RecipeDto } from '@/lib/api/generated/models/index';

interface BrowseStackStore {
  // Stack state
  recipes: RecipeDto[];
  currentIndex: number;
  totalCount: number;

  // Pagination state
  currentPage: number;
  isLoading: boolean;
  hasMorePages: boolean;

  // Actions
  setRecipes: (recipes: RecipeDto[]) => void;
  appendRecipes: (recipes: RecipeDto[]) => void;
  setCurrentIndex: (index: number) => void;
  setTotalCount: (count: number) => void;
  nextCard: () => void;
  previousCard: () => void;
  reset: () => void;
}

const initialState = {
  recipes: [] as RecipeDto[],
  currentIndex: 0,
  totalCount: 0,
  currentPage: 1,
  isLoading: false,
  hasMorePages: false,
};

/**
 * Store for the Browse All Stack feature.
 * Manages the recipe card stack state, navigation, and pagination.
 * Intentionally separate from discoveryStore — browse uses explore ordering,
 * not vote-driven ordering.
 */
export const useBrowseStackStore = create<BrowseStackStore>((set, get) => ({
  ...initialState,

  setRecipes(recipes) {
    set({ recipes });
  },

  appendRecipes(recipes) {
    set((s) => ({ recipes: [...s.recipes, ...recipes] }));
  },

  setCurrentIndex(index) {
    set({ currentIndex: index });
  },

  setTotalCount(count) {
    set({ totalCount: count });
  },

  nextCard() {
    set((s) => ({ currentIndex: s.currentIndex + 1 }));
  },

  previousCard() {
    const { currentIndex } = get();
    if (currentIndex <= 0) return;
    set({ currentIndex: currentIndex - 1 });
  },

  reset() {
    set({ ...initialState });
  },
}));
