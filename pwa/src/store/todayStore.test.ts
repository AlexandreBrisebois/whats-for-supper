import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Reset store state before each test
beforeEach(() => {
  useTodayStore.setState({
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
      optimisticWriteAt: Date.now() - 500,
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
      optimisticWriteAt: Date.now() - 3_000,
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
    useTodayStore.setState({ optimisticWriteAt: Date.now() - 5_000 });

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
      optimisticWriteAt: Date.now() - 500, // 0.5s ago (within echo window)
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
      optimisticWriteAt: Date.now() - 1000, // 1s ago (recent)
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
    useTodayStore.setState({ optimisticWriteAt: Date.now() });

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
      optimisticWriteAt: Date.now() - 5000,
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
    optimisticWriteAt: Date.now(),
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
