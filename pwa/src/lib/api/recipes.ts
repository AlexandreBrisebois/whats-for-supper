import { apiClient, requestAdapter } from './api-client';
import { useFamilyStore } from '@/store/familyStore';
import type { RecipeDto, RecommendationResultDto } from './generated/models/index';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  totalTime: string;
  difficulty: string;
  category: string;
  rating: number;
}

export type RecommendationResult = {
  id: string;
  name: string;
  time: string;
  image: string;
};

export type RecommendationsResponse = {
  topPick: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    prepTime: string;
    difficulty: string;
  } | null;
  results: RecommendationResult[];
};

function mapToRecipe(dto: RecipeDto): Recipe {
  return {
    id: dto.id || '',
    name: dto.name || '',
    description: dto.description || '',
    imageUrl: dto.imageUrl || '',
    totalTime: dto.totalTime || '',
    difficulty: dto.difficulty || '',
    category: dto.category || '',
    rating: dto.rating || 0,
  };
}

export async function getRecipes(
  page = 1,
  limit = 20
): Promise<{ recipes: Recipe[]; total: number }> {
  const result = await apiClient.api.recipes.get({
    queryParameters: { page, limit },
  });
  return {
    recipes: result?.recipes?.map(mapToRecipe) || [],
    total: result?.pagination?.total || 0,
  };
}

export async function getRecipe(id: string): Promise<Recipe> {
  const result = await apiClient.api.recipes.byId(id as any).get();
  if (!result?.recipe) throw new Error('Recipe not found');
  return mapToRecipe(result.recipe);
}

export async function createRecipe(formData: FormData): Promise<{ id: string }> {
  // Use native fetch for multipart FormData to avoid Kiota serialization issues
  const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/backend';

  const response = await fetch(`${baseUrl}/api/recipes`, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Family-Member-Id': familyMemberId || '',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to create recipe: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    id: (result?.data as any)?.id || '',
  };
}

export async function deleteRecipe(id: string): Promise<void> {
  await apiClient.api.recipes.byId(id as any).delete();
}

export async function updateRecipe(
  id: string,
  updates: { notes?: string; rating?: number }
): Promise<void> {
  await apiClient.api.recipes.byId(id as any).patch({
    notes: updates.notes,
    rating: updates.rating,
  });
}

export async function getRecommendations(): Promise<RecommendationsResponse> {
  const result = await apiClient.api.recipes.recommendations.get();
  const data = result?.data;
  return {
    topPick: data?.topPick
      ? {
          id: data.topPick.id || '',
          name: data.topPick.name || '',
          description: data.topPick.description || '',
          imageUrl: data.topPick.imageUrl || '',
          prepTime: data.topPick.prepTime || '',
          difficulty: data.topPick.difficulty || '',
        }
      : null,
    results: (data?.results || []).map((r: RecommendationResultDto) => ({
      id: r.id || '',
      name: r.name || '',
      time: r.time || '',
      image: r.image || '',
    })),
  };
}

/**
 * Fetches a recipe image by recipe ID and index.
 * Returns the image as a blob URL for use in <img> tags.
 */
export async function getRecipeImage(recipeId: string, index: number): Promise<string> {
  const response = await fetch(
    `${requestAdapter.baseUrl}/api/recipes/${recipeId}/original/${index}`
  );
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
