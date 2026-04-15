// Re-export API client and all endpoint functions
export { apiClient } from './api/client';
export { getFamilyMembers, createFamilyMember, deleteFamilyMember } from './api/family';
export { getRecipes, createRecipe } from './api/recipes';

import { apiClient } from './api/client';

/**
 * Fetches a recipe image by recipe ID and index.
 * Returns the image as a blob URL for use in <img> tags.
 */
export async function getRecipeImage(recipeId: string, index: number): Promise<string> {
  const response = await apiClient.get(`/recipe/${recipeId}/original/${index}`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data as Blob);
}
