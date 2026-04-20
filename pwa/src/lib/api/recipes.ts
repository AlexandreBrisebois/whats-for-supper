import { apiClient } from './client';

import type { Recipe } from '@/types/domain';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export async function getRecipes(page = 1, pageSize = 20): Promise<PaginatedResponse<Recipe>> {
  const { data } = await apiClient.get<PaginatedResponse<Recipe>>('/api/recipes', {
    params: { page, pageSize },
  });
  return data;
}

export interface UpdateRecipePayload {
  notes?: string;
  rating?: number;
}

export async function updateRecipe(id: string, payload: UpdateRecipePayload): Promise<Recipe> {
  const { data } = await apiClient.patch<Recipe>(`/api/recipes/${id}`, payload);
  return data;
}

export interface CreateRecipeResponse {
  recipeId: string;
  message: string;
}

export async function createRecipe(formData: FormData): Promise<CreateRecipeResponse> {
  const { data } = await apiClient.post<CreateRecipeResponse>('/api/recipes', formData);
  return data;
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
