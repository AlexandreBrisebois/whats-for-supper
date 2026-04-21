import { apiClient } from './client';

import type { Recipe } from '@/types/domain';
import type { PaginatedResponse } from '@/types/api';

export async function getRecipes(page = 1, pageSize = 20): Promise<PaginatedResponse<Recipe>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<Recipe> }>('/api/recipes', {
    params: { page, pageSize },
  });
  return data.data;
}

export interface UpdateRecipePayload {
  notes?: string;
  rating?: number;
}

export async function updateRecipe(id: string, payload: UpdateRecipePayload): Promise<Recipe> {
  const { data } = await apiClient.patch<{ data: Recipe }>(`/api/recipes/${id}`, payload);
  return data.data;
}

export interface CreateRecipeResponse {
  recipeId: string;
  message: string;
}

export async function createRecipe(formData: FormData): Promise<CreateRecipeResponse> {
  const { data } = await apiClient.post<{ data: CreateRecipeResponse }>('/api/recipes', formData);
  return data.data;
}

/**
 * Fetches a recipe image by recipe ID and index.
 * Returns the image as a blob URL for use in <img> tags.
 */
export async function getRecipeImage(recipeId: string, index: number): Promise<string> {
  const response = await apiClient.get(`/api/recipes/${recipeId}/original/${index}`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data as Blob);
}
