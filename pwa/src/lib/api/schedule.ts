import { demoFetch } from './demo-session';
import { requestAdapter } from './api-client';
import { useFamilyStore } from '@/store/familyStore';

export function useSchedule() {
  return {
    async toggleGroceryItem(
      weekOffset: number,
      ingredientName: string,
      checked: boolean,
      referenceWeekStartDate?: string
    ): Promise<void> {
      const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;

      const response = await demoFetch(
        `${requestAdapter.baseUrl}/api/schedule/${weekOffset}/grocery/item${referenceWeekStartDate ? `?referenceWeekStartDate=${encodeURIComponent(referenceWeekStartDate)}` : ''}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Family-Member-Id': familyMemberId || '',
          },
          body: JSON.stringify({ ingredientName, checked }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to toggle grocery item: ${response.statusText}`);
      }
    },

    async updateGroceryState(
      weekOffset: number,
      groceryState: Record<string, boolean>,
      referenceWeekStartDate?: string
    ): Promise<Record<string, boolean>> {
      const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;

      const response = await demoFetch(
        `${requestAdapter.baseUrl}/api/schedule/${weekOffset}/grocery${referenceWeekStartDate ? `?referenceWeekStartDate=${encodeURIComponent(referenceWeekStartDate)}` : ''}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Family-Member-Id': familyMemberId || '',
          },
          body: JSON.stringify(groceryState),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update grocery state: ${response.statusText}`);
      }

      const result = await response.json();
      return result?.data || groceryState;
    },
  };
}
