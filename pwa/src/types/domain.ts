export type RecipeRating = 1 | 2 | 3 | 4;

export interface FamilyMember {
  id: string;
  name: string;
  createdAt: string;
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
