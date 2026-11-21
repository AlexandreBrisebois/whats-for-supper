import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSchedule: vi.fn(),
  dispose: vi.fn(),
  assign: vi.fn(),
}));
vi.mock('@/lib/api/planner', () => ({ getSchedule: mocks.getSchedule }));
vi.mock('./slotAssignment', () => ({
  assignRecipeToEmptySlot: mocks.assign,
  disposeReplacementOriginal: mocks.dispose,
}));
vi.mock('./planningResult', () => ({ rememberPlanningResult: vi.fn() }));
vi.mock('@/locales', () => ({ t: (_key: string, fallback: string) => fallback }));
import { useReplacementRecovery } from './useReplacementRecovery';

const slot = {
  referenceWeekStartDate: '2026-05-04',
  weekOffset: 0,
  dayIndex: 2,
  date: '2026-05-06',
  recipe: null,
  status: 3,
  nonCooking: { kind: 'custom', customLabel: 'Birthday dinner' },
} as never;
const recipe = { id: 'r1', name: 'Chicken Soup' } as never;
const occupied = { date: '2026-05-06', status: 3, nonCooking: { kind: 'custom' } };

function mount() {
  const onClosed = vi.fn();
  const onReview = vi.fn();
  const view = renderHook(() =>
    useReplacementRecovery({ slot, recipe, onClosed, onSaved: vi.fn(), onReview })
  );
  return { ...view, onClosed, onReview };
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.getSchedule.mockResolvedValue({ days: [occupied] });
});

describe('useReplacementRecovery close', () => {
  it('closes immediately without an abandon gate when the plan conflicted before any change committed', async () => {
    mocks.dispose.mockRejectedValue({ responseStatusCode: 409 });
    const { result, onClosed } = mount();
    await act(async () => {
      await result.current.act('drop');
    });
    expect(result.current.feedback?.phase).toBe('conflict');
    act(() => result.current.close());
    expect(result.current.confirmAbandon).toBe(false);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('routes Review plan straight to review when nothing committed', async () => {
    mocks.dispose.mockRejectedValue({ responseStatusCode: 409 });
    const { result, onClosed, onReview } = mount();
    await act(async () => {
      await result.current.act('drop');
    });
    act(() => result.current.review());
    expect(result.current.confirmAbandon).toBe(false);
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it('still confirms abandonment once the original was removed but the new meal is unsaved', async () => {
    mocks.dispose.mockResolvedValue({
      action: 'drop',
      recipeName: 'Birthday',
      sourceDate: '2026-05-06',
    });
    mocks.assign.mockRejectedValue(new Error('offline'));
    mocks.getSchedule.mockRejectedValue(new Error('offline'));
    const { result, onClosed } = mount();
    await act(async () => {
      await result.current.act('drop');
    });
    await waitFor(() => expect(result.current.feedback?.phase).toBe('unknown'));
    act(() => result.current.close());
    expect(result.current.confirmAbandon).toBe(true);
    expect(onClosed).not.toHaveBeenCalled();
  });

  it('still confirms abandonment when the original removal could not be confirmed', async () => {
    mocks.dispose.mockRejectedValue(new Error('offline'));
    mocks.getSchedule.mockRejectedValue(new Error('offline'));
    const { result, onClosed } = mount();
    await act(async () => {
      await result.current.act('drop');
    });
    expect(result.current.feedback?.phase).toBe('disposition_unknown');
    act(() => result.current.close());
    expect(result.current.confirmAbandon).toBe(true);
    expect(onClosed).not.toHaveBeenCalled();
  });
});
