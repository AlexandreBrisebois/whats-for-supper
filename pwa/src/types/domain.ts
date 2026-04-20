export type RecipeRating = 0 | 1 | 2 | 3; // 0=Unknown, 1=Dislike, 2=Like, 3=Love

export interface FamilyMember {
  id: string;
  name: string;
}

export interface RecipeImage {
  url: string;
  isFinishedDish: boolean;
}

export interface Recipe {
  id: string;
  rating: RecipeRating;
  addedBy: string;
  images: number[]; // Indices available for /api/recipes/{id}/original/{index}
  createdAt: string;
  notes?: string;
  label?: string;
}

export interface RecipeImport {
  sourceUrl: string;
  label?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  recipeId?: string;
}
