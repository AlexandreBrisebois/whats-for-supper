import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/planner', () => ({
  assignRecipeToDay: vi.fn().mockResolvedValue(undefined),
  getSchedule: vi.fn().mockResolvedValue(undefined),
  isScheduleRecipe: (recipe: any) => !!recipe && typeof recipe.id === 'string' && recipe.id.length > 0,
}));

import { useTodayStore } from './todayStore';
import { assignRecipeToDay } from '@/lib/api/planner';

// Reset store state before each test
beforeEach(() => {
  useTodayStore.setState({
    currentRecipe: null,
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
