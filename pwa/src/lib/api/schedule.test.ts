import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { MOCK_IDS } from '@/testing/mock-ids';
const { itemPatch, bulkPatch } = vi.hoisted(() => ({ itemPatch: vi.fn(), bulkPatch: vi.fn() }));
vi.mock('./api-client', () => ({
  apiClient: {
    api: {
      schedule: {
        byWeekOffset: () => ({ grocery: { item: { patch: itemPatch }, patch: bulkPatch } }),
      },
    },
  },
}));
import { useSchedule } from './schedule';
const outcome = {
  weekStartDate: DateOnly.parse('2026-10-12'),
  listVersion: '2',
  checks: { additionalData: { [MOCK_IDS.GROCERY_ROW_01]: true } },
  rows: [],
};
beforeEach(() => {
  itemPatch.mockReset().mockResolvedValue(outcome);
  bulkPatch.mockReset().mockResolvedValue({ data: outcome });
});
describe('generated grocery client requests', () => {
  it('pins the captured reference and sends the row guard and mutation identity', async () => {
    const request = {
      rowId: MOCK_IDS.GROCERY_ROW_01,
      weekStartDate: DateOnly.parse('2026-10-12'),
      expectedRowVersion: '1',
      checked: true,
      clientMutationId: MOCK_IDS.GROCERY_ROW_02,
    };
    expect(await useSchedule().toggleGroceryItem(1, request, '2026-10-05')).toBe(outcome);
    const [body, config] = itemPatch.mock.calls[0];
    expect(body).toBe(request);
    expect(String(config.queryParameters.referenceWeekStartDate)).toBe('2026-10-05');
    expect(config.options).toHaveLength(1);
  });
  it('sends a guarded bulk replacement and returns its authoritative outcome', async () => {
    const request = {
      weekStartDate: DateOnly.parse('2026-10-12'),
      expectedListVersion: '1',
      checks: { additionalData: { [MOCK_IDS.GROCERY_ROW_01]: false } },
      clientMutationId: MOCK_IDS.GROCERY_ROW_02,
    };
    expect(await useSchedule().updateGroceryState(1, request, '2026-10-05')).toBe(outcome);
    expect(bulkPatch.mock.calls[0][0]).toBe(request);
  });
  it('does not silently accept a lost or missing outcome', async () => {
    itemPatch.mockResolvedValue(undefined);
    await expect(useSchedule().toggleGroceryItem(0, {})).rejects.toThrow('Missing authoritative');
    expect(itemPatch).toHaveBeenCalledTimes(1);
  });
});
