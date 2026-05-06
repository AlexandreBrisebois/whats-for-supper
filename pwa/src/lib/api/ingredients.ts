import { requestAdapter } from './api-client';
import { useFamilyStore } from '@/store/familyStore';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';

export async function reclassifyIngredient(
  normalizedKey: string,
  grocerySection: GrocerySection
): Promise<void> {
  const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;

  const response = await fetch(
    `${requestAdapter.baseUrl}/api/ingredients/${encodeURIComponent(normalizedKey)}/category`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Family-Member-Id': familyMemberId || '',
      },
      body: JSON.stringify({ grocerySection }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to reclassify ingredient: ${response.statusText}`);
  }
}
