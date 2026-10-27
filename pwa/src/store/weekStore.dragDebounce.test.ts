/** Store-level fixed-date swap and single-commit coverage. */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWeekStore } from './weekStore';
import type { UILocalScheduleDay } from './weekStore';

// ─── Mock moveRecipeApi ───────────────────────────────────────────────────────
//
// We mock the module-level `moveRecipe` export from planner.ts.
// weekStore.ts imports it as `moveRecipeApi` (aliased at import time).
// vi.mock hoists to the top of the file, so the mock is in place before
// weekStore.ts is evaluated.

vi.mock('@/lib/api/planner', () => ({
  getSchedule: vi.fn().mockResolvedValue(null),
  assignRecipeToDay: vi.fn().mockResolvedValue(undefined),
  removeRecipeFromDay: vi.fn().mockResolvedValue(undefined),
  moveRecipe: vi.fn().mockResolvedValue(undefined),
  openVoting: vi.fn().mockResolvedValue(undefined),
  lockSchedule: vi.fn().mockResolvedValue(undefined),
  isScheduleRecipe: vi.fn((r: any) => r && typeof r.id === 'string' && r.id.length > 0),
  getSmartDefaults: vi.fn().mockResolvedValue(null),
}));

// Import AFTER the mock is declared so we get the mocked version
import * as plannerApi from '@/lib/api/planner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDay(index: number, overrides: Partial<UILocalScheduleDay> = {}): UILocalScheduleDay {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    date: `2025-01-${String(6 + index).padStart(2, '0')}`,
    day: dayNames[index % 7],
    recipe: {
      id: `recipe-${index}`,
      name: `Recipe ${index}`,
      image: `/img/recipe-${index}`,
    } as any,
    _uiId: `ui-id-${index}`,
    ...overrides,
  };
}

/** Build a 7-day schedule */
function makeSevenDaySchedule(): UILocalScheduleDay[] {
  return Array.from({ length: 7 }, (_, i) => makeDay(i));
}

// ─── Reset store and mock before each test ────────────────────────────────────

const calendar = {
  timeZone: 'UTC',
  today: '2026-05-04',
  capturedAtUtc: '2026-05-04T12:00:00Z',
  currentWeekStartDate: '2026-05-04',
  referenceWeekStartDate: '2026-05-04',
  nextDayAtUtc: '2026-05-05T00:00:00Z',
};
beforeEach(() => {
  useWeekStore.setState({
    weekOffset: 0,
    weekStartDate: '2026-05-04',
    calendar: calendar as any,
    schedule: makeSevenDaySchedule(),
    status: 0,
    isLoading: false,
    lastSyncedAt: null,
    optimisticWriteAt: null,
  });
  vi.clearAllMocks();
});

// These tests exercise the store's explicit source/target operations. Browser tests
// own pointer geometry, activation, cancellation and the page/client integration.
import fc from 'fast-check';

describe('weekStore fixed-date preview and commit', () => {
  it.each([
    [1, [2, 3, 4]],
    [6, [5, 4, 3, 2, 1, 0]],
  ] as const)('previews from source %s locally and commits one final request', (from, targets) => {
    const original = useWeekStore.getState().schedule;
    for (const to of targets) {
      useWeekStore.getState().reorderLocally(from, to, original);
      expect(plannerApi.moveRecipe).not.toHaveBeenCalled();
    }
    const to = targets[targets.length - 1];
    useWeekStore.getState().commitMove(from, to, original);
    expect(plannerApi.moveRecipe).toHaveBeenCalledExactlyOnceWith(
      0,
      `recipe-${from}`,
      to,
      from,
      '2026-05-04'
    );
  });

  it('each preview exchanges only the original source and current target while dates stay fixed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 6 }),
        (from, targets) => {
          const original = makeSevenDaySchedule();
          useWeekStore.setState({ schedule: original });
          for (const to of targets) {
            useWeekStore.getState().reorderLocally(from, to, original);
            const preview = useWeekStore.getState().schedule;
            expect(preview).toHaveLength(7);
            expect(preview.map((day) => day.date)).toEqual(original.map((day) => day.date));
            expect(preview.map((day) => day.day)).toEqual(original.map((day) => day.day));
            for (let index = 0; index < 7; index++) {
              expect(preview[index].recipe).toBe(
                original[index === from ? to : index === to ? from : index].recipe
              );
            }
            expect(new Set(preview.map((day) => day._uiId))).toEqual(
              new Set(original.map((day) => day._uiId))
            );
          }
        }
      ),
      { numRuns: 50 }
    );
    expect(plannerApi.moveRecipe).not.toHaveBeenCalled();
  });

  it('restores the captured original snapshot on rejection', async () => {
    vi.mocked(plannerApi.moveRecipe).mockRejectedValueOnce(new Error('Network error'));
    const original = useWeekStore.getState().schedule;
    useWeekStore.getState().reorderLocally(0, 3, original);
    expect(useWeekStore.getState().schedule[3].recipe).toBe(original[0].recipe);
    useWeekStore.getState().commitMove(0, 3, original);
    await vi.waitFor(() => expect(useWeekStore.getState().schedule).toEqual(original));
    expect(plannerApi.moveRecipe).toHaveBeenCalledTimes(1);
  });

  it('returns to the original arrangement without a request', () => {
    const original = useWeekStore.getState().schedule;
    useWeekStore.getState().reorderLocally(2, 4, original);
    useWeekStore.getState().reorderLocally(2, 2, original);
    useWeekStore.getState().commitMove(2, 2, original);
    expect(useWeekStore.getState().schedule).toEqual(original);
    expect(plannerApi.moveRecipe).not.toHaveBeenCalled();
  });

  it('does not send a request for an unchanged drop with no preview', () => {
    const original = useWeekStore.getState().schedule;
    useWeekStore.getState().commitMove(0, 0, original);
    expect(plannerApi.moveRecipe).not.toHaveBeenCalled();
  });

  it('swaps non-cooking kind/label and pending/voting metadata with the meal content', () => {
    const original = makeSevenDaySchedule();
    original[0] = { ...original[0], _isPending: true, _voteCount: 3, _unanimousVote: true };
    original[1] = {
      ...original[1],
      recipe: undefined,
      status: 3,
      nonCooking: { kind: 'custom', customLabel: 'Grandma' },
    };
    useWeekStore.setState({ schedule: original });
    useWeekStore.getState().reorderLocally(0, 1, original);
    const preview = useWeekStore.getState().schedule;
    expect(preview[0]).toMatchObject({
      status: 3,
      nonCooking: { kind: 'custom', customLabel: 'Grandma' },
      date: original[0].date,
    });
    expect(preview[1]).toMatchObject({
      _isPending: true,
      _voteCount: 3,
      _unanimousVote: true,
      date: original[1].date,
    });
    expect(plannerApi.moveRecipe).not.toHaveBeenCalled();
  });

  it('commits the explicit source when recipe IDs repeat', () => {
    const original = useWeekStore.getState().schedule;
    original[2].recipe = original[0].recipe;
    useWeekStore.getState().reorderLocally(2, 5, original);
    useWeekStore.getState().commitMove(2, 5, original);
    expect(plannerApi.moveRecipe).toHaveBeenCalledExactlyOnceWith(
      0,
      'recipe-0',
      5,
      2,
      '2026-05-04'
    );
  });
});

describe('weekStore non-drag preservation', () => {
  it('assignRecipe updates schedule immediately and calls assignRecipeToDay API', async () => {
    const assignMock = vi.mocked(plannerApi.assignRecipeToDay);
    assignMock.mockResolvedValueOnce(undefined as any);

    useWeekStore.setState({
      weekOffset: 0,
      weekStartDate: '2026-05-04',
      calendar: calendar as any,
      schedule: makeSevenDaySchedule(),
      status: 0,
      isLoading: false,
      lastSyncedAt: null,
      optimisticWriteAt: null,
    });
    vi.clearAllMocks();
    assignMock.mockResolvedValueOnce(undefined as any);

    const recipe = { id: 'new-recipe-id', name: 'New Recipe', image: '/img/new' };
    useWeekStore.getState().assignRecipe(2, recipe);

    // Optimistic update: schedule[2] should have the new recipe immediately
    const scheduleAfter = useWeekStore.getState().schedule;
    expect(scheduleAfter[2].recipe?.id).toBe('new-recipe-id');
    expect(scheduleAfter[2].recipe?.name).toBe('New Recipe');

    // assignRecipeToDay API should be called (not moveRecipeApi)
    await vi.waitFor(() => {
      expect(assignMock).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(plannerApi.moveRecipe)).toHaveBeenCalledTimes(0);
  });

  it('assignRecipe refreshes grocery items after a successful assign', async () => {
    const assignMock = vi.mocked(plannerApi.assignRecipeToDay);
    const getScheduleMock = vi.mocked(plannerApi.getSchedule);
    assignMock.mockResolvedValueOnce(undefined as any);
    getScheduleMock.mockResolvedValueOnce({
      weekOffset: 0,
      weekStartDate: '2026-05-04',
      calendar: calendar as any,
      status: 0,
      days: makeSevenDaySchedule(),
      groceryItems: [
        {
          displayName: 'Pasta',
          normalizedKey: 'pasta',
          section: 'Pantry',
          quantity: 200,
          unitText: 'g',
          recipeIds: ['new-recipe-id'],
          additionalData: {},
        } as any,
      ],
    } as any);

    const schedule = makeSevenDaySchedule();
    useWeekStore.setState({
      weekOffset: 0,
      weekStartDate: '2026-05-04',
      calendar: calendar as any,
      schedule,
      groceryItems: [],
      status: 0,
      isLoading: false,
      lastSyncedAt: null,
      optimisticWriteAt: null,
    });
    vi.clearAllMocks();
    assignMock.mockResolvedValueOnce(undefined as any);
    getScheduleMock.mockResolvedValueOnce({
      weekOffset: 0,
      weekStartDate: '2026-05-04',
      calendar: calendar as any,
      status: 0,
      days: makeSevenDaySchedule(),
      groceryItems: [
        {
          displayName: 'Pasta',
          normalizedKey: 'pasta',
          section: 'Pantry',
          quantity: 200,
          unitText: 'g',
          recipeIds: ['new-recipe-id'],
          additionalData: {},
        } as any,
      ],
    } as any);

    const recipe = { id: 'new-recipe-id', name: 'New Recipe', image: '/img/new' };
    useWeekStore.getState().assignRecipe(2, recipe);

    await vi.waitFor(() => {
      expect(assignMock).toHaveBeenCalledTimes(1);
      expect(getScheduleMock).toHaveBeenCalledWith(0, '2026-05-04');
    });

    expect(useWeekStore.getState().groceryItems).toHaveLength(1);
    expect(useWeekStore.getState().groceryItems[0].displayName).toBe('Pasta');
  });

  it('removeRecipe updates schedule immediately and calls removeRecipeFromDay API', async () => {
    const removeMock = vi.mocked(plannerApi.removeRecipeFromDay);
    removeMock.mockResolvedValueOnce(undefined as any);

    const schedule = makeSevenDaySchedule();
    useWeekStore.setState({
      weekOffset: 0,
      weekStartDate: '2026-05-04',
      calendar: calendar as any,
      schedule,
      status: 0,
      isLoading: false,
      lastSyncedAt: null,
      optimisticWriteAt: null,
    });
    vi.clearAllMocks();
    removeMock.mockResolvedValueOnce(undefined as any);

    const date = schedule[1].date;
    useWeekStore.getState().removeRecipe(1, date!);

    // Optimistic update: schedule[1] should have no recipe
    const scheduleAfter = useWeekStore.getState().schedule;
    expect(scheduleAfter[1].recipe).toBeUndefined();

    // removeRecipeFromDay API should be called (not moveRecipeApi)
    await vi.waitFor(() => {
      expect(removeMock).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(plannerApi.moveRecipe)).toHaveBeenCalledTimes(0);
  });

  it('removeRecipe removes grocery items contributed only by the removed recipe', async () => {
    const removeMock = vi.mocked(plannerApi.removeRecipeFromDay);
    removeMock.mockResolvedValueOnce(undefined as any);

    const schedule = makeSevenDaySchedule();
    useWeekStore.setState({
      weekOffset: 0,
      weekStartDate: '2026-05-04',
      calendar: calendar as any,
      schedule,
      groceryItems: [
        {
          displayName: 'Pasta',
          normalizedKey: 'pasta',
          section: 'Pantry',
          quantity: 200,
          unitText: 'g',
          recipeIds: ['recipe-1'],
          additionalData: {},
        } as any,
        {
          displayName: 'Olive Oil',
          normalizedKey: 'olive_oil',
          section: 'Pantry',
          quantity: 2,
          unitText: 'tbsp',
          recipeIds: ['recipe-1', 'recipe-2'],
          additionalData: {},
        } as any,
      ],
      status: 0,
      isLoading: false,
      lastSyncedAt: null,
      optimisticWriteAt: null,
    });
    vi.clearAllMocks();
    removeMock.mockResolvedValueOnce(undefined as any);

    const date = schedule[1].date;
    useWeekStore.getState().removeRecipe(1, date!);

    const groceryItemsAfter = useWeekStore.getState().groceryItems;
    expect(groceryItemsAfter).toHaveLength(1);
    expect(groceryItemsAfter[0].displayName).toBe('Olive Oil');
    expect(groceryItemsAfter[0].recipeIds).toEqual(['recipe-2']);

    await vi.waitFor(() => {
      expect(removeMock).toHaveBeenCalledTimes(1);
    });
  });
});

it('drag onto a custom skipped day moves the message with its status and restores both on failure', async () => {
  const original = [
    makeDay(0, {
      recipe: { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Pasta', image: '' },
      nonCooking: null,
    }),
    makeDay(1, {
      recipe: undefined,
      status: 3,
      nonCooking: { kind: 'custom', customLabel: 'Supper at Grandma’s' },
    }),
  ];
  useWeekStore.setState({ schedule: original, weekOffset: 0 });
  vi.mocked(plannerApi.moveRecipe).mockRejectedValueOnce(new Error('offline'));
  useWeekStore.getState().reorderLocally(0, 1, original);
  expect(useWeekStore.getState().schedule[0].nonCooking?.customLabel).toBe('Supper at Grandma’s');
  expect(useWeekStore.getState().schedule[0].date).toBe(original[0].date);
  expect(useWeekStore.getState().schedule[1].nonCooking).toBeNull();
  useWeekStore.getState().commitMove(0, 1, original);
  await Promise.resolve();
  expect(useWeekStore.getState().schedule).toEqual(original);
});

describe('post-move authoritative read ownership', () => {
  it.each(['week', 'move'])('ignores a read superseded by a later %s', async (change) => {
    let resolve!: (value: any) => void;
    vi.mocked(plannerApi.getSchedule)
      .mockReset()
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done;
          })
      );
    const apply = vi.spyOn(useWeekStore.getState(), 'applySnapshot');
    useWeekStore.getState().commitMove(0, 1, useWeekStore.getState().schedule);
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    if (change === 'week') useWeekStore.setState({ weekOffset: 1, weekStartDate: '2026-05-11' });
    else {
      const { usePlannerStore } = await import('./plannerStore');
      usePlannerStore.getState().nextMoveSeq();
    }
    resolve({ days: [], weekOffset: 0, weekStartDate: '2026-05-04' });
    await Promise.resolve();
    expect(apply).not.toHaveBeenCalled();
    apply.mockRestore();
  });
});
