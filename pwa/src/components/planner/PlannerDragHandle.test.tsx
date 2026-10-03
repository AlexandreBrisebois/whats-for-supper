import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerDragHandle } from './PlannerDragHandle';
import { useFeatureFlagStore } from '@/store/featureFlagStore';

describe('planner hold to move', () => {
  const start = vi.fn();
  const vibrate = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'PointerEvent',
      class extends MouseEvent {
        pointerId: number;
        isPrimary: boolean;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 1;
          this.isPrimary = init.isPrimary ?? true;
        }
      }
    );
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    useFeatureFlagStore.setState({
      flags: {
        'planner-hold-to-move': {
          key: 'planner-hold-to-move',
          enabled: true,
          mode: 'opt-in',
          memberEnabled: true,
        },
      },
    });
    start.mockClear();
    vibrate.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const down = () =>
    fireEvent.pointerDown(screen.getByTestId('planner-drag-handle'), {
      button: 0,
      clientX: 20,
      clientY: 20,
    });
  it('requires a stationary 400ms hold and signals readiness once', () => {
    render(<PlannerDragHandle start={start} />);
    down();
    act(() => vi.advanceTimersByTime(399));
    expect(start).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(start).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(15);
    expect(screen.getByTestId('planner-drag-handle')).toHaveAttribute('data-grabbed', 'true');
    fireEvent.pointerUp(window);
    expect(screen.getByTestId('planner-drag-handle')).toHaveAttribute('data-grabbed', 'false');
  });
  it.each(['pointerUp', 'pointerCancel', 'blur'])('cancels on %s', (event) => {
    render(<PlannerDragHandle start={start} />);
    down();
    fireEvent(window, new PointerEvent(event === 'blur' ? event : event.toLowerCase()));
    act(() => vi.advanceTimersByTime(500));
    expect(start).not.toHaveBeenCalled();
  });
  it('cancels a scroll gesture without preventing native scrolling', () => {
    render(<PlannerDragHandle start={start} />);
    down();
    fireEvent.pointerMove(window, { clientX: 20, clientY: 30 });
    const move = new Event('touchmove', { bubbles: true, cancelable: true });
    screen.getByTestId('planner-drag-handle').dispatchEvent(move);
    expect(move.defaultPrevented).toBe(false);
    act(() => vi.advanceTimersByTime(500));
    expect(start).not.toHaveBeenCalled();
  });
  it('prevents native scrolling only after activation', () => {
    render(<PlannerDragHandle start={start} />);
    down();
    act(() => vi.advanceTimersByTime(400));
    const move = new Event('touchmove', { bubbles: true, cancelable: true });
    screen.getByTestId('planner-drag-handle').dispatchEvent(move);
    expect(move.defaultPrevented).toBe(true);
  });
  it('cleans up pending activation on unmount', () => {
    const view = render(<PlannerDragHandle start={start} />);
    down();
    view.unmount();
    act(() => vi.advanceTimersByTime(500));
    expect(start).not.toHaveBeenCalled();
  });
  it('cancels pending activation when the preview is turned off', () => {
    render(<PlannerDragHandle start={start} />);
    down();
    act(() => useFeatureFlagStore.setState({ flags: {} }));
    act(() => vi.advanceTimersByTime(500));
    expect(start).not.toHaveBeenCalled();
  });
  it('cancels the hold when a second finger lands', () => {
    render(<PlannerDragHandle start={start} />);
    down();
    fireEvent.pointerDown(window, { pointerId: 2, isPrimary: false });
    act(() => vi.advanceTimersByTime(500));
    expect(start).not.toHaveBeenCalled();
  });
  it('ignores secondary buttons', () => {
    render(<PlannerDragHandle start={start} />);
    fireEvent.pointerDown(screen.getByTestId('planner-drag-handle'), { button: 2 });
    act(() => vi.advanceTimersByTime(500));
    expect(start).not.toHaveBeenCalled();
  });
  it('preserves immediate activation with preview disabled', () => {
    useFeatureFlagStore.setState({ flags: {} });
    render(<PlannerDragHandle start={start} />);
    down();
    expect(start).toHaveBeenCalledTimes(1);
  });
});
