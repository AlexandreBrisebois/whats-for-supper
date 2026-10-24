import { apiClient } from './api-client';
import type { GroceryExtraDto, GrocerySection as ApiGrocerySection } from './generated/models';

export async function createGroceryExtra(
  name: string,
  weekStartDate: string,
  clientId: string
): Promise<GroceryExtraDto> {
  const result = await apiClient.api.groceryExtras.post({
    name,
    weekStartDate: weekStartDate as never,
    clientId: clientId as never,
  });
  if (!result) throw new Error('The extra was not returned by the server.');
  return result;
}

export async function suggestGroceryExtraNames(query: string): Promise<string[]> {
  const result = await apiClient.api.groceryExtras.suggestions.get({ queryParameters: { query } });
  return (result?.names ?? [])
    .filter((name): name is string => typeof name === 'string')
    .slice(0, 3);
}

export async function updateGroceryExtra(
  extra: GroceryExtraDto,
  change: { name: string } | { checked: boolean } | { grocerySection: string }
): Promise<GroceryExtraDto> {
  if (!extra.id || !extra.occurrenceWeekStartDate || extra.version == null)
    throw new Error('This extra must be refreshed before it can be changed.');
  const result = await apiClient.api.groceryExtras.byOccurrenceId(extra.id).patch({
    expectedVersion: extra.version,
    weekStartDate: extra.occurrenceWeekStartDate,
    ...('grocerySection' in change
      ? { grocerySection: change.grocerySection as ApiGrocerySection }
      : change),
  });
  if (!result) throw new Error('The updated extra was not returned by the server.');
  return result;
}

export type GroceryExtraConflict = Error & {
  current?: GroceryExtraDto | null;
  absent?: boolean | null;
};

export async function deleteGroceryExtra(extra: GroceryExtraDto): Promise<void> {
  if (!extra.id || !extra.occurrenceWeekStartDate || extra.version == null)
    throw new Error('This extra must be refreshed before it can be deleted.');
  await apiClient.api.groceryExtras.byOccurrenceId(extra.id).delete({
    queryParameters: {
      expectedVersion: extra.version,
      weekStartDate: extra.occurrenceWeekStartDate,
    },
  });
}
