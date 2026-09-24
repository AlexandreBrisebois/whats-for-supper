import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '@/store/uiStore';
import { ToastContainer } from './ToastContainer';

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUiStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps persistent toasts until dismissed without affecting unrelated toasts', () => {
    const persistentToastId = useUiStore.getState().addToast({
      type: 'loading',
      message: 'Preparing recipe…',
      persistent: true,
    });
    useUiStore.getState().addToast({ type: 'success', message: 'Saved' });

    render(<ToastContainer />);

    act(() => vi.advanceTimersByTime(5000));

    expect(useUiStore.getState().toasts).toEqual([
      expect.objectContaining({ id: persistentToastId, message: 'Preparing recipe…' }),
    ]);
    expect(screen.getByText('Preparing recipe…').closest('[role="status"]')).toBeTruthy();

    const unrelatedToastId = useUiStore.getState().addToast({
      type: 'info',
      message: 'Still here',
      persistent: true,
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0]);
    expect(useUiStore.getState().toasts).toEqual([
      expect.objectContaining({ id: unrelatedToastId, message: 'Still here' }),
    ]);
    expect(persistentToastId).toBeTruthy();
  });
});
