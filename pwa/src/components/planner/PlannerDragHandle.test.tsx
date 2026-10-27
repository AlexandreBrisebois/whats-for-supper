import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerDragHandle } from './PlannerDragHandle';

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
  it('requires a stationary 250ms hold and signals readiness once', () => {
    render(<PlannerDragHandle start={start} />);
    down();
    act(() => vi.advanceTimersByTime(249));
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
  it('clears the grabbed cue on Escape during an active hold', () => {
    render(<PlannerDragHandle start={start} />);
    down();
    act(() => vi.advanceTimersByTime(250));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('planner-drag-handle')).toHaveAttribute('data-grabbed', 'false');
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
    act(() => vi.advanceTimersByTime(250));
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
  it('requires the hold without any feature-flag snapshot', () => {
    render(<PlannerDragHandle start={start} />);
    down();
    expect(start).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(250));
    expect(start).toHaveBeenCalledTimes(1);
  });
  it('ignores explicitly non-primary pointers', () => {
    render(<PlannerDragHandle start={start} />);
    fireEvent.pointerDown(screen.getByTestId('planner-drag-handle'), {
      button: 0,
      isPrimary: false,
    });
    act(() => vi.advanceTimersByTime(500));
    expect(start).not.toHaveBeenCalled();
  });
  it('still activates when vibration is unsupported', () => {
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined });
    render(<PlannerDragHandle start={start} />);
    down();
    act(() => vi.advanceTimersByTime(250));
    expect(start).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['ArrowUp', -1],
    ['ArrowDown', 1],
  ] as const)('offers %s as a keyboard movement alternative', (key, direction) => {
    const moveBySlot = vi.fn();
    render(<PlannerDragHandle start={start} moveBySlot={moveBySlot} />);
    const handle = screen.getByTestId('planner-drag-handle');

    expect(handle).toHaveAttribute('tabindex', '0');
    expect(handle).toHaveAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
    expect(handle).toHaveAccessibleName(
      'Hold to move. Use the Up and Down arrow keys to move one day.'
    );
    fireEvent.keyDown(handle, { key });

    expect(moveBySlot).toHaveBeenCalledWith(direction);
    expect(start).not.toHaveBeenCalled();
  });
});
