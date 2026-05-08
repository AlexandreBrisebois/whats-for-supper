import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { SkipRecoveryDialog } from './SkipRecoveryDialog';

describe('SkipRecoveryDialog', () => {
  it('fires the expected step 1 actions when recovery options are clicked', () => {
    const onAction = vi.fn();

    render(
      <SkipRecoveryDialog isOpen step={1} onClose={vi.fn()} onBack={vi.fn()} onAction={onAction} />
    );

    fireEvent.click(screen.getByTestId('recovery-action-order-in'));
    fireEvent.click(screen.getByTestId('recovery-action-pick-else'));

    expect(onAction).toHaveBeenNthCalledWith(1, 'order_in');
    expect(onAction).toHaveBeenNthCalledWith(2, 'pick_else');
  });

  it('fires the expected step 2 actions and supports backing out', () => {
    const onAction = vi.fn();
    const onBack = vi.fn();

    render(
      <SkipRecoveryDialog isOpen step={2} onClose={vi.fn()} onBack={onBack} onAction={onAction} />
    );

    fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(onAction).toHaveBeenCalledWith('tomorrow');
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
