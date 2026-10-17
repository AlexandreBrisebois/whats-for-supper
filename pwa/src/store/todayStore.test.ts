import { calendarTime } from '@/lib/deployment-calendar';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/api/planner', async (importActual) => {
  const actual = (await importActual()) as any;
  return {
    ...actual,
    assignRecipeToDay: vi.fn().mockResolvedValue(undefined),
    getSchedule: vi.fn().mockResolvedValue(undefined),
  };
});

import { useTodayStore } from './todayStore';
import { assignRecipeToDay, getSchedule } from '@/lib/api/planner';
import { apiClient } from '@/lib/api/api-client';
import { getTodayString } from '@/lib/imageUtils';
import * as imageDate from '@/lib/imageUtils';

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      recipes: {
        byId: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            recipe: {
              id: 'recipe-1',
              name: 'Pasta Bolognese',
              description: 'Hearty meat sauce',
              ingredients: ['Pasta', 'Beef', 'Tomato'],
              totalTime: 'PT30M',
            },
          }),
        }),
      },
      schedule: {
        day: {
          byDate: vi.fn().mockReturnValue({
            validate: {
              post: vi.fn().mockResolvedValue({}),
            },
          }),
        },
      },
    },
  },
}));

const calendar = {
  timeZone: 'UTC',
  capturedAtUtc: '2026-05-04T12:00:00Z',
  today: '2026-05-04',
  currentWeekStartDate: '2026-05-04',
  referenceWeekStartDate: '2026-05-04',
  nextDayAtUtc: '2026-05-05T00:00:00Z',
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
// Reset store state before each test
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-05-04T12:00:00Z'));
  vi.mocked(getSchedule)
    .mockReset()
    .mockResolvedValue({ calendar, weekOffset: 0, weekStartDate: '2026-05-04', days: [] } as any);
  useTodayStore.setState({
    calendar,
    calendarAnchor: { receivedAtElapsed: calendarTime.elapsed(), expiresAfterMs: 43_200_000 },
    calendarVersion: 0,
    calendarError: null,
    pendingCalendarAction: null,
    optimisticDate: '2026-05-04',
    currentRecipe: null,
    nonCooking: null,
    status: 0,
    isLoading: false,
    lastSyncedAt: null,
    optimisticWriteAt: null,
    skipCookedCelebration: false,
  });
});

const mockRecipe = {
  id: 'recipe-1',
  name: 'Pasta Bolognese',
  image: '/api/recipes/recipe-1/original/0',
};

describe('todayStore — recipe-specific cooking', () => {
  const supper = {
    id: '550e8400-e29b-41d4-a716-446655440101',
    name: 'Supper',
    image: '',
  };
  const lunchId = '550e8400-e29b-41d4-a716-446655440102';

  it('records lunch without marking the scheduled supper cooked', async () => {
    useTodayStore.setState({ currentRecipe: supper, status: 0 });
    const post = apiClient.api.schedule.day.byDate({} as any).validate.post;
    vi.mocked(post).mockClear();

    await useTodayStore.getState().markCooked(lunchId);

    expect(post).toHaveBeenCalledWith({ status: 2, recipeId: lunchId });
    expect(useTodayStore.getState().currentRecipe).toEqual(supper);
    expect(useTodayStore.getState().status).toBe(0);
  });

  it('still marks the scheduled supper cooked when its recipe matches', async () => {
    useTodayStore.setState({ currentRecipe: supper, status: 0 });
    vi.mocked(apiClient.api.schedule.day.byDate({} as any).validate.post).mockResolvedValueOnce({
      data: { mealMarkedCooked: true },
    });
    await useTodayStore.getState().markCooked(supper.id);
    expect(useTodayStore.getState().status).toBe(2);
  });

  it('does not complete a stale local supper when the server reports a different scheduled recipe', async () => {
    useTodayStore.setState({ currentRecipe: supper, status: 0 });
    vi.mocked(apiClient.api.schedule.day.byDate({} as any).validate.post).mockResolvedValueOnce({
      data: { mealMarkedCooked: false },
    });
    await useTodayStore.getState().markCooked(supper.id);
    expect(useTodayStore.getState().status).toBe(0);
  });

  it('records an unscheduled recipe when there is no planned supper', async () => {
    await useTodayStore.getState().markCooked(lunchId);
    expect(useTodayStore.getState().status).toBe(0);
    expect(useTodayStore.getState().currentRecipe).toBeNull();
  });

  it('does not mark supper cooked if saving the cooking event fails', async () => {
    useTodayStore.setState({ currentRecipe: supper, status: 0 });
    const post = apiClient.api.schedule.day.byDate({} as any).validate.post;
    vi.mocked(post).mockRejectedValueOnce(new Error('Saving failed'));

    await expect(useTodayStore.getState().markCooked(supper.id)).rejects.toThrow('Saving failed');
    expect(useTodayStore.getState().status).toBe(0);
  });
});

describe('todayStore — applyServerUpdate', () => {
  it('updates currentRecipe and status from server push', () => {
    useTodayStore.getState().applyServerUpdate({ recipe: mockRecipe, status: 0 });

    const state = useTodayStore.getState();
    expect(state.currentRecipe).toEqual(mockRecipe);
    expect(state.status).toBe(0);
    expect(state.optimisticWriteAt).toBeNull();
  });

  it('sets skipCookedCelebration true when status is 2', () => {
    useTodayStore.getState().applyServerUpdate({ recipe: mockRecipe, status: 2 });

    expect(useTodayStore.getState().skipCookedCelebration).toBe(true);
  });

  it('sets skipCookedCelebration false when status is not 2', () => {
    useTodayStore.getState().applyServerUpdate({ recipe: null, status: 3 });

    expect(useTodayStore.getState().skipCookedCelebration).toBe(false);
  });

  it('skips update within 2s echo window', () => {
    // Simulate a recent optimistic write (500ms ago)
    useTodayStore.setState({
      currentRecipe: mockRecipe,
      status: 0,
      optimisticWriteAt: calendarTime.elapsed() - 500,
    });

    const serverRecipe = {
      id: 'recipe-2',
      name: 'Server Recipe',
      image: '/api/recipes/recipe-2/original/0',
    };
    useTodayStore.getState().applyServerUpdate({ recipe: serverRecipe, status: 0 });

    // Should NOT have applied the server update — still the original recipe
    const state = useTodayStore.getState();
    expect(state.currentRecipe).toEqual(mockRecipe);
    expect(state.currentRecipe?.id).toBe('recipe-1');
  });

  it('applies update when optimisticWriteAt is older than 2s', () => {
    // Simulate an old optimistic write (3 seconds ago — outside echo window)
    useTodayStore.setState({
      currentRecipe: mockRecipe,
      status: 0,
      optimisticWriteAt: calendarTime.elapsed() - 3_000,
    });

    const serverRecipe = {
      id: 'recipe-2',
      name: 'Server Recipe',
      image: '/api/recipes/recipe-2/original/0',
    };
    useTodayStore.getState().applyServerUpdate({ recipe: serverRecipe, status: 0 });

    expect(useTodayStore.getState().currentRecipe?.id).toBe('recipe-2');
  });

  it('applies update when optimisticWriteAt is null', () => {
    useTodayStore.setState({ optimisticWriteAt: null });

    useTodayStore.getState().applyServerUpdate({ recipe: mockRecipe, status: 0 });

    expect(useTodayStore.getState().currentRecipe).toEqual(mockRecipe);
  });

  it('clears optimisticWriteAt after applying server update', () => {
    useTodayStore.setState({ optimisticWriteAt: calendarTime.elapsed() - 5_000 });

    useTodayStore.getState().applyServerUpdate({ recipe: mockRecipe, status: 0 });

    expect(useTodayStore.getState().optimisticWriteAt).toBeNull();
  });
  it('updates details from server push even within 2s echo window if ID matches', () => {
    const recipeId = 'recipe-1';
    const optimisticRecipe = {
      id: recipeId,
      name: 'Pasta',
      image: '/img.jpg',
    };

    useTodayStore.setState({
      currentRecipe: optimisticRecipe as any,
      status: 0,
      optimisticWriteAt: calendarTime.elapsed() - 500, // 0.5s ago (within echo window)
    });

    const serverRecipe = {
      id: recipeId,
      name: 'Pasta Bolognese',
      description: 'Hydrated details',
      image: '/img.jpg',
    };

    useTodayStore.getState().applyServerUpdate({ recipe: serverRecipe as any, status: 0 });

    // EXPECTATION: Should apply the update because the ID matches, even if it's an "echo"
    expect(useTodayStore.getState().currentRecipe?.description).toBe('Hydrated details');
    // And it should clear the optimistic guard
    expect(useTodayStore.getState().optimisticWriteAt).toBeNull();
  });
});

describe('todayStore — assignRecipe', () => {
  it('clears skipped status and restores today recipe immediately', () => {
    useTodayStore.setState({ status: 3, currentRecipe: null });

    useTodayStore.getState().assignRecipe({
      id: 'recipe-2',
      name: 'Soup',
      image: '/api/recipes/recipe-2/original/0',
    });

    const state = useTodayStore.getState();
    expect(state.status).toBe(0);
    expect(state.currentRecipe?.id).toBe('recipe-2');
    expect(assignRecipeToDay).toHaveBeenCalledTimes(1);
  });

  it('triggers a background fetch for recipe details (HYDRATION)', async () => {
    // This test expects assignRecipe to eventually fetch full details
    // We mock the specific ID we're assigning
    const recipeId = 'recipe-hydrated';
    const mockGet = vi.fn().mockResolvedValue({
      recipe: {
        id: recipeId,
        name: 'Hydrated Soup',
        description: 'Warm and cozy',
        ingredients: ['Carrot', 'Onion'],
        totalTime: 'PT15M',
      },
    });

    (apiClient.api.recipes.byId as any).mockReturnValue({
      get: mockGet,
    });

    useTodayStore.getState().assignRecipe({
      id: recipeId,
      name: 'Soup',
      image: '/img.jpg',
    });

    // Check immediate state
    expect(useTodayStore.getState().currentRecipe?.description).toBeUndefined();

    // Wait for microtasks (e.g. the detail fetch promise)
    await new Promise((resolve) => setTimeout(resolve, 0));

    // EXPECTATION: The description should now be hydrated
    // Currently this will FAIL because assignRecipe doesn't fetch details.
    expect(useTodayStore.getState().currentRecipe?.description).toBe('Warm and cozy');
  });
});

describe('todayStore — sync', () => {
  it.each([
    { kind: 'order_in', customLabel: null },
    { kind: 'eating_out', customLabel: null },
    { kind: 'custom', customLabel: 'Supper at Grandma’s' },
  ] as const)('clears a removed $kind plan when Home synchronizes', async (plan) => {
    useTodayStore.setState({ status: 3, nonCooking: plan });
    vi.mocked(getSchedule).mockResolvedValueOnce({
      weekOffset: 0,
      calendar: calendar as any,
      days: [{ date: getTodayString(), status: 0, recipe: null, nonCooking: null }],
    });

    await useTodayStore.getState().sync();

    expect(useTodayStore.getState()).toMatchObject({
      status: 0,
      currentRecipe: null,
      nonCooking: null,
      isLoading: false,
    });
  });

  it('shows the recipe when a saved plan has been replaced on the server', async () => {
    const recipe = { id: '22222222-2222-2222-2222-222222222222', name: 'Pasta' };
    useTodayStore.setState({ status: 3, nonCooking: { kind: 'order_in' } });
    vi.mocked(getSchedule).mockResolvedValueOnce({
      weekOffset: 0,
      calendar: calendar as any,
      days: [{ date: getTodayString(), status: 0, recipe, nonCooking: null }],
    });

    await useTodayStore.getState().sync();

    expect(useTodayStore.getState()).toMatchObject({
      status: 0,
      currentRecipe: recipe,
      nonCooking: null,
    });
  });

  it('updates details if ID matches during optimistic window (SMART RECONCILIATION)', async () => {
    const recipeId = 'recipe-1';
    const initialRecipe = {
      id: recipeId,
      name: 'Pasta',
      image: '/img.jpg',
    };

    // Set optimistic state
    useTodayStore.setState({
      currentRecipe: initialRecipe as any,
      status: 0,
      optimisticWriteAt: calendarTime.elapsed() - 1000, // 1s ago (recent)
    });

    // Mock schedule response with full details for the SAME recipe
    const fullRecipe = {
      id: recipeId,
      name: 'Pasta Bolognese',
      description: 'Full description',
      ingredients: ['A', 'B'],
      totalTime: '30m',
    };

    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    (getSchedule as any).mockResolvedValue({
      calendar,
      days: [
        {
          date: todayStr,
          recipe: fullRecipe,
          status: 0,
        },
      ],
    });

    await useTodayStore.getState().sync();

    // EXPECTATION: Details should be updated even if optimistic is recent
    // Currently this will FAIL because sync() skips updating currentRecipe if optimisticIsRecent.
    expect(useTodayStore.getState().currentRecipe?.description).toBe('Full description');
  });
});

describe('todayStore — clearOptimisticGuard', () => {
  it('clears optimisticWriteAt unconditionally', () => {
    useTodayStore.setState({ optimisticWriteAt: calendarTime.elapsed() });

    useTodayStore.getState().clearOptimisticGuard();

    expect(useTodayStore.getState().optimisticWriteAt).toBeNull();
  });

  it('is a no-op when optimisticWriteAt is already null', () => {
    useTodayStore.setState({ optimisticWriteAt: null });

    useTodayStore.getState().clearOptimisticGuard();

    expect(useTodayStore.getState().optimisticWriteAt).toBeNull();
  });
});

describe('todayStore — init', () => {
  it('updates details if ID matches during optimistic window', () => {
    const recipeId = 'recipe-1';
    const optimisticRecipe = {
      id: recipeId,
      name: 'Pasta',
      image: '/img.jpg',
    };

    useTodayStore.setState({
      currentRecipe: optimisticRecipe as any,
      status: 0,
      optimisticWriteAt: calendarTime.elapsed() - 5000,
    });

    const serverRecipe = {
      id: recipeId,
      name: 'Pasta Bolognese',
      description: 'Hydrated details',
      image: '/img.jpg',
    };

    useTodayStore.getState().init(serverRecipe as any, 0);

    // SHOULD merge details
    expect(useTodayStore.getState().currentRecipe?.description).toBe('Hydrated details');
    // SHOULD preserve optimisticWriteAt
    expect(useTodayStore.getState().optimisticWriteAt).not.toBeNull();
  });
});

it('keeps a custom non-cooking message from shared state and clears it on replacement', () => {
  useTodayStore.getState().applyServerUpdate({
    recipe: null,
    status: 3,
    nonCooking: { kind: 'custom', customLabel: 'Emma’s birthday supper' },
  });
  expect(useTodayStore.getState().nonCooking?.customLabel).toBe('Emma’s birthday supper');
  useTodayStore.getState().applyServerUpdate({ recipe: null, status: 0 });
  expect(useTodayStore.getState().nonCooking).toBeNull();
});

it('preserves optimistic non-cooking metadata against stale SSR initialization', () => {
  useTodayStore.setState({
    currentRecipe: null,
    status: 3,
    nonCooking: { kind: 'custom', customLabel: 'Birthday' },
    optimisticWriteAt: calendarTime.elapsed(),
  });
  useTodayStore.getState().init(null, 0, null);
  expect(useTodayStore.getState().status).toBe(3);
  expect(useTodayStore.getState().nonCooking?.customLabel).toBe('Birthday');
});

it('preserves an authoritative non-cooking snapshot when empty SSR arrives later', () => {
  useTodayStore.getState().applyServerUpdate({
    recipe: null,
    status: 3,
    nonCooking: { kind: 'custom', customLabel: 'Grandma' },
  });
  useTodayStore.getState().init(null, 0, null);
  expect(useTodayStore.getState().status).toBe(3);
  expect(useTodayStore.getState().nonCooking?.customLabel).toBe('Grandma');
});

it('recording an unscheduled recipe keeps the saved non-cooking plan', async () => {
  const plan = {
    kind: 'custom',
    customLabel: 'Supper at Grandma’s',
  } as const;
  useTodayStore.setState({
    currentRecipe: null,
    status: 3,
    nonCooking: plan,
  });
  vi.mocked(apiClient.api.schedule.day.byDate({} as any).validate.post).mockResolvedValueOnce({
    data: { mealMarkedCooked: false },
  });
  await useTodayStore.getState().markCooked('11111111-1111-1111-1111-111111111111');
  expect(useTodayStore.getState().status).toBe(3);
  expect(useTodayStore.getState().nonCooking).toEqual(plan);
});

it.each([
  { kind: 'eating_out' as const, customLabel: null },
  { kind: 'custom' as const, customLabel: "Supper at mom's" },
])('keeps a shared $kind plan when skipped SSR has no plan details', (plan) => {
  useTodayStore.getState().applyServerUpdate({ recipe: null, status: 3, nonCooking: plan });
  useTodayStore.getState().init(null, 3, null);
  expect(useTodayStore.getState().status).toBe(3);
  expect(useTodayStore.getState().nonCooking).toEqual(plan);
});

it.each([
  { kind: 'eating_out' as const, customLabel: null },
  { kind: 'custom' as const, customLabel: "Supper at mom's" },
])('sync resolves the deployment Sunday plan regardless of browser week ($kind)', async (plan) => {
  vi.mocked(getSchedule).mockReset();
  vi.mocked(getSchedule).mockResolvedValueOnce({
    weekOffset: 0,
    calendar: {
      ...calendar,
      timeZone: 'America/Toronto',
      today: '2026-10-11',
      currentWeekStartDate: '2026-10-05',
      referenceWeekStartDate: '2026-10-05',
      capturedAtUtc: '2026-10-12T01:30:00Z',
      nextDayAtUtc: '2026-10-12T04:00:00Z',
    } as any,
    days: [{ day: 'Sun', date: '2026-10-11', status: 3, recipe: null, nonCooking: plan }],
  });
  useTodayStore.setState({ currentRecipe: mockRecipe, status: 0 });
  await useTodayStore.getState().sync();
  expect(getSchedule).toHaveBeenCalledExactlyOnceWith(0);
  expect(useTodayStore.getState().status).toBe(3);
  expect(useTodayStore.getState().currentRecipe).toBeNull();
  expect(useTodayStore.getState().nonCooking).toEqual(plan);
});

describe('todayStore deployment calendar', () => {
  it('reads Toronto Sunday even when the device date is Monday', async () => {
    const browserToday = vi.spyOn(imageDate, 'getTodayString').mockReturnValue('2026-10-12');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T01:30:00Z'));
    const sunday = { ...mockRecipe, id: '550e8400-e29b-41d4-a716-446655440101' };
    vi.mocked(getSchedule).mockResolvedValueOnce({
      weekOffset: 0,
      weekStartDate: '2026-10-05',
      calendar: {
        timeZone: 'America/Toronto',
        capturedAtUtc: '2026-10-12T01:30:00Z',
        today: '2026-10-11',
        currentWeekStartDate: '2026-10-05',
        referenceWeekStartDate: '2026-10-05',
        nextDayAtUtc: '2026-10-12T04:00:00Z',
      },
      days: [{ day: 'Sun', date: '2026-10-11', recipe: sunday, status: 0 }],
    } as any);
    try {
      await useTodayStore.getState().sync();
      expect(useTodayStore.getState().currentRecipe?.id).toBe(sunday.id);
    } finally {
      browserToday.mockRestore();
      vi.useRealTimers();
    }
  });
});

it.each(['cooked', 'ordered_in'] as const)(
  'submits %s for deployment Sunday while the device is Monday',
  async (action) => {
    const browserToday = vi.spyOn(imageDate, 'getTodayString').mockReturnValue('2026-10-12');
    useTodayStore.setState({
      calendar: {
        timeZone: 'America/Toronto',
        capturedAtUtc: '2026-10-12T01:30:00Z',
        today: '2026-10-11',
        currentWeekStartDate: '2026-10-05',
        referenceWeekStartDate: '2026-10-05',
        nextDayAtUtc: '2026-10-12T04:00:00Z',
      },
    });
    vi.mocked(getSchedule).mockResolvedValueOnce({
      calendar: useTodayStore.getState().calendar,
      weekOffset: 0,
    } as any);
    vi.mocked(apiClient.api.schedule.day.byDate).mockClear();
    try {
      if (action === 'cooked')
        await useTodayStore.getState().markCooked('660e8400-e29b-41d4-a716-446655440011');
      else useTodayStore.getState().markOrderedIn();
      const date = vi.mocked(apiClient.api.schedule.day.byDate).mock.calls[0][0];
      expect(date.toString()).toBe('2026-10-11');
    } finally {
      browserToday.mockRestore();
    }
  }
);

it('keeps cooking retryable without posting when authoritative date refresh fails', async () => {
  const recipeId = '660e8400-e29b-41d4-a716-446655440011';
  const validation = apiClient.api.schedule.day.byDate({} as any).validate.post;
  vi.mocked(validation).mockClear();
  vi.mocked(getSchedule).mockRejectedValueOnce(new Error('calendar offline'));
  useTodayStore.setState({ currentRecipe: mockRecipe });
  await expect(useTodayStore.getState().markCooked(recipeId)).rejects.toThrow(
    "Could not confirm today's date. Try again."
  );
  expect(validation).not.toHaveBeenCalled();
  expect(useTodayStore.getState().currentRecipe).toEqual(mockRecipe);
  await useTodayStore.getState().markCooked(recipeId);
  expect(validation).toHaveBeenCalledExactlyOnceWith({ status: 2, recipeId });
});

describe('Today calendar generations and elapsed guards', () => {
  const sunday = {
    timeZone: 'America/Toronto',
    capturedAtUtc: '2026-10-12T01:30:00Z',
    today: '2026-10-11',
    currentWeekStartDate: '2026-10-05',
    referenceWeekStartDate: '2026-10-05',
    nextDayAtUtc: '2026-10-12T04:00:00Z',
  };
  const monday = {
    ...sunday,
    capturedAtUtc: '2026-10-12T04:30:00Z',
    today: '2026-10-12',
    currentWeekStartDate: '2026-10-12',
    referenceWeekStartDate: '2026-10-12',
    nextDayAtUtc: '2026-10-13T04:00:00Z',
  };

  it('a new date with the same recipe does not inherit yesterday’s cooked guard', () => {
    useTodayStore.setState({
      calendar: sunday,
      currentRecipe: mockRecipe,
      status: 2,
      optimisticWriteAt: calendarTime.elapsed(),
      optimisticDate: '2026-10-11',
    } as any);
    useTodayStore.getState().init(mockRecipe, 0, null, monday);
    expect(useTodayStore.getState().status).toBe(0);
  });

  it('late Sunday sync cannot replace a newer Monday context', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(getSchedule).mockReturnValueOnce(
      new Promise((complete) => {
        resolve = complete;
      })
    );
    useTodayStore.setState({ calendar: sunday, optimisticWriteAt: null });
    const pending = useTodayStore.getState().sync();
    const newer = { ...mockRecipe, id: '660e8400-e29b-41d4-a716-446655440010' };
    useTodayStore.getState().init(newer, 0, null, monday);
    resolve({
      calendar: sunday,
      weekOffset: 0,
      days: [{ date: '2026-10-11', status: 0, recipe: mockRecipe }],
    });
    await pending;
    expect(useTodayStore.getState().calendar?.today).toBe('2026-10-12');
    expect(useTodayStore.getState().currentRecipe?.id).toBe(newer.id);
  });

  it('keeps the two-second guard on elapsed time despite a device wall-clock jump', async () => {
    const { calendarTime } = await import('@/lib/deployment-calendar');
    const elapsed = vi.spyOn(calendarTime, 'elapsed').mockReturnValue(1500);
    useTodayStore.setState({
      calendar: sunday,
      currentRecipe: mockRecipe,
      optimisticWriteAt: 1000,
      optimisticDate: '2026-10-11',
    } as any);
    useTodayStore
      .getState()
      .applyServerUpdate({ recipe: null, status: 0, date: '2026-10-11' } as any);
    expect(useTodayStore.getState().currentRecipe?.id).toBe(mockRecipe.id);
    elapsed.mockRestore();
  });

  it('refreshes an expired action before choosing its weekday and reference', async () => {
    const { calendarTime } = await import('@/lib/deployment-calendar');
    vi.spyOn(calendarTime, 'elapsed').mockReturnValue(9_000_001);
    useTodayStore.setState({
      calendar: sunday,
      calendarAnchor: { receivedAtElapsed: 0, expiresAfterMs: 9_000_000 },
    } as any);
    vi.mocked(assignRecipeToDay).mockClear();
    vi.mocked(getSchedule).mockResolvedValueOnce({
      calendar: monday,
      weekOffset: 0,
      weekStartDate: '2026-10-12',
      days: [],
    } as any);
    useTodayStore.getState().assignRecipe(mockRecipe);
    await vi.waitFor(() =>
      expect(assignRecipeToDay).toHaveBeenCalledWith(0, 0, mockRecipe, '2026-10-12')
    );
  });
});

it('does not let a wall-clock correction extend the two-second elapsed guard', async () => {
  const { calendarTime } = await import('@/lib/deployment-calendar');
  vi.spyOn(calendarTime, 'elapsed').mockReturnValue(5000);
  useTodayStore.setState({
    currentRecipe: mockRecipe,
    optimisticWriteAt: 1000,
    optimisticDate: '2026-05-04',
  } as any);
  vi.setSystemTime(new Date('1970-01-01T00:00:00Z'));
  useTodayStore
    .getState()
    .applyServerUpdate({ recipe: null, status: 0, date: '2026-05-04' } as any);
  expect(useTodayStore.getState().currentRecipe).toBeNull();
});

it('keeps the twenty-second sync guard on the injected elapsed clock', async () => {
  const { calendarTime } = await import('@/lib/deployment-calendar');
  vi.spyOn(calendarTime, 'elapsed').mockReturnValue(1500);
  useTodayStore.setState({
    currentRecipe: mockRecipe,
    optimisticWriteAt: 1000,
    optimisticDate: '2026-05-04',
  } as any);
  vi.mocked(getSchedule).mockResolvedValueOnce({
    calendar,
    weekOffset: 0,
    days: [{ date: '2026-05-04', status: 0, recipe: null }],
  } as any);
  vi.setSystemTime(new Date('2040-01-01T00:00:00Z'));
  await useTodayStore.getState().sync();
  expect(useTodayStore.getState().currentRecipe?.id).toBe(mockRecipe.id);
});

it('retains the chosen recipe and a retry when expired calendar refresh fails', async () => {
  const { calendarTime } = await import('@/lib/deployment-calendar');
  vi.spyOn(calendarTime, 'elapsed').mockReturnValue(1500);
  useTodayStore.setState({ calendarAnchor: { receivedAtElapsed: 0, expiresAfterMs: 1000 } } as any);
  vi.mocked(assignRecipeToDay).mockClear();
  vi.mocked(getSchedule).mockRejectedValueOnce(new Error('offline'));
  useTodayStore.getState().assignRecipe(mockRecipe);
  await vi.waitFor(() =>
    expect((useTodayStore.getState() as any).calendarError).toBe(
      "Could not confirm today's date. Try again."
    )
  );
  expect(assignRecipeToDay).not.toHaveBeenCalled();
  expect((useTodayStore.getState() as any).pendingCalendarAction?.recipe).toEqual(mockRecipe);
  vi.mocked(getSchedule).mockResolvedValueOnce({ calendar, weekOffset: 0, days: [] } as any);
  (useTodayStore.getState() as any).retryCalendarAction();
  await vi.waitFor(() =>
    expect(assignRecipeToDay).toHaveBeenCalledWith(0, 0, mockRecipe, '2026-05-04')
  );
});

it('a started assignment and its late hydration stay on Sunday after rollover', async () => {
  const sunday = { ...calendar, today: '2026-05-10' };
  const monday = {
    ...calendar,
    today: '2026-05-11',
    currentWeekStartDate: '2026-05-11',
    referenceWeekStartDate: '2026-05-11',
    capturedAtUtc: '2026-05-11T00:00:00Z',
    nextDayAtUtc: '2026-05-12T00:00:00Z',
  };
  let finish!: (value: any) => void;
  vi.mocked(apiClient.api.recipes.byId(mockRecipe.id as any).get).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  useTodayStore.setState({ calendar: sunday });
  useTodayStore.getState().assignRecipe(mockRecipe);
  useTodayStore.getState().init({ ...mockRecipe, name: 'Monday choice' }, 0, null, monday);
  finish({ recipe: { ...mockRecipe, description: 'Old Sunday hydration' } });
  await Promise.resolve();
  expect(assignRecipeToDay).toHaveBeenLastCalledWith(0, 6, mockRecipe, '2026-05-04');
  expect(useTodayStore.getState().calendar?.today).toBe('2026-05-11');
  expect(useTodayStore.getState().currentRecipe?.description).not.toBe('Old Sunday hydration');
});

it('does not present a recovery choice before persistence and propagates rejection', async () => {
  let reject!: (reason: Error) => void;
  vi.mocked(assignRecipeToDay).mockReturnValueOnce(
    new Promise((_, fail) => {
      reject = fail;
    })
  );
  const before = useTodayStore.getState().currentRecipe;
  const save = (useTodayStore.getState() as any).saveRecoveryRecipe(
    { id: 'replacement', name: 'B', image: '' },
    calendar
  );
  expect(useTodayStore.getState().currentRecipe).toEqual(before);
  const rejection = expect(save).rejects.toThrow('Rejected');
  reject(new Error('Rejected'));
  await rejection;
  expect(useTodayStore.getState().currentRecipe).toEqual(before);
});
