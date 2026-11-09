import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { JsonParseNode } from '@microsoft/kiota-serialization-json';
import {
  createGroceryMutationResultFromDiscriminatorValue,
  type GroceryMutationResult,
} from './generated/models';
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
    expect(await useSchedule().toggleGroceryItem(1, request, '2026-10-05')).toEqual(outcome);
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
    expect(await useSchedule().updateGroceryState(1, request, '2026-10-05')).toEqual(outcome);
    expect(bulkPatch.mock.calls[0][0]).toBe(request);
  });
  it('does not silently accept a lost or missing outcome', async () => {
    itemPatch.mockResolvedValue(undefined);
    await expect(useSchedule().toggleGroceryItem(0, {})).rejects.toThrow('Missing authoritative');
    expect(itemPatch).toHaveBeenCalledTimes(1);
  });
});

describe('generated grocery acknowledgement quantities', () => {
  for (const operation of ['item', 'bulk'] as const) {
    it.each([
      { kind: 'scalar', value: { n: '600', d: '1' } },
      { kind: 'scalar', value: { n: '0', d: '1' } },
      { kind: 'scalar', value: { n: '9007199254740993', d: '7' } },
      { kind: 'range', min: { n: '1', d: '3' }, max: { n: '7', d: '2' } },
      null,
    ])(`${operation} keeps the exact quantity from the generated decoder: %j`, async (quantity) => {
      const decoded = new JsonParseNode({
        weekStartDate: '2026-10-12',
        listVersion: '2',
        rowId: MOCK_IDS.GROCERY_ROW_01,
        rowVersion: '3',
        checked: true,
        checks: { [MOCK_IDS.GROCERY_ROW_01]: true },
        rows: [
          {
            rowId: MOCK_IDS.GROCERY_ROW_01,
            rowVersion: '3',
            quantity,
            quantityComplete: false,
            unitText: 'g',
            recipeIds: [MOCK_IDS.RECIPE_CARBONARA],
          },
        ],
      }).getObjectValue<GroceryMutationResult>(createGroceryMutationResultFromDiscriminatorValue)!;
      itemPatch.mockResolvedValue(decoded);
      bulkPatch.mockResolvedValue({ data: decoded });
      const result =
        operation === 'item'
          ? await useSchedule().toggleGroceryItem(0, {})
          : await useSchedule().updateGroceryState(0, {});
      expect(result.rows![0].quantity).toEqual(quantity);
      expect(result.rows![0]).toMatchObject({
        rowId: MOCK_IDS.GROCERY_ROW_01,
        rowVersion: '3',
        quantityComplete: false,
      });
      expect(result).toMatchObject({ listVersion: '2', rowVersion: '3', checked: true });
    });
  }
});
