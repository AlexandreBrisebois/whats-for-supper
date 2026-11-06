import { beforeEach, describe, expect, it, vi } from 'vitest';
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('./demo-session', () => ({ demoFetch: send }));
vi.mock('./api-client', () => ({ requestAdapter: { baseUrl: '' }, apiClient: {} }));
vi.mock('@/store/familyStore', () => ({
  useFamilyStore: { getState: () => ({ selectedFamilyMemberId: 'member' }) },
}));
import { useSchedule } from './schedule';
beforeEach(() =>
  send.mockReset().mockResolvedValue({ ok: true, json: async () => ({ data: { pasta: true } }) })
);
describe('captured grocery references preserve PATCH body compatibility', () => {
  it.each([true, false])('pins item=%s without wrapping its existing body', async (item) => {
    const api = useSchedule();
    if (item) await api.toggleGroceryItem(1, 'pasta', true, '2026-10-05');
    else await api.updateGroceryState(1, { pasta: true, oil: false }, '2026-10-05');
    expect(send).toHaveBeenCalledWith(
      `/api/schedule/1/grocery${item ? '/item' : ''}?referenceWeekStartDate=2026-10-05`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(
          item ? { ingredientName: 'pasta', checked: true } : { pasta: true, oil: false }
        ),
      })
    );
  });
  it('retains legacy omission', async () => {
    await useSchedule().toggleGroceryItem(0, 'pasta', true);
    expect(send).toHaveBeenCalledWith('/api/schedule/0/grocery/item', expect.any(Object));
  });
});
