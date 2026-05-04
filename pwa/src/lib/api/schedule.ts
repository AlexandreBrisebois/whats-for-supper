import { apiClient, requestAdapter } from './api-client';
import { useFamilyStore } from '@/store/familyStore';

export function useSchedule() {
  return {
    async updateGroceryState(
      weekOffset: number,
      groceryState: Record<string, boolean>
    ): Promise<Record<string, boolean>> {
      const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;

      const response = await fetch(`${requestAdapter.baseUrl}/api/schedule/${weekOffset}/grocery`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Family-Member-Id': familyMemberId || '',
        },
        body: JSON.stringify(groceryState),
      });

      if (!response.ok) {
        throw new Error(`Failed to update grocery state: ${response.statusText}`);
      }

      const result = await response.json();
      return result?.data || groceryState;
    },
  };
}
