import { apiClient } from './client';

import type { Recipe } from '@/types/domain';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export async function getRecipes(page = 1, pageSize = 20): Promise<PaginatedResponse<Recipe>> {
  const { data } = await apiClient.get<PaginatedResponse<Recipe>>('/api/recipes', {
    params: { page, pageSize },
  });
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
