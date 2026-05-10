import { create } from 'zustand';
import type { RecipeDto } from '@/lib/api/generated/models/index';

/**
 * Interface for the BrowseStackStore.
 * Manages state for the Browse All Stack overlay.
 * Requirements: 1, 2
 */
export interface BrowseStackStore {
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
  appendRecipes: (recipes: RecipeDto[], maxRetained?: number) => void;
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

  appendRecipes(recipes, maxRetained) {
    set((s) => {
      const existingIds = new Set(s.recipes.map((recipe) => recipe.id).filter(Boolean));
      const deduped = recipes.filter((recipe) => {
        if (!recipe.id || existingIds.has(recipe.id)) return false;
        existingIds.add(recipe.id);
        return true;
      });
      const merged = [...s.recipes, ...deduped];
      return { recipes: maxRetained ? merged.slice(-maxRetained) : merged };
    });
  },

  setCurrentIndex(index) {
    set({ currentIndex: index });
  },

  setTotalCount(count) {
    set({ totalCount: count });
  },

  nextCard() {
    // We allow currentIndex to exceed recipes.length to show the EndCard
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
