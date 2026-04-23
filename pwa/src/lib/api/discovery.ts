import { apiClient } from './client';

export interface DiscoveryRecipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  totalTime: string;
  difficulty: string;
  category: string;
  hasFamilyInterest?: boolean;
}

export async function getCategories(): Promise<string[]> {
  const { data } = await apiClient.get<{ data: string[] }>('/discovery/categories');
  return data.data || [];
}

export async function getDiscoveryStack(category: string): Promise<DiscoveryRecipe[]> {
  const { data } = await apiClient.get<{ data: DiscoveryRecipe[] }>(`/discovery`, {
    params: { category },
  });
  return data.data || [];
}

export async function submitVote(recipeId: string, vote: 1 | 2): Promise<void> {
  await apiClient.post(`/discovery/${recipeId}/vote`, { vote });
}
