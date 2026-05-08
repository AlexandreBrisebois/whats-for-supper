import { create } from 'zustand';
import type { RecipeDto } from '@/lib/api/generated/models/index';

// ---------------------------------------------------------------------------
// BrowseStackStore
// Manages state for the Browse All Stack overlay.
// Requirements: 1, 2
// ---------------------------------------------------------------------------

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
  currentPage: 0,
  isLoading: false,
  hasMorePages: false,
};

export const useBrowseStackStore = create<BrowseStackStore>((set, get) => ({
  ...initialState,

  setRecipes: (recipes) => set({ recipes }),

  appendRecipes: (recipes) =>
    set((state) => ({ recipes: [...state.recipes, ...recipes] })),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  setTotalCount: (count) => set({ totalCount: count }),

  nextCard: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.recipes.length - 1),
    })),

  previousCard: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),

  reset: () => set({ ...initialState }),
}));
