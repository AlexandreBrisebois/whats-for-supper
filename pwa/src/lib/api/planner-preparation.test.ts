import { describe, expect, it, vi } from 'vitest';
import { JsonParseNode } from '@microsoft/kiota-serialization-json';
import {
  createScheduleGetResponseFromDiscriminatorValue,
  type ScheduleGetResponse,
} from './generated/api/schedule';
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./api-client', () => ({ apiClient: { api: { schedule: { get } } } }));
vi.mock('@/store/discoveryStore', () => ({ useDiscoveryStore: { getState: () => ({}) } }));
import { getSchedule } from './planner';

describe('generated schedule preparation decoding', () => {
  it.each([
    { kind: 'scalar', value: { n: '400', d: '1' } },
    { kind: 'range', min: { n: '2', d: '1' }, max: { n: '3', d: '1' } },
    { kind: 'scalar', value: { n: '9007199254740993', d: '1' } },
    null,
  ])(
    'retains the exact nullable grocery quantity through a generated schedule read: %j',
    async (quantity) => {
      const response = new JsonParseNode({
        data: {
          weekOffset: 0,
          weekStartDate: '2026-10-12',
          days: [],
          groceryItems: [
            {
              rowId: '550e8400-e29b-41d4-a716-446655440211',
              rowVersion: '1',
              weekStartDate: '2026-10-12',
              source: 'recipe',
              demandIdentity: 'pasta:g',
              displayName: 'pasta',
              normalizedKey: 'pasta',
              section: 'Pantry',
              recipeIds: ['550e8400-e29b-41d4-a716-446655440212'],
              quantity,
              quantityComplete: false,
              unitText: 'g',
            },
          ],
        },
      }).getObjectValue<ScheduleGetResponse>(createScheduleGetResponseFromDiscriminatorValue)!;
      get.mockResolvedValue(response);
      const schedule = await getSchedule(0, '2026-10-12');
      expect(schedule!.groceryItems![0].quantity).toEqual(quantity);
      expect(schedule!.groceryItems![0].quantityComplete).toBe(false);
    }
  );
  it('keeps unprepared and legacy dates unprepared when Kiota decodes nullable objects', async () => {
    const response = new JsonParseNode({
      data: {
        weekOffset: 0,
        days: [
          { date: '2026-10-13', status: 1, preparation: null },
          { date: '2026-10-14', status: 0, preparation: null },
          { date: '2026-10-15', status: 2 },
        ],
      },
    }).getObjectValue<ScheduleGetResponse>(createScheduleGetResponseFromDiscriminatorValue)!;
    // Establish the actual generated-library representation instead of mocking it away.
    expect(response.data!.days![0].preparation).toEqual({});
    get.mockResolvedValue(response);
    const schedule = await getSchedule(0, '2026-10-12');
    expect(schedule!.days!.map((day) => day.preparation)).toEqual([null, null, null]);
    expect(schedule!.days!.map((day) => day.status)).toEqual([1, 0, 2]);
  });

  it.each([
    { servings: 6, originalServings: 2, portionContext: 'dated' },
    { servings: null, originalServings: 2, portionContext: 'original' },
    { servings: null, originalServings: null, portionContext: 'original' },
  ])(
    'retains a real generated receipt with $portionContext portions $servings and basis $originalServings',
    async (portions) => {
      const receipt = {
        preparedOn: '2026-10-13',
        preparedAtUtc: '2026-10-13T12:00:00Z',
        ...portions,
        planToken: 'v1.saved',
        servingVersion: 'saved',
      };
      get.mockResolvedValue(
        new JsonParseNode({
          data: { weekOffset: 0, days: [{ date: '2026-10-16', status: 2, preparation: receipt }] },
        }).getObjectValue<ScheduleGetResponse>(createScheduleGetResponseFromDiscriminatorValue)
      );
      const prepared = (await getSchedule(0))!.days![0].preparation!;
      expect(prepared.preparedOn!.toString()).toBe(receipt.preparedOn);
      expect(prepared.preparedAtUtc!.toISOString()).toBe(
        receipt.preparedAtUtc.replace('Z', '.000Z')
      );
      expect(prepared).toMatchObject({
        portionContext: portions.portionContext,
        planToken: 'v1.saved',
        servingVersion: 'saved',
      });
      expect(prepared.servings ?? null).toBe(portions.servings);
      expect(prepared.originalServings ?? null).toBe(portions.originalServings);
    }
  );
});
