import type { IngredientProjection } from '@/lib/api/generated/models';
import type { IngredientContext } from '@/lib/api/recipes';

export type CookingViewMode = 'step-by-step' | 'all-steps';

export type PreparationReviewState = 'required' | 'quantities' | null;

export type CookingViewSaveState = 'idle' | 'saving' | 'saved' | 'failed';

export interface CooksModeRecipeSummary {
  id: string;
  name: string | null;
  image: string;
  isVegetarian?: boolean;
  isCold?: boolean;
}

export interface CooksModeProps {
  recipe: CooksModeRecipeSummary;
  ingredientContext?: IngredientContext;
  onClose: () => void;
  /** Optional notification after the viewed recipe's cooking completion has been saved. */
  onCooked?: () => void;
}

export interface CookingIngredientItem {
  key: string;
  text: string;
}

export interface ProjectionReadState {
  key: string;
  data?: IngredientProjection;
  error?: boolean;
}

export interface QuantityNoticeState {
  key: string;
  available: boolean;
  error: boolean;
}

export interface QuantityGenerationControls {
  nextGeneration: () => number;
  currentGeneration: () => number;
  bumpGeneration: () => void;
  getAppliedProjection: () => IngredientProjection | undefined;
}
