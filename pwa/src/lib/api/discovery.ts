import { apiClient } from './api-client';
import type { RecipeDto } from './generated/models/index';

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

function mapToDiscoveryRecipe(dto: RecipeDto): DiscoveryRecipe {
  return {
    id: dto.id || '',
    name: dto.name || '',
    description: dto.description || '',
    imageUrl: dto.imageUrl || '',
    totalTime: dto.totalTime || '',
    difficulty: dto.difficulty || '',
    category: dto.category || '',
    hasFamilyInterest: false, // Map this if available in DTO
  };
}

export async function getCategories(): Promise<string[]> {
  const result = await apiClient.api.discovery.categories.get();
  return result?.data || [];
}

export async function getDiscoveryStack(category: string): Promise<DiscoveryRecipe[]> {
  const result = await apiClient.api.discovery.get({
    queryParameters: { category },
  });
  return result?.data?.map(mapToDiscoveryRecipe) || [];
}

export async function submitVote(recipeId: string, vote: 0 | 1 | 2): Promise<void> {
  await apiClient.api.discovery.byId(recipeId as any).vote.post({
    vote,
  });
}
