import { describe, expect, it, vi } from 'vitest';
import { DateOnly } from '@microsoft/kiota-abstractions';

vi.mock('@/lib/api/api-client', () => ({
  apiClient: { api: { schedule: { get: vi.fn(), assign: { post: vi.fn() } } } },
}));

import { apiClient } from '@/lib/api/api-client';
import { getSchedule, assignRecipeToDay } from '@/lib/api/planner';

// The reference belongs to generated request configuration, never the mutation body.
// Invoke with the planned additive argument without requiring implementation to compile first.
describe('deployment calendar action reference', () => {
  it('pins the schedule read to the captured Monday', async () => {
    vi.mocked(apiClient.api.schedule.get).mockResolvedValueOnce({ data: { weekOffset: 0 } });
    await Reflect.apply(getSchedule, undefined, [0, '2026-10-05']);
    expect(apiClient.api.schedule.get).toHaveBeenCalledWith({
      queryParameters: { weekOffset: 0, referenceWeekStartDate: DateOnly.parse('2026-10-05') },
    });
  });

  it('pins assignment through generated POST query configuration', async () => {
    const recipe = { id: '550e8400-e29b-41d4-a716-446655440101', name: 'Sunday', image: '' };
    await Reflect.apply(assignRecipeToDay, undefined, [0, 6, recipe, '2026-10-05']);
    expect(apiClient.api.schedule.assign.post).toHaveBeenCalledWith(
      { weekOffset: 0, dayIndex: 6, recipeId: recipe.id },
      { queryParameters: { referenceWeekStartDate: DateOnly.parse('2026-10-05') } }
    );
  });
});

import {
  anchorCalendar,
  calendarAnchorIsFresh,
  civilDate,
  weekOffsetFor,
  type CalendarContext,
} from './deployment-calendar';

it('subtracts the whole request duration and uses elapsed time across wall-clock changes', () => {
  const calendar = {
    capturedAtUtc: '2026-10-12T03:59:59Z',
    nextDayAtUtc: '2026-10-12T04:00:00Z',
  } as CalendarContext;
  const anchor = anchorCalendar(calendar, 10, 260);
  expect(calendarAnchorIsFresh(anchor, 1009)).toBe(true);
  expect(calendarAnchorIsFresh(anchor, 1010)).toBe(false);
  expect(calendarAnchorIsFresh(anchor, 259)).toBe(false);
  expect(anchorCalendar(calendar, 10, 1010).expiresAfterMs).toBe(0);
});

it.each(['2026-03-08', '2026-11-01'])('keeps civil dates intact across DST: %s', (date) => {
  expect(civilDate(date)).toBe(date);
  expect(weekOffsetFor('2026-11-02', '2026-10-26')).toBe(1);
  expect(civilDate('2026-02-30')).toBeNull();
});
