import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NonCookingDaySheet } from './NonCookingDaySheet';

describe('NonCookingDaySheet', () => {
  it('shows three choices and preserves custom typing while saving only the selected preset', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<NonCookingDaySheet date="2026-10-12" onSave={onSave} onClose={vi.fn()} />);
    expect(screen.queryByTestId('non-cooking-custom-label')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('non-cooking-other-plans'));
    fireEvent.change(screen.getByTestId('non-cooking-custom-label'), {
      target: { value: 'Supper at Grandma’s' },
    });
    fireEvent.click(screen.getByTestId('non-cooking-eating-out'));
    expect(screen.queryByTestId('non-cooking-custom-label')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('non-cooking-other-plans'));
    expect(screen.getByTestId('non-cooking-custom-label')).toHaveValue('Supper at Grandma’s');
    fireEvent.click(screen.getByTestId('non-cooking-order-in'));
    await act(async () => fireEvent.click(screen.getByTestId('non-cooking-save')));
    expect(onSave).toHaveBeenCalledWith({ kind: 'order_in', customLabel: null });
  });

  it('requires a custom message and retains it after a failed save', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'));
    render(<NonCookingDaySheet date="2026-10-12" onSave={onSave} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('non-cooking-other-plans'));
    await act(async () => fireEvent.click(screen.getByTestId('non-cooking-save')));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('non-cooking-custom-label'), {
      target: { value: '  Emma’s birthday supper  ' },
    });
    await act(async () => fireEvent.click(screen.getByTestId('non-cooking-save')));
    expect(onSave).toHaveBeenCalledWith({ kind: 'custom', customLabel: 'Emma’s birthday supper' });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByTestId('non-cooking-custom-label')).toHaveValue(
      '  Emma’s birthday supper  '
    );
  });
});
