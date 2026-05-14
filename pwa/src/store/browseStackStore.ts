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
  isPrefetching: boolean;
  loadError: boolean;
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
  isPrefetching: false,
  loadError: false,
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
    set((s) => {
      // In list view we want a contiguous array.
      // In stack view we might have holes if we wrap-around.
      // However, appendRecipes is mostly used for forward infinite scroll.
      const existingIds = new Set(s.recipes.map((recipe) => recipe?.id).filter(Boolean));
      const deduped = recipes.filter((recipe) => {
        if (!recipe.id || existingIds.has(recipe.id)) return false;
        existingIds.add(recipe.id);
        return true;
      });

      // If we already have a sparse array with a large length,
      // we should find the first empty slot or just append if it's contiguous.
      // For simplicity, if it's already sparse, we might need a different approach.
      // But for the "Browse All Stack", we usually start at 1 and go forward.
      const merged = [...s.recipes, ...deduped];
      return { recipes: merged };
    });
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
