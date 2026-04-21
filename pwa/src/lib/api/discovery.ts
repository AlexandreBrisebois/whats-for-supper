import { apiClient } from './client';

export interface DiscoveryRecipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  totalTime: string;
  difficulty: string;
  category: string;
}

export async function getCategories(): Promise<string[]> {
  const { data } = await apiClient.get<{ data: string[] }>('/api/discovery/categories');
  return data.data || [];
}

export async function getDiscoveryStack(category: string): Promise<DiscoveryRecipe[]> {
  const { data } = await apiClient.get<{ data: DiscoveryRecipe[] }>(`/api/discovery`, {
    params: { category },
  });
  return data.data || [];
}

export async function submitVote(recipeId: string, vote: 1 | 2): Promise<void> {
  await apiClient.post(`/api/discovery/${recipeId}/vote`, { vote });
}
