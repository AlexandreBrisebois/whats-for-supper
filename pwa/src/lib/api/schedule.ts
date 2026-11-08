import { DateOnly } from '@microsoft/kiota-abstractions';
import { RetryHandlerOptions } from '@microsoft/kiota-http-fetchlibrary';
import { apiClient } from './api-client';
import type {
  GroceryBulkMutation,
  GroceryItemMutation,
  GroceryMutationResult,
} from './generated/models';

const configuration = (reference?: string) => ({
  // A lost response requires an authoritative read before any replay.
  options: [new RetryHandlerOptions({ maxRetries: 0 })],
  queryParameters: reference ? { referenceWeekStartDate: DateOnly.parse(reference)! } : undefined,
});

export function useSchedule() {
  return {
    async toggleGroceryItem(
      offset: number,
      request: GroceryItemMutation,
      reference?: string
    ): Promise<GroceryMutationResult> {
      const result = await apiClient.api.schedule
        .byWeekOffset(offset)
        .grocery.item.patch(request, configuration(reference));
      if (!result) throw new Error('Missing authoritative grocery outcome.');
      return result;
    },
    async updateGroceryState(
      offset: number,
      request: GroceryBulkMutation,
      reference?: string
    ): Promise<GroceryMutationResult> {
      const result = await apiClient.api.schedule
        .byWeekOffset(offset)
        .grocery.patch(request, configuration(reference));
      if (!result?.data) throw new Error('Missing authoritative grocery outcome.');
      return result.data;
    },
  };
}
