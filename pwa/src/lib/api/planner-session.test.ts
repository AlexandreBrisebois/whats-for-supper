import { describe, expect, it, vi, beforeEach } from 'vitest';
const { post, remove, refreshSession } = vi.hoisted(() => ({
  post: vi.fn(),
  remove: vi.fn(),
  refreshSession: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./api-client', () => ({
  apiClient: {
    api: {
      schedule: {
        assign: { post },
        move: { post },
        lock: { post },
        voting: { open: { post } },
        day: { byDate: () => ({ remove: { delete: remove }, validate: { post } }) },
      },
    },
  },
}));
vi.mock('@/store/discoveryStore', () => ({
  useDiscoveryStore: { getState: () => ({ refreshSession }) },
}));
import {
  assignRecipeToDay,
  openVoting,
  removeRecipeFromDay,
  saveNonCookingDay,
  moveRecipe,
  lockSchedule,
} from './planner';
beforeEach(() => {
  vi.clearAllMocks();
  post.mockResolvedValue({ data: {} });
  remove.mockResolvedValue(undefined);
});
describe('local plan mutation session reconciliation', () => {
  it.each([
    [
      'assignment',
      () =>
        assignRecipeToDay(
          0,
          0,
          { id: '00000000-0000-4000-8000-000000000001', name: 'Meal', image: '' },
          '2025-01-06'
        ),
    ],
    ['open', () => openVoting(0, '2025-01-06')],
    ['close', () => lockSchedule(0, '2025-01-06')],
    ['move', () => moveRecipe(0, '00000000-0000-4000-8000-000000000001', 1, 0, '2025-01-06')],
    ['removal', () => removeRecipeFromDay('2025-01-06')],
    ['Other plan', () => saveNonCookingDay('2025-01-06', { kind: 'custom', customLabel: 'Party' })],
  ])('reads session after successful %s without needing an echo', async (_, mutation) => {
    await (mutation as () => Promise<unknown>)();
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
