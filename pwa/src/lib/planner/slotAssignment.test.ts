import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deferPost: vi.fn().mockResolvedValue({ data: { message: 'Moved' } }),
  movePost: vi.fn(),
}));

vi.mock('@microsoft/kiota-abstractions', () => ({
  DateOnly: { parse: (value: string) => value },
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: { schedule: { defer: { post: mocks.deferPost }, move: { post: mocks.movePost } } },
  },
}));

vi.mock('@/lib/api/planner', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/planner')>()),
  assignRecipeToDay: vi.fn(),
  getSchedule: vi.fn(),
  normalizeScheduleRecipe: (recipe: unknown) => recipe,
}));

import { resolveOccupiedSlot } from './slotAssignment';

describe('resolveOccupiedSlot', () => {
  it('uses defer with the exact source date for next-week recovery', async () => {
    await resolveOccupiedSlot(
      {
        weekOffset: 0,
        referenceWeekStartDate: '2026-05-11',
        dayIndex: 2,
        date: '2026-05-13',
        recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
      },
      'next_week',
      true
    );

    expect(mocks.deferPost).toHaveBeenCalledWith(
      {
        sourceDate: '2026-05-13',
        recipeId: '550e8400-e29b-41d4-a716-446655440000',
      },
      { queryParameters: { referenceWeekStartDate: '2026-05-11' } }
    );
    expect(mocks.movePost).not.toHaveBeenCalled();
  });
});

it('first-open placement skips recipe-free non-cooking days', async () => {
  const { getSchedule } = await import('@/lib/api/planner');
  const { findFirstOpenPlannerSlot } = await import('./slotAssignment');
  vi.mocked(getSchedule).mockResolvedValue({
    calendar: {
      timeZone: 'UTC',
      today: '2026-10-12',
      capturedAtUtc: '2026-10-12T12:00:00Z',
      currentWeekStartDate: '2026-10-12',
      referenceWeekStartDate: '2026-10-12',
      nextDayAtUtc: '2026-10-13T00:00:00Z',
    },
    days: [
      { day: 'Mon', date: '2026-10-12', status: 3, recipe: null },
      { day: 'Tue', date: '2026-10-13', status: 0, recipe: null },
    ],
  } as any);
  expect(await findFirstOpenPlannerSlot(0, 0, 1)).toEqual({
    weekOffset: 0,
    dayIndex: 1,
    referenceWeekStartDate: '2026-10-12',
  });
});

it('rejects a dated slot when the server cannot supply authoritative calendar context', async () => {
  const { getSchedule } = await import('@/lib/api/planner');
  const { getPlannerSlot } = await import('./slotAssignment');
  vi.mocked(getSchedule).mockResolvedValueOnce({
    days: [
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ].map((date) => ({ date, recipe: null })),
  } as any);
  await expect(getPlannerSlot(0, 6, '2026-10-05')).rejects.toThrow(
    "Could not confirm today's date"
  );
});
