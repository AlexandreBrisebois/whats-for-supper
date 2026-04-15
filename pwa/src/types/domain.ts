export type RecipeRating = 1 | 2 | 3 | 4;

export interface FamilyMember {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  completedTours?: string[];
}

export interface RecipeImage {
  url: string;
  isFinishedDish: boolean;
}

export interface Recipe {
  id: string;
  label?: string;
  notes?: string;
  images: RecipeImage[];
  rating: RecipeRating;
  capturedBy: string;
  capturedAt: string;
  familyId: string;
}

export interface RecipeImport {
  sourceUrl: string;
  label?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  recipeId?: string;
}

export interface HintStep {
  targetSelector: string;
  titleKey?: string;
  descriptionKey?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  highlightPadding?: number;
  actionKey?: string;
  allowSkip?: boolean;
}

export interface HintTourConfig {
  tourId: string;
  steps: HintStep[];
  locale: 'en' | 'fr';
}

export interface CompletedTour {
  completed_at: string;
  device_id: string;
}

export interface CompletionInfo {
  completedAt: string;
  deviceId?: string;
}
