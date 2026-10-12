import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NonCookingDaySheet } from './NonCookingDaySheet';

describe('NonCookingDaySheet', () => {
  it('localizes the sheet, choices and date in French', () => {
    localStorage.setItem('locale', 'fr');
    try {
      render(<NonCookingDaySheet date="2026-10-12" onSave={vi.fn()} onClose={vi.fn()} />);
      expect(screen.getByRole('dialog')).toHaveAccessibleName(
        'Quel est le plan pour le souper? lundi 12 octobre'
      );
      expect(screen.getByRole('button', { name: 'Commander' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enregistrer le plan' })).toBeInTheDocument();
    } finally {
      localStorage.removeItem('locale');
    }
  });
  it('has a readable date-specific title and explicit saving feedback', async () => {
    let finish!: () => void;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    render(<NonCookingDaySheet date="2026-10-12" onSave={onSave} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'What’s the supper plan? Monday, October 12'
    );
    expect(screen.getByRole('button', { name: 'Order In' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Eating out' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save plan' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await act(async () => finish());
  });

  it('cancels without saving and restores focus to the trigger', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const onSave = vi.fn();
    const onClose = vi.fn();
    const view = render(<NonCookingDaySheet date="2026-10-12" onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
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
