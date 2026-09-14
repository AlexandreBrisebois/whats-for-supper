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

vi.mock('@/lib/api/planner', () => ({
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
        dayIndex: 2,
        date: '2026-05-13',
        recipe: { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
      },
      'next_week',
      true
    );

    expect(mocks.deferPost).toHaveBeenCalledWith({
      sourceDate: '2026-05-13',
      recipeId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(mocks.movePost).not.toHaveBeenCalled();
  });
});
