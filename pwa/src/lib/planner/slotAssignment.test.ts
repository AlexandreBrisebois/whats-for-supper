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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.deferPost.mockImplementation(async (_body, config) => {
    const offset = config.queryParameters.targetWeekOffset;
    return {
      data: {
        scheduledDate: new Date(
          Date.parse(`${config.queryParameters.referenceWeekStartDate}T00:00:00Z`) +
            offset * 7 * 86400000
        )
          .toISOString()
          .slice(0, 10),
        scheduledWeekOffset: offset,
        message: 'Moved',
      },
    };
  });
  mocks.movePost.mockResolvedValue({ data: { moved: true, refreshComplete: true } });
});

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
      'next_week'
    );

    expect(mocks.deferPost).toHaveBeenCalledWith(
      {
        sourceDate: '2026-05-13',
        recipeId: '550e8400-e29b-41d4-a716-446655440000',
      },
      {
        queryParameters: { referenceWeekStartDate: '2026-05-11', targetWeekOffset: 1 },
        options: [expect.objectContaining({ maxRetries: 0 })],
      }
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
      ...Array.from({ length: 5 }, (_, i) => ({
        date: `2026-10-${14 + i}`,
        status: 0,
        recipe: null,
      })),
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
    'next_week'
  );
  expect(mocks.deferPost).toHaveBeenLastCalledWith(
    { sourceDate: '2026-10-21', recipeId: '550e8400-e29b-41d4-a716-446655440000' },
    {
      queryParameters: { referenceWeekStartDate: '2026-10-12', targetWeekOffset: 2 },
      options: [expect.objectContaining({ maxRetries: 0 })],
    }
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
        'next_week'
      );
      expect(mocks.deferPost).toHaveBeenLastCalledWith(
        expect.objectContaining({ sourceDate: date }),
        {
          queryParameters: {
            referenceWeekStartDate: '2026-10-12',
            targetWeekOffset: weekOffset + 1,
          },
          options: [expect.objectContaining({ maxRetries: 0 })],
        }
      );
    } finally {
      vi.useRealTimers();
    }
  }
);

it.each([0, 1, 2])(
  'uses exact-source defer for Search/Browse offset %i and retains a spillover destination',
  async (weekOffset) => {
    const date = `2026-10-${14 + weekOffset * 7}`;
    const scheduledDate = new Date(Date.UTC(2026, 9, 12 + (weekOffset + 2) * 7))
      .toISOString()
      .slice(0, 10);
    mocks.deferPost.mockResolvedValueOnce({
      data: { scheduledDate, scheduledWeekOffset: weekOffset + 2, message: 'Full week' },
    });
    const result = await resolveOccupiedSlot(
      {
        weekOffset,
        referenceWeekStartDate: '2026-10-12',
        dayIndex: 2,
        date,
        recipe: { id: 'original' } as any,
      },
      'next_week'
    );
    expect(mocks.deferPost).toHaveBeenCalledWith(
      { sourceDate: date, recipeId: 'original' },
      {
        queryParameters: { referenceWeekStartDate: '2026-10-12', targetWeekOffset: weekOffset + 1 },
        options: [expect.objectContaining({ maxRetries: 0 })],
      }
    );
    expect(result).toMatchObject({ data: { scheduledDate, scheduledWeekOffset: weekOffset + 2 } });
    expect(mocks.movePost).not.toHaveBeenCalled();
  }
);

it.each([
  {},
  { scheduledDate: '2026-10-32', scheduledWeekOffset: 2 },
  { scheduledDate: '2027-02-31', scheduledWeekOffset: 20 },
  { scheduledDate: '2026-10-21', scheduledWeekOffset: 1 },
  { scheduledDate: '2026-11-02', scheduledWeekOffset: 2 },
])('blocks Next Week without a coherent following-week destination: %j', async (data) => {
  mocks.deferPost.mockResolvedValueOnce({ data });
  await expect(
    resolveOccupiedSlot(
      {
        weekOffset: 1,
        dayIndex: 2,
        date: '2026-10-21',
        referenceWeekStartDate: '2026-10-12',
        recipe: { id: 'original' } as any,
      },
      'next_week'
    )
  ).rejects.toThrow();
});

it('retains an acknowledged defer and never repeats it after a replacement rejection', async () => {
  const source = {
    weekOffset: 1,
    dayIndex: 2,
    date: '2026-10-21',
    referenceWeekStartDate: '2026-10-12',
    recipe: { id: 'original' } as any,
  };
  mocks.deferPost.mockResolvedValueOnce({
    data: { scheduledDate: '2026-11-02', scheduledWeekOffset: 3, message: 'Full week' },
  });
  await resolveOccupiedSlot(source, 'next_week');
  await resolveOccupiedSlot(source, 'next_week');
  expect(mocks.deferPost).toHaveBeenCalledTimes(1);
});

it('does not replay a lost defer reply, even with an empty source', async () => {
  const { getSchedule } = await import('@/lib/api/planner');
  vi.mocked(getSchedule).mockResolvedValue({
    days: [{ date: '2026-10-21', recipe: null, status: 0 }],
  } as any);
  mocks.deferPost.mockRejectedValueOnce(new Error('Reply lost'));
  const source = {
    weekOffset: 1,
    dayIndex: 2,
    date: '2026-10-21',
    referenceWeekStartDate: '2026-10-12',
    recipe: { id: 'original' } as any,
  };
  await expect(resolveOccupiedSlot(source, 'next_week')).rejects.toThrow();
  await expect(resolveOccupiedSlot(source, 'next_week')).rejects.toThrow();
  expect(mocks.deferPost).toHaveBeenCalledTimes(1);
  expect(getSchedule).toHaveBeenCalled();
});

it.each([2, 6])('preserves Tomorrow movement for day %i', async (dayIndex) => {
  await resolveOccupiedSlot(
    {
      weekOffset: 1,
      referenceWeekStartDate: '2026-10-12',
      dayIndex,
      date: '2026-10-21',
      recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
    },
    'tomorrow'
  );
  expect(mocks.movePost).toHaveBeenCalledWith(
    expect.objectContaining({
      fromIndex: dayIndex,
      toIndex: dayIndex === 6 ? 0 : dayIndex + 1,
      targetWeekOffset: dayIndex === 6 ? 2 : 1,
    }),
    {
      queryParameters: { referenceWeekStartDate: '2026-10-12' },
      options: [expect.objectContaining({ maxRetries: 0 })],
    }
  );
  expect(mocks.deferPost).not.toHaveBeenCalled();
});

it('preserves Drop without deferral or movement', async () => {
  await resolveOccupiedSlot(
    {
      weekOffset: 1,
      dayIndex: 2,
      date: '2026-10-21',
      recipe: null,
      removalToken: 'v1.' + 'a'.repeat(43),
    },
    'drop'
  );
  expect(mocks.removeDelete).toHaveBeenCalledWith({
    queryParameters: { expectedPlanToken: 'v1.' + 'a'.repeat(43) },
    options: [expect.objectContaining({ maxRetries: 0 })],
  });
  expect(mocks.deferPost).not.toHaveBeenCalled();
  expect(mocks.movePost).not.toHaveBeenCalled();
});

it('Tomorrow requires an explicit committed result and uses the dedicated intent', async () => {
  mocks.movePost.mockResolvedValueOnce({ data: { message: 'Recipe moved' } });
  const slot = {
    weekOffset: 0,
    dayIndex: 6,
    date: '2026-10-11',
    referenceWeekStartDate: '2026-10-05',
    recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
  };
  await expect(resolveOccupiedSlot(slot, 'tomorrow')).rejects.toThrow();
  expect(mocks.movePost).toHaveBeenCalledWith(
    expect.objectContaining({ intent: 'tomorrow', fromIndex: 6, toIndex: 0, targetWeekOffset: 1 }),
    expect.anything()
  );
});

it.each([400, 401, 403, 409])(
  'preserves known Tomorrow rejection status %i for retained recovery',
  async (responseStatusCode) => {
    mocks.movePost.mockRejectedValueOnce(
      Object.assign(new Error('Rejected'), { responseStatusCode })
    );
    const source = {
      weekOffset: 0,
      dayIndex: 6,
      date: '2026-10-11',
      referenceWeekStartDate: '2026-10-05',
      recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
    };
    await expect(resolveOccupiedSlot(source, 'tomorrow')).rejects.toMatchObject({
      name: 'TomorrowMoveError',
      responseStatusCode,
    });
    expect(mocks.movePost).toHaveBeenCalledTimes(1);
  }
);

it('does not replay a committed Tomorrow when replacement needs another attempt', async () => {
  mocks.movePost.mockResolvedValue({ data: { moved: true, refreshComplete: true } });
  const slot = {
    weekOffset: 0,
    dayIndex: 6,
    date: '2026-10-11',
    referenceWeekStartDate: '2026-10-05',
    recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
  };
  await resolveOccupiedSlot(slot, 'tomorrow');
  await resolveOccupiedSlot(slot, 'tomorrow');
  expect(mocks.movePost).toHaveBeenCalledTimes(1);
});

it('rereads unknown outcomes and blocks a blind repeat even when the reread fails', async () => {
  const { getSchedule } = await import('@/lib/api/planner');
  vi.mocked(getSchedule).mockRejectedValue(new Error('offline'));
  mocks.movePost.mockRejectedValue(new Error('response lost'));
  const slot = {
    weekOffset: 0,
    dayIndex: 6,
    date: '2026-10-11',
    referenceWeekStartDate: '2026-10-05',
    recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
  };
  await expect(resolveOccupiedSlot(slot, 'tomorrow')).rejects.toThrow();
  await expect(resolveOccupiedSlot(slot, 'tomorrow')).rejects.toThrow();
  expect(getSchedule).toHaveBeenCalled();
  expect(mocks.movePost).toHaveBeenCalledTimes(1);
});

it('refreshes every server-reported week without replay after an incomplete refresh', async () => {
  const { getSchedule } = await import('@/lib/api/planner');
  vi.mocked(getSchedule).mockResolvedValue(undefined);
  mocks.movePost.mockResolvedValueOnce({
    data: {
      moved: true,
      refreshComplete: false,
      affectedWeekStartDates: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'],
    },
  });
  const source = {
    weekOffset: 0,
    dayIndex: 6,
    date: '2026-10-11',
    referenceWeekStartDate: '2026-10-05',
    recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
  };
  await resolveOccupiedSlot(source, 'tomorrow');
  expect(getSchedule).toHaveBeenCalledWith(2, '2026-10-05');
  expect(getSchedule).toHaveBeenCalledWith(3, '2026-10-05');
  await resolveOccupiedSlot(source, 'tomorrow');
  expect(mocks.movePost).toHaveBeenCalledTimes(1);
});

it('disables transport retries for the non-idempotent Tomorrow request', async () => {
  mocks.movePost.mockResolvedValueOnce({ data: { moved: true, refreshComplete: true } });
  await resolveOccupiedSlot(
    {
      weekOffset: 0,
      dayIndex: 6,
      date: '2026-10-11',
      referenceWeekStartDate: '2026-10-05',
      recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
    },
    'tomorrow'
  );
  expect(mocks.movePost.mock.calls[0][1].options).toEqual(
    expect.arrayContaining([expect.objectContaining({ maxRetries: 0 })])
  );
});

it('guards a captured empty target so a competing supper cannot be overwritten', async () => {
  const { assignRecipeToDay } = await import('@/lib/api/planner');
  const { assignRecipeToEmptySlot } = await import('./slotAssignment');
  const recipe = { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Curry', image: '' };
  vi.mocked(assignRecipeToDay).mockRejectedValueOnce(
    Object.assign(new Error('Changed plan'), { responseStatusCode: 409 })
  );
  await expect(assignRecipeToEmptySlot(1, 2, recipe, '2026-05-04')).rejects.toThrow('Changed plan');
  expect(assignRecipeToDay).toHaveBeenLastCalledWith(1, 2, recipe, '2026-05-04', true);
});

it('rejects a schedule response for a different absolute target date', async () => {
  const { getSchedule } = await import('@/lib/api/planner');
  const { getPlannerSlot } = await import('./slotAssignment');
  vi.mocked(getSchedule).mockResolvedValueOnce({
    calendar: {
      timeZone: 'UTC',
      today: '2026-10-12',
      capturedAtUtc: '2026-10-12T12:00:00Z',
      currentWeekStartDate: '2026-10-12',
      referenceWeekStartDate: '2026-10-12',
      nextDayAtUtc: '2026-10-13T00:00:00Z',
    },
    days: [{ date: '2026-10-12', status: 0, recipe: null }],
  } as any);
  await expect(getPlannerSlot(1, 0, '2026-10-12')).rejects.toThrow();
});

it('Drop fails closed when the authoritative source has no removal token', async () => {
  await expect(
    resolveOccupiedSlot({ weekOffset: 1, dayIndex: 2, date: '2026-10-21', recipe: null }, 'drop')
  ).rejects.toThrow(/refresh|confirm/i);
  expect(mocks.removeDelete).not.toHaveBeenCalled();
});

it('Drop propagates a concurrent changed-original conflict without another write', async () => {
  mocks.removeDelete.mockRejectedValueOnce({ responseStatusCode: 409 });
  await expect(
    resolveOccupiedSlot(
      {
        weekOffset: 1,
        dayIndex: 2,
        date: '2026-10-21',
        recipe: { id: 'original' } as any,
        removalToken: 'v1.' + 'a'.repeat(43),
      },
      'drop'
    )
  ).rejects.toMatchObject({ responseStatusCode: 409 });
  expect(mocks.removeDelete).toHaveBeenCalledWith(
    expect.objectContaining({
      queryParameters: { expectedPlanToken: 'v1.' + 'a'.repeat(43) },
    })
  );
  expect(mocks.movePost).not.toHaveBeenCalled();
  expect(mocks.deferPost).not.toHaveBeenCalled();
});

describe('dated recommendation safety', () => {
  const calendar = {
    timeZone: 'UTC',
    today: '2026-10-12',
    capturedAtUtc: '2026-10-12T12:00:00Z',
    currentWeekStartDate: '2026-10-12',
    referenceWeekStartDate: '2026-10-12',
    nextDayAtUtc: '2026-10-13T00:00:00Z',
  };
  it.each([
    { status: 0, removalToken: 'saved' },
    { status: 0, nonCooking: { kind: 'TakeOut' } },
    { status: 2 },
    { status: 4 },
  ])('skips persisted or protected supper %j', async (occupied) => {
    const { getSchedule } = await import('@/lib/api/planner');
    const { findFirstOpenPlannerSlot } = await import('./slotAssignment');
    vi.mocked(getSchedule).mockResolvedValue({
      calendar,
      days: [
        { date: '2026-10-12', recipe: null, ...occupied },
        { date: '2026-10-13', status: 0, recipe: null },
        ...Array.from({ length: 5 }, (_, i) => ({
          date: `2026-10-${14 + i}`,
          status: 0,
          recipe: null,
        })),
      ],
    } as any);
    expect(await findFirstOpenPlannerSlot(0, 0, 1)).toMatchObject({ dayIndex: 1 });
  });
  it.each([undefined, { calendar, days: [] }])(
    'blocks missing week data instead of scanning past it',
    async (missing) => {
      const { getSchedule } = await import('@/lib/api/planner');
      const { findFirstOpenPlannerSlot } = await import('./slotAssignment');
      vi.mocked(getSchedule).mockResolvedValue(missing as any);
      await expect(findFirstOpenPlannerSlot(0, 0, 520)).rejects.toThrow();
      expect(getSchedule).toHaveBeenCalledTimes(1);
    }
  );
  it('retains authoritative non-cooking kind and label for explicit consent', async () => {
    const { getSchedule } = await import('@/lib/api/planner');
    const { getPlannerSlot } = await import('./slotAssignment');
    vi.mocked(getSchedule).mockResolvedValue({
      calendar,
      days: [
        {
          date: '2026-10-12',
          status: 3,
          nonCooking: { kind: 'Other', customLabel: 'Birthday dinner' },
          removalToken: 'saved',
        },
      ],
    } as any);
    expect(await getPlannerSlot(0, 0)).toMatchObject({
      nonCooking: { kind: 'Other', customLabel: 'Birthday dinner' },
      removalToken: 'saved',
    });
  });
  it('bounds a full calendar at 520 relative weeks', async () => {
    const { getSchedule } = await import('@/lib/api/planner');
    const { findFirstOpenPlannerSlot } = await import('./slotAssignment');
    vi.mocked(getSchedule).mockImplementation(
      async (week = 0) =>
        ({
          calendar,
          days: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.parse('2026-10-12T00:00:00Z') + (week * 7 + i) * 86400000)
              .toISOString()
              .slice(0, 10),
            status: 0,
            removalToken: 'saved',
            recipe: null,
          })),
        }) as any
    );
    expect(await findFirstOpenPlannerSlot()).toBeNull();
    expect(getSchedule).toHaveBeenCalledTimes(520);
  });
});

it('blocks a partial occupied week instead of skipping an unknown Sunday', async () => {
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
    days: Array.from({ length: 6 }, (_, i) => ({
      date: `2026-10-${12 + i}`,
      status: 3,
      recipe: null,
    })),
  } as any);
  await expect(findFirstOpenPlannerSlot()).rejects.toThrow();
  expect(getSchedule).toHaveBeenCalledTimes(1);
});

it('rejects a server reference different from the captured explicit target', async () => {
  const { getSchedule } = await import('@/lib/api/planner');
  const { getPlannerSlot } = await import('./slotAssignment');
  vi.mocked(getSchedule).mockResolvedValue({
    calendar: {
      timeZone: 'UTC',
      today: '2026-10-12',
      capturedAtUtc: '2026-10-12T12:00:00Z',
      currentWeekStartDate: '2026-10-12',
      referenceWeekStartDate: '2026-10-12',
      nextDayAtUtc: '2026-10-13T00:00:00Z',
    },
    days: [{ date: '2026-10-12', status: 0, recipe: null }],
  } as any);
  await expect(getPlannerSlot(0, 0, '2026-10-05')).rejects.toThrow();
});

it('retains the named non-cooking original after a committed but lost removal reply', async () => {
  const { createReplacementSession, continueReplacementSession } =
    await import('./replacementSession');
  const session = createReplacementSession(
    {
      date: '2026-10-12',
      weekOffset: 0,
      dayIndex: 0,
      recipe: null,
      nonCooking: { kind: 'custom', customLabel: 'Birthday dinner' },
      removalToken: 'captured',
    },
    { id: 'replacement', name: 'Curry', image: '' },
    'drop'
  );
  await continueReplacementSession(session, {
    active: () => true,
    read: async () => ({ status: 0, recipe: null, nonCooking: null }),
    dispose: async () => {
      throw new Error('Reply lost');
    },
    save: vi.fn(),
    feedback: vi.fn(),
  });
  expect(session.disposed).toBe(true);
  expect(session.disposition?.recipeName).toBe('Birthday dinner');
});

it('treats a generated empty non-cooking DTO as absence rather than Take Out', async () => {
  const { getSchedule } = await import('@/lib/api/planner');
  const { getPlannerSlot, findFirstOpenPlannerSlot } = await import('./slotAssignment');
  vi.mocked(getSchedule).mockResolvedValue({
    calendar: {
      timeZone: 'UTC',
      today: '2026-10-12',
      capturedAtUtc: '2026-10-12T12:00:00Z',
      currentWeekStartDate: '2026-10-12',
      referenceWeekStartDate: '2026-10-12',
      nextDayAtUtc: '2026-10-13T00:00:00Z',
    },
    days: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-10-${12 + i}`,
      status: 0,
      recipe: null,
      nonCooking: {},
    })),
  } as any);
  expect((await getPlannerSlot(0, 0, '2026-10-12'))?.nonCooking).toBeNull();
  expect(await findFirstOpenPlannerSlot(0, 0, 1, '2026-10-12')).toMatchObject({ dayIndex: 0 });
});

describe('automatic deployment date lower bound', () => {
  it.each([
    ['2026-10-12', '2026-10-14', 0, 2],
    ['2026-10-05', '2026-10-14', 1, 2],
    ['2026-10-12', '2026-10-18', 0, 6],
    ['2026-10-12', '2026-10-19', 1, 0],
  ])(
    'skips empty past days from reference %s on %s',
    async (reference, today, weekOffset, dayIndex) => {
      const { getSchedule } = await import('@/lib/api/planner');
      const { findFirstOpenPlannerSlot } = await import('./slotAssignment');
      vi.mocked(getSchedule).mockImplementation(
        async (week = 0) =>
          ({
            calendar: {
              timeZone: 'America/Toronto',
              today,
              currentWeekStartDate: today === '2026-10-19' ? today : '2026-10-12',
              referenceWeekStartDate: reference,
              capturedAtUtc: today + 'T16:00:00Z',
              nextDayAtUtc: new Date(Date.parse(today + 'T04:00:00Z') + 86400000).toISOString(),
            },
            days: Array.from({ length: 7 }, (_, i) => ({
              date: new Date(Date.parse(reference + 'T00:00:00Z') + (week * 7 + i) * 86400000)
                .toISOString()
                .slice(0, 10),
              status: 0,
              recipe: null,
            })),
          }) as any
      );
      // Browser clock is deliberately unrelated to the deployment date.
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-20T12:00:00Z'));
      try {
        expect(await findFirstOpenPlannerSlot(0, 0, 3, reference)).toEqual({
          weekOffset,
          dayIndex,
          referenceWeekStartDate: reference,
        });
        expect(getSchedule).toHaveBeenLastCalledWith(weekOffset, reference);
      } finally {
        vi.mocked(Date.now).mockRestore();
      }
    }
  );

  it('rejects incoherent dates rather than treating a malformed week as empty', async () => {
    const { getSchedule } = await import('@/lib/api/planner');
    const { findFirstOpenPlannerSlot } = await import('./slotAssignment');
    vi.mocked(getSchedule).mockResolvedValue({
      calendar: {
        timeZone: 'UTC',
        today: '2026-10-12',
        currentWeekStartDate: '2026-10-12',
        referenceWeekStartDate: '2026-10-12',
        capturedAtUtc: '2026-10-12T12:00:00Z',
        nextDayAtUtc: '2026-10-13T00:00:00Z',
      },
      days: Array.from({ length: 7 }, () => ({ date: '2026-10-12', status: 0 })),
    } as any);
    await expect(findFirstOpenPlannerSlot()).rejects.toThrow();
    expect(getSchedule).toHaveBeenCalledTimes(1);
  });
});
