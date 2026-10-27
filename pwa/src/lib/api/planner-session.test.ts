import { usePlannerStore } from '@/store/plannerStore';
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
  usePlannerStore.setState({ localMoveSeq: 0, confirmedMoveSeq: 0, pendingMoveSeqs: [] });
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

describe('move HTTP acknowledgement without a self SSE echo', () => {
  it.each([false, true])('settles the captured sequence on rejection=%s', async (reject) => {
    let resolve!: (value: unknown) => void;
    let fail!: (reason: Error) => void;
    post.mockImplementationOnce(
      () =>
        new Promise((yes, no) => {
          resolve = yes;
          fail = no;
        })
    );
    const moving = moveRecipe(0, '00000000-0000-4000-8000-000000000001', 1, 0);
    expect(usePlannerStore.getState().confirmedMoveSeq).toBe(0);
    usePlannerStore.getState().nextMoveSeq(); // a later request must remain pending
    const result = moving.catch(() => undefined);
    if (reject) fail(new Error('rejected'));
    else resolve({ data: {} });
    await result;
    expect(usePlannerStore.getState().confirmedMoveSeq).toBe(1);
    expect(usePlannerStore.getState().localMoveSeq).toBe(2);
  });
});

it('keeps an earlier HTTP move pending when a later move completes first', async () => {
  let finishFirst!: (value: unknown) => void;
  let finishSecond!: (value: unknown) => void;
  post.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishFirst = resolve;
      })
  );
  post.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishSecond = resolve;
      })
  );
  const first = moveRecipe(0, '00000000-0000-4000-8000-000000000001', 1, 0);
  const second = moveRecipe(0, '00000000-0000-4000-8000-000000000002', 2, 1);
  finishSecond({ data: {} });
  await second;
  expect(usePlannerStore.getState().confirmedMoveSeq).toBe(0);
  finishFirst({ data: {} });
  await first;
  expect(usePlannerStore.getState().confirmedMoveSeq).toBe(2);
});
