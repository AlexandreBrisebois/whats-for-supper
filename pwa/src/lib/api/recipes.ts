import { apiClient } from './client';

import type { Recipe } from '@/types/domain';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export async function getRecipes(page = 1, pageSize = 20): Promise<PaginatedResponse<Recipe>> {
  const { data } = await apiClient.get<PaginatedResponse<Recipe>>('/api/recipes', {
    params: { page, pageSize },
  });
  return data;
}

export async function createRecipe(formData: FormData): Promise<Recipe> {
  const { data } = await apiClient.post<ApiResponse<Recipe>>('/api/recipes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}
