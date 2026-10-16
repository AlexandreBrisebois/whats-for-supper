import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deferPost: vi.fn().mockResolvedValue({ data: { message: 'Moved' } }),
  movePost: vi.fn(),
  removeDelete: vi.fn(),
}));

vi.mock('@microsoft/kiota-abstractions', () => ({
  DateOnly: { parse: (value: string) => value },
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      schedule: {
        defer: { post: mocks.deferPost },
        move: { post: mocks.movePost },
        day: { byDate: () => ({ remove: { delete: mocks.removeDelete } }) },
      },
    },
  },
}));

vi.mock('@/lib/api/planner', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/planner')>()),
  assignRecipeToDay: vi.fn(),
  getSchedule: vi.fn(),
  normalizeScheduleRecipe: (recipe: unknown) => recipe,
}));

import { resolveOccupiedSlot } from './slotAssignment';

beforeEach(() => vi.clearAllMocks());

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
      { queryParameters: { referenceWeekStartDate: '2026-05-11', targetWeekOffset: 1 } }
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

it('defers offset one to offset two using the captured reference and exact source date', async () => {
  await resolveOccupiedSlot(
    {
      weekOffset: 1,
      referenceWeekStartDate: '2026-10-12',
      dayIndex: 2,
      date: '2026-10-21',
      recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
    },
    'next_week',
    true
  );
  expect(mocks.deferPost).toHaveBeenLastCalledWith(
    { sourceDate: '2026-10-21', recipeId: '550e8400-e29b-41d4-a716-446655440000' },
    { queryParameters: { referenceWeekStartDate: '2026-10-12', targetWeekOffset: 2 } }
  );
});

it.each([0, 2])(
  'defers captured source offset %i to its following week after clock rollover',
  async (weekOffset) => {
    const date = weekOffset === 0 ? '2026-10-14' : '2026-10-28';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
    try {
      await resolveOccupiedSlot(
        {
          weekOffset,
          referenceWeekStartDate: '2026-10-12',
          dayIndex: 2,
          date,
          recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
        },
        'next_week',
        true
      );
      expect(mocks.deferPost).toHaveBeenLastCalledWith(
        expect.objectContaining({ sourceDate: date }),
        {
          queryParameters: {
            referenceWeekStartDate: '2026-10-12',
            targetWeekOffset: weekOffset + 1,
          },
        }
      );
    } finally {
      vi.useRealTimers();
    }
  }
);

it.each([0, 1, 2])(
  'preserves Search/Browse next-week movement for offset %i',
  async (weekOffset) => {
    await resolveOccupiedSlot(
      {
        weekOffset,
        referenceWeekStartDate: '2026-10-12',
        dayIndex: 2,
        date: '2026-10-21',
        recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
      },
      'next_week'
    );
    expect(mocks.movePost).toHaveBeenCalledWith(
      expect.objectContaining({
        weekOffset,
        fromIndex: 2,
        toIndex: 0,
        targetWeekOffset: weekOffset + 1,
        intent: 'push',
      }),
      { queryParameters: { referenceWeekStartDate: '2026-10-12' } }
    );
    expect(mocks.deferPost).not.toHaveBeenCalled();
  }
);

it.each([2, 6])('preserves Tomorrow movement for day %i', async (dayIndex) => {
  await resolveOccupiedSlot(
    {
      weekOffset: 1,
      referenceWeekStartDate: '2026-10-12',
      dayIndex,
      date: '2026-10-21',
      recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
    },
    'tomorrow',
    true
  );
  expect(mocks.movePost).toHaveBeenCalledWith(
    expect.objectContaining({
      fromIndex: dayIndex,
      toIndex: dayIndex === 6 ? 0 : dayIndex + 1,
      targetWeekOffset: dayIndex === 6 ? 2 : 1,
    }),
    { queryParameters: { referenceWeekStartDate: '2026-10-12' } }
  );
  expect(mocks.deferPost).not.toHaveBeenCalled();
});

it('preserves Drop without deferral or movement', async () => {
  await resolveOccupiedSlot(
    { weekOffset: 1, dayIndex: 2, date: '2026-10-21', recipe: null },
    'drop',
    true
  );
  expect(mocks.removeDelete).toHaveBeenCalledOnce();
  expect(mocks.deferPost).not.toHaveBeenCalled();
  expect(mocks.movePost).not.toHaveBeenCalled();
});
