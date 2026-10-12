import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeekStore, type UILocalScheduleDay } from './weekStore';
import { getSchedule, removeRecipeFromDay } from '@/lib/api/planner';

vi.mock('@/lib/api/planner', () => ({
  getSchedule: vi.fn(),
  removeRecipeFromDay: vi.fn(),
  normalizeScheduleRecipe: (recipe: unknown) => recipe ?? null,
}));

const orderedInDay: UILocalScheduleDay = {
  day: 'Mon',
  date: '2026-10-05',
  status: 3,
  recipe: null,
  _uiId: 'ordered-in-slot',
};

describe('removing an ordered-in day', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useWeekStore.setState({
      weekOffset: 0,
      schedule: [orderedInDay],
      groceryItems: [],
      status: 0,
      optimisticWriteAt: null,
    });
  });

  it('clears the ordered-in status immediately and stays empty after server sync', async () => {
    let completeRemoval!: () => void;
    vi.mocked(removeRecipeFromDay).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        completeRemoval = resolve;
      })
    );

    useWeekStore.getState().removeRecipe(0, orderedInDay.date!);

    expect(removeRecipeFromDay).toHaveBeenCalledWith(orderedInDay.date);
    expect(useWeekStore.getState().schedule[0]).toMatchObject({
      status: 0,
      recipe: undefined,
      _isPending: false,
      _userCleared: true,
    });

    completeRemoval();
    await Promise.resolve();
    vi.mocked(getSchedule).mockResolvedValueOnce({
      weekOffset: 0,
      status: 0,
      days: [{ day: orderedInDay.day, date: orderedInDay.date, recipe: null, status: 0 }],
    });
    useWeekStore.setState({ optimisticWriteAt: null });
    await useWeekStore.getState().sync();

    expect(useWeekStore.getState().schedule[0].status).toBe(0);
    expect(useWeekStore.getState().schedule[0].recipe).toBeUndefined();
  });

  it('restores the ordered-in day when removal fails', async () => {
    vi.mocked(removeRecipeFromDay).mockRejectedValueOnce(new Error('Removal failed'));

    useWeekStore.getState().removeRecipe(0, orderedInDay.date!);
    expect(useWeekStore.getState().schedule[0].status).toBe(0);

    await vi.waitFor(() => {
      expect(useWeekStore.getState().schedule[0]).toEqual(orderedInDay);
    });
  });
});
