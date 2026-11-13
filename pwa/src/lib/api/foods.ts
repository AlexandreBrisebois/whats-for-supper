import { RetryHandlerOptions } from '@microsoft/kiota-http-fetchlibrary';
import { apiClient } from './api-client';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';

/** A lost reply requires an authoritative read before the user decides another correction. */
export async function reclassifyFoodCategory(
  foodId: string,
  grocerySection: GrocerySection,
  expectedCategoryRevision: string | null
): Promise<void> {
  await apiClient.api.foods
    .byFoodId(foodId)
    .category.patch(
      { grocerySection, expectedCategoryRevision },
      { options: [new RetryHandlerOptions({ maxRetries: 0 })] }
    );
}
