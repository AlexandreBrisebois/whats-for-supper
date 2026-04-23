import { apiClient } from './client';

import type { Recipe } from '@/types/domain';
import type { PaginatedResponse } from '@/types/api';

export async function getRecipes(page = 1, pageSize = 20): Promise<PaginatedResponse<Recipe>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<Recipe> }>('/recipes', {
    params: { page, pageSize },
  });
  return data.data;
}

export interface UpdateRecipePayload {
  notes?: string;
  rating?: number;
}

export async function updateRecipe(id: string, payload: UpdateRecipePayload): Promise<Recipe> {
  const { data } = await apiClient.patch<{ data: Recipe }>(`/recipes/${id}`, payload);
  return data.data;
}

export interface CreateRecipeResponse {
  recipeId: string;
  message: string;
}

export async function createRecipe(formData: FormData): Promise<CreateRecipeResponse> {
  const { data } = await apiClient.post<{ data: CreateRecipeResponse }>('/recipes', formData);
  return data.data;
}

export interface RecommendationResult {
  id: string;
  name: string;
  time: string;
  image: string;
}

export interface RecommendationsResponse {
  topPick: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    prepTime: string;
    difficulty: string;
  };
  results: RecommendationResult[];
}

export async function getRecommendations(): Promise<RecommendationsResponse> {
  const { data } = await apiClient.get<{ data: RecommendationsResponse }>(
    '/recipes/recommendations'
  );
  return data.data;
}

/**
 * Fetches a recipe image by recipe ID and index.
 * Returns the image as a blob URL for use in <img> tags.
 */
export async function getRecipeImage(recipeId: string, index: number): Promise<string> {
  const response = await apiClient.get(`/recipes/${recipeId}/original/${index}`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data as Blob);
}
