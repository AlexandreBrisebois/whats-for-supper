import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/api/planner', () => ({
  getSchedule: vi.fn(),
  moveRecipe: vi.fn(),
  assignRecipeToDay: vi.fn(),
  removeRecipeFromDay: vi.fn(),
  openVoting: vi.fn(),
  lockSchedule: vi.fn(),
  getSmartDefaults: vi.fn(),
  normalizeScheduleRecipe: (r: any) => (r?.id ? r : null),
}));
import * as api from '@/lib/api/planner';
import { useWeekStore as week, type UILocalScheduleDay } from './weekStore';
import { usePlannerStore as planner } from './plannerStore';
import type { ScheduleDays } from '@/lib/api/generated/models';

function deferred<T = any>() {
  let resolve!: (value?: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done as any;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const calendar = {
  timeZone: 'UTC',
  today: '2026-05-04',
  currentWeekStartDate: '2026-05-04',
  referenceWeekStartDate: '2026-05-04',
  capturedAtUtc: '2026-05-04T12:00:00Z',
  nextDayAtUtc: '2026-05-05T00:00:00Z',
};
const days = (start = 4): UILocalScheduleDay[] =>
  Array.from({ length: 7 }, (_, i) => ({
    date: `2026-05-${String(start + i).padStart(2, '0')}`,
    day: String(i),
    _uiId: String(i),
    status: 0,
    recipe: { id: `recipe-${i}`, name: `Meal ${i}`, image: '' },
  }));
const response = (schedule: UILocalScheduleDay[], offset = 0) =>
  ({
    weekOffset: offset,
    weekStartDate: offset ? '2026-05-11' : '2026-05-04',
    calendar,
    status: 0,
    days: schedule,
    groceryItems: [],
  }) as unknown as ScheduleDays;
function move(from: number, to: number) {
  const snapshot = week.getState().schedule;
  week.getState().reorderLocally(from, to, snapshot);
  week.getState().commitMove(from, to, snapshot);
  return week.getState().schedule;
}
beforeEach(() => {
  vi.resetAllMocks();
  planner.setState({
    currentWeekOffset: 0,
    localMoveSeq: 0,
    confirmedMoveSeq: 0,
    pendingMoveSeqs: [],
    isDragActive: false,
    deferredWeekSnapshot: null,
  });
  week.setState({
    weekOffset: 0,
    weekStartDate: '2026-05-04',
    calendar,
    schedule: days(),
    status: 0,
    votingRoundId: null,
  });
  vi.mocked(api.getSchedule).mockResolvedValue(undefined);
  vi.mocked(api.moveRecipe).mockResolvedValue(undefined);
});

describe('settled movement reconciliation', () => {
  it.each([false, true])(
    'waits for all movement completions (newest first: %s)',
    async (newestFirst) => {
      const first = deferred(),
        second = deferred();
      vi.mocked(api.moveRecipe)
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      move(0, 1);
      const final = move(2, 3);
      (newestFirst ? second : first).resolve();
      await flush();
      expect(api.getSchedule).not.toHaveBeenCalled();
      (newestFirst ? first : second).resolve();
      await flush();
      expect(api.getSchedule).toHaveBeenCalledExactlyOnceWith(0, '2026-05-04');
      expect(week.getState().schedule).toBe(final);
    }
  );

  it('retires an older held read when a newer movement batch reconciles first', async () => {
    const older = deferred(),
      newer = deferred();
    vi.mocked(api.getSchedule)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const middle = move(0, 1);
    await flush();
    const final = move(2, 3);
    await flush();
    newer.resolve(response(final));
    await flush();
    older.resolve(response(middle));
    await flush();
    expect(week.getState().schedule.map((d) => d.recipe?.id)).toEqual(
      final.map((d) => d.recipe?.id)
    );
  });

  it.each(['snapshot', 'slot'])(
    'preserves a newer authoritative %s while a read is held',
    async (change) => {
      const read = deferred();
      vi.mocked(api.getSchedule).mockReturnValueOnce(read.promise);
      const stale = move(0, 1);
      await flush();
      if (change === 'snapshot') {
        const current = days();
        current[4].recipe = { id: 'remote', name: 'Remote supper', image: '' };
        week.getState().applySnapshot(response(current));
      } else
        week.getState().applySlotUpdate({
          date: days()[4].date!,
          recipe: { id: 'remote', name: 'Remote supper' },
          status: 0,
        });
      read.resolve(response(stale));
      await flush();
      expect(week.getState().schedule[4].recipe?.id).toBe('remote');
    }
  );

  it('reconciles the newer selected week even when an old-week move settles last', async () => {
    const old = deferred(),
      current = deferred();
    vi.mocked(api.moveRecipe).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    move(0, 1);
    planner.getState().setWeekOffset(1);
    week.setState({ weekOffset: 1, weekStartDate: '2026-05-11', schedule: days(11) });
    const final = move(2, 3);
    vi.mocked(api.getSchedule).mockResolvedValue(response(final, 1));
    current.resolve();
    await flush();
    expect(api.getSchedule).not.toHaveBeenCalled();
    old.resolve();
    await flush();
    expect(api.getSchedule).toHaveBeenCalledExactlyOnceWith(1, '2026-05-04');
    expect(week.getState().schedule.map((d) => d.recipe?.id)).toEqual(
      final.map((d) => d.recipe?.id)
    );
  });

  it('ignores a held read after selected-week navigation', async () => {
    const read = deferred();
    vi.mocked(api.getSchedule).mockReturnValueOnce(read.promise);
    const old = move(0, 1);
    await flush();
    const selected = days(11);
    planner.getState().setWeekOffset(1);
    week.setState({ weekOffset: 1, weekStartDate: '2026-05-11', schedule: selected });
    read.resolve(response(old));
    await flush();
    expect(week.getState().schedule).toBe(selected);
  });

  it('restarts reconciliation after a new preview cancels without replaying a pre-settlement snapshot', async () => {
    const held = deferred();
    const final = move(0, 1);
    vi.mocked(api.getSchedule)
      .mockReturnValueOnce(held.promise)
      .mockResolvedValueOnce(response(final));
    await flush();
    planner.getState().setIsDragActive(true);
    const snapshot = week.getState().schedule;
    week.getState().reorderLocally(2, 3, snapshot);
    const preview = week.getState().schedule;
    week.getState().applySnapshot(response(days()));
    held.resolve(response(days()));
    await flush();
    expect(week.getState().schedule).toBe(preview);
    week.getState().reorderLocally(2, 2, snapshot);
    planner.getState().setIsDragActive(false);
    // Mirror the hook's ordinary deferred-event release on cancellation.
    const pending = planner.getState().deferredWeekSnapshot;
    if (pending) week.getState().applySnapshot(pending);
    await flush();
    expect(api.getSchedule).toHaveBeenCalledTimes(2);
    expect(week.getState().schedule.map((d) => d.recipe?.id)).toEqual(
      final.map((d) => d.recipe?.id)
    );
  });

  it('postpones the final read if movement settles during a newer active preview', async () => {
    const request = deferred();
    vi.mocked(api.moveRecipe).mockReturnValueOnce(request.promise);
    const final = move(0, 1);
    planner.getState().setIsDragActive(true);
    week.getState().reorderLocally(2, 3, final);
    const preview = week.getState().schedule;
    week.getState().applySnapshot(response(days()));
    request.resolve();
    await flush();
    expect(api.getSchedule).not.toHaveBeenCalled();
    expect(week.getState().schedule).toBe(preview);
    vi.mocked(api.getSchedule).mockResolvedValueOnce(response(final));
    week.getState().reorderLocally(2, 2, final);
    planner.getState().setIsDragActive(false);
    expect(planner.getState().deferredWeekSnapshot).toBeNull();
    await flush();
    expect(api.getSchedule).toHaveBeenCalledTimes(1);
    expect(week.getState().schedule.map((d) => d.recipe?.id)).toEqual(
      final.map((d) => d.recipe?.id)
    );
  });
});

import { useUiStore } from './uiStore';
import { t } from '@/locales';

beforeEach(() => {
  useUiStore.setState({ toasts: [] });
  localStorage.removeItem('locale');
});

describe('rejected movement recovery', () => {
  it.each([false, true])(
    'preserves an independent later successful move until authoritative reconciliation (rejection first: %s)',
    async (rejectionFirst) => {
      const first = deferred(),
        second = deferred(),
        read = deferred();
      vi.mocked(api.moveRecipe)
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      vi.mocked(api.getSchedule).mockReturnValueOnce(read.promise);
      move(0, 1);
      const newer = move(2, 3);
      if (rejectionFirst) first.reject(new Error('rejected'));
      else second.resolve();
      await flush();
      expect(api.getSchedule).not.toHaveBeenCalled();
      expect(week.getState().schedule).toBe(newer);
      if (rejectionFirst) second.resolve();
      else first.reject(new Error('rejected'));
      await flush();
      expect(week.getState().schedule).toBe(newer);
      expect(api.getSchedule).toHaveBeenCalledExactlyOnceWith(0, '2026-05-04');
      const authoritative = days();
      [authoritative[2].recipe, authoritative[3].recipe] = [
        authoritative[3].recipe,
        authoritative[2].recipe,
      ];
      read.resolve(response(authoritative));
      await flush();
      expect(week.getState().schedule.map((d) => d.recipe?.id)).toEqual(
        authoritative.map((d) => d.recipe?.id)
      );
      expect(api.moveRecipe).toHaveBeenCalledTimes(2);
    }
  );

  it.each(['assignment', 'slot event'])(
    'preserves a newer %s when an earlier move rejects',
    async (change) => {
      const request = deferred(),
        read = deferred();
      vi.mocked(api.moveRecipe).mockReturnValueOnce(request.promise);
      move(0, 1);
      if (change === 'assignment') {
        vi.mocked(api.assignRecipeToDay).mockResolvedValueOnce(undefined);
        await week.getState().assignRecipe(4, { id: 'newer', name: 'New supper', image: '' });
      } else
        week.getState().applySlotUpdate({
          date: days()[4].date!,
          recipe: { id: 'newer', name: 'New supper' },
          status: 0,
        });
      const newer = week.getState().schedule;
      vi.mocked(api.getSchedule).mockClear().mockReturnValueOnce(read.promise);
      request.reject(new Error('rejected'));
      await flush();
      expect(week.getState().schedule).toBe(newer);
      expect(week.getState().schedule[4].recipe?.id).toBe('newer');
      expect(api.getSchedule).toHaveBeenCalledTimes(1);
      read.resolve(response(newer));
      await flush();
    }
  );

  it('preserves an active preview and waits for its cancellation before reading', async () => {
    const request = deferred();
    vi.mocked(api.moveRecipe).mockReturnValueOnce(request.promise);
    const committed = move(0, 1);
    planner.getState().setIsDragActive(true);
    week.getState().reorderLocally(2, 3, committed);
    const preview = week.getState().schedule;
    request.reject(new Error('rejected'));
    await flush();
    expect(week.getState().schedule).toBe(preview);
    expect(api.getSchedule).not.toHaveBeenCalled();
    vi.mocked(api.getSchedule).mockResolvedValueOnce(response(days()));
    week.getState().reorderLocally(2, 2, committed);
    planner.getState().setIsDragActive(false);
    await flush();
    expect(api.getSchedule).toHaveBeenCalledTimes(1);
    expect(week.getState().schedule.map((d) => d.recipe?.id)).toEqual(
      days().map((d) => d.recipe?.id)
    );
    expect(api.moveRecipe).toHaveBeenCalledTimes(1);
  });

  it('restores an owned failed move immediately and still reconciles once', async () => {
    const original = week.getState().schedule,
      request = deferred(),
      read = deferred();
    vi.mocked(api.moveRecipe).mockReturnValueOnce(request.promise);
    vi.mocked(api.getSchedule).mockReturnValueOnce(read.promise);
    move(0, 1);
    request.reject(new Error('rejected'));
    await flush();
    expect(week.getState().schedule).toBe(original);
    expect(api.getSchedule).toHaveBeenCalledTimes(1);
    read.resolve(response(original));
    await flush();
  });

  it.each(['rejected', 'undefined', 'successful move'])(
    'retains newer state with localized feedback on %s refresh failure',
    async (failure) => {
      const request = deferred();
      vi.mocked(api.moveRecipe).mockReturnValueOnce(request.promise);
      const committed = move(0, 1);
      week.getState().applySlotUpdate({
        date: days()[4].date!,
        recipe: { id: 'newer', name: 'New supper' },
        status: 0,
      });
      const newer = week.getState().schedule;
      localStorage.setItem('locale', 'fr');
      if (failure === 'undefined') vi.mocked(api.getSchedule).mockResolvedValueOnce(undefined);
      else vi.mocked(api.getSchedule).mockRejectedValueOnce(new Error('offline'));
      if (failure === 'successful move') request.resolve();
      else request.reject(new Error('rejected'));
      await flush();
      expect(week.getState().schedule).toBe(newer);
      expect(week.getState().schedule).not.toBe(committed);
      expect(useUiStore.getState().toasts).toEqual([
        expect.objectContaining({
          type: 'error',
          message: t('planner.refreshError', 'missing', 'fr'),
        }),
      ]);
      expect(useUiStore.getState().toasts[0].message).not.toBe('missing');
      expect(api.moveRecipe).toHaveBeenCalledTimes(1);
      expect(api.getSchedule).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['week', 'slot', 'new movement'])(
    'suppresses refresh-failure feedback for a read superseded by %s',
    async (change) => {
      const request = deferred(),
        read = deferred();
      vi.mocked(api.moveRecipe).mockReturnValueOnce(request.promise);
      vi.mocked(api.getSchedule).mockReturnValueOnce(read.promise);
      move(0, 1);
      request.reject(new Error('rejected'));
      await flush();
      expect(api.getSchedule).toHaveBeenCalledTimes(1);
      if (change === 'week') {
        planner.getState().setWeekOffset(1);
        week.setState({ weekOffset: 1, weekStartDate: '2026-05-11', schedule: days(11) });
      } else if (change === 'slot')
        week
          .getState()
          .applySlotUpdate({ date: days()[4].date!, recipe: { id: 'remote' }, status: 0 });
      else {
        vi.mocked(api.getSchedule).mockResolvedValueOnce(response(days()));
        move(2, 3);
        await flush();
      }
      const newer = week.getState().schedule;
      read.reject(new Error('offline'));
      await flush();
      expect(week.getState().schedule).toBe(newer);
      expect(useUiStore.getState().toasts).toEqual([]);
    }
  );
});

it('does not restore or refresh an old week when its movement rejects after navigation', async () => {
  const request = deferred();
  vi.mocked(api.moveRecipe).mockReturnValueOnce(request.promise);
  move(0, 1);
  const selected = days(11);
  planner.getState().setWeekOffset(1);
  week.setState({ weekOffset: 1, weekStartDate: '2026-05-11', schedule: selected });
  request.reject(new Error('rejected'));
  await flush();
  expect(week.getState().schedule).toBe(selected);
  expect(api.getSchedule).not.toHaveBeenCalled();
  expect(api.moveRecipe).toHaveBeenCalledTimes(1);
  expect(useUiStore.getState().toasts).toEqual([]);
});

it('waits for a newer pending assignment before authoritative movement recovery', async () => {
  const movement = deferred(),
    assignment = deferred();
  vi.mocked(api.moveRecipe).mockReturnValueOnce(movement.promise);
  vi.mocked(api.assignRecipeToDay).mockReturnValueOnce(assignment.promise);
  move(0, 1);
  const assigned = week
    .getState()
    .assignRecipe(4, { id: 'assigned', name: 'Assigned supper', image: '' });
  const newer = week.getState().schedule;
  vi.mocked(api.getSchedule).mockResolvedValue(response(days()));
  movement.reject(new Error('rejected'));
  await flush();
  expect(api.getSchedule).not.toHaveBeenCalled();
  expect(week.getState().schedule).toBe(newer);
  vi.mocked(api.getSchedule).mockResolvedValue(response(newer));
  assignment.resolve();
  await assigned;
  await flush();
  expect(week.getState().schedule[4].recipe?.id).toBe('assigned');
  expect(api.assignRecipeToDay).toHaveBeenCalledTimes(1);
  expect(api.moveRecipe).toHaveBeenCalledTimes(1);
  // Assignment's grocery refresh plus the movement batch's final authoritative read.
  expect(api.getSchedule).toHaveBeenCalledTimes(2);
});

it.each(['rejection', 'read failure', 'read success'])(
  'guards the navigation frame before the selected week initializes (%s)',
  async (completion) => {
    const movement = deferred(),
      read = deferred();
    vi.mocked(api.moveRecipe).mockReturnValueOnce(movement.promise);
    vi.mocked(api.getSchedule).mockReturnValueOnce(read.promise);
    const preview = move(0, 1);
    if (completion !== 'rejection') {
      movement.resolve();
      await flush();
    }
    planner.getState().setWeekOffset(1);
    if (completion === 'rejection') movement.reject(new Error('rejected'));
    else if (completion === 'read failure') read.reject(new Error('offline'));
    else read.resolve(response(days()));
    await flush();
    expect(week.getState().schedule).toBe(preview);
    expect(useUiStore.getState().toasts).toEqual([]);
    if (completion === 'rejection') expect(api.getSchedule).not.toHaveBeenCalled();
  }
);

it('waits for a newer pending removal before authoritative movement recovery', async () => {
  const movement = deferred(),
    removal = deferred();
  vi.mocked(api.moveRecipe).mockReturnValueOnce(movement.promise);
  vi.mocked(api.removeRecipeFromDay).mockReturnValueOnce(removal.promise);
  move(0, 1);
  week.getState().removeRecipe(4, days()[4].date!);
  const newer = week.getState().schedule;
  vi.mocked(api.getSchedule).mockResolvedValue(response(days()));
  movement.reject(new Error('rejected'));
  await flush();
  expect(api.getSchedule).not.toHaveBeenCalled();
  expect(week.getState().schedule).toBe(newer);
  vi.mocked(api.getSchedule).mockResolvedValue(response(newer));
  removal.resolve();
  await flush();
  expect(week.getState().schedule[4].recipe).toBeFalsy();
  expect(api.removeRecipeFromDay).toHaveBeenCalledTimes(1);
  expect(api.moveRecipe).toHaveBeenCalledTimes(1);
  expect(api.getSchedule).toHaveBeenCalledTimes(1);
});
