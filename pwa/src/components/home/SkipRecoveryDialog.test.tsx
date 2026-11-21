vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));
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

    expect(
      screen.getByTestId('recovery-action-order-in').querySelector('.lucide-shopping-bag')
    ).not.toBeNull();
    fireEvent.click(screen.getByTestId('recovery-action-order-in'));
    fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
    fireEvent.click(screen.getByTestId('recovery-action-search'));

    expect(onAction).toHaveBeenNthCalledWith(1, 'order_in');
    expect(onAction).toHaveBeenNthCalledWith(2, 'pick_else');
    expect(onAction).toHaveBeenNthCalledWith(3, 'search');
    expect(screen.getByTestId('recovery-action-pick-else')).toHaveAccessibleName(/Suggestions/);
    expect(screen.getByTestId('recovery-action-search')).toHaveAccessibleName(/Search/);
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

  it('uses >= 12px sentence-case Family Cookbook typography and 48px close target without faint charcoal copy', () => {
    const { rerender } = render(
      <SkipRecoveryDialog isOpen step={1} onClose={vi.fn()} onBack={vi.fn()} onAction={vi.fn()} />
    );
    const title = screen.getByTestId('recovery-dialog-title');
    expect(title).toHaveClass('text-xs');
    expect(title).not.toHaveClass('text-[10px]', 'uppercase');
    expect(screen.getByTestId('recovery-close')).toHaveClass('h-12', 'w-12');
    expect(screen.getByText('Plans changed. We get it. What are we eating instead?')).toHaveClass(
      'text-charcoal-600'
    );

    rerender(
      <SkipRecoveryDialog isOpen step={2} onClose={vi.fn()} onBack={vi.fn()} onAction={vi.fn()} />
    );
    const consequence = screen.getByText('Keeps the recipe in your library');
    expect(consequence).toHaveClass('text-xs', 'text-charcoal-600');
    expect(consequence).not.toHaveClass('text-[10px]', 'uppercase', 'text-charcoal/30');
    const goBack = screen.getByRole('button', { name: 'Go back' });
    expect(goBack).toHaveClass('min-h-12', 'text-sm', 'text-hearth-ink', 'w-full');
    expect(goBack).not.toHaveClass('text-xs', 'text-charcoal-600', 'uppercase', 'text-charcoal/30');
  });

  it('presents Go back as a secondary ghost button with a back arrow after the options', () => {
    const onBack = vi.fn();
    render(
      <SkipRecoveryDialog isOpen step={2} onClose={vi.fn()} onBack={onBack} onAction={vi.fn()} />
    );
    const goBack = screen.getByRole('button', { name: 'Go back' });
    expect(goBack.querySelector('.lucide-arrow-left')).not.toBeNull();
    expect(goBack.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(goBack).toHaveClass('focus-visible:outline-2');
    const drop = screen.getByTestId('recovery-action-drop');
    expect(drop.compareDocumentPosition(goBack) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(goBack);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('recovery-close')).toBeInTheDocument();
  });

  it('disables Go back while a disposition is pending', () => {
    const onBack = vi.fn();
    render(
      <SkipRecoveryDialog
        isOpen
        pending
        step={2}
        onClose={vi.fn()}
        onBack={onBack}
        onAction={vi.fn()}
      />
    );
    const goBack = screen.getByRole('button', { name: 'Go back' });
    expect(goBack).toBeDisabled();
    fireEvent.click(goBack);
    expect(onBack).not.toHaveBeenCalled();
  });
});

it('announces an uncertain save and offers checking without another disposition', () => {
  const retry = vi.fn();
  render(
    <SkipRecoveryDialog
      isOpen
      step={2}
      onClose={vi.fn()}
      onBack={vi.fn()}
      onAction={vi.fn()}
      replacement={{
        phase: 'unknown',
        message: 'Your new meal could not be confirmed.',
        recipeName: 'Pasta',
      }}
      onRetryReplacement={retry}
    />
  );
  expect(screen.getByRole('alert')).toHaveTextContent('could not be confirmed');
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.queryByTestId('recovery-action-tomorrow')).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId('recovery-retry-check'));
  expect(retry).toHaveBeenCalledOnce();
});

it('disables dismissal while saving and explicitly confirms partial abandonment', () => {
  const close = vi.fn(),
    abandon = vi.fn(),
    cancel = vi.fn();
  const props = {
    isOpen: true,
    step: 2 as const,
    onClose: close,
    onBack: vi.fn(),
    onAction: vi.fn(),
    replacement: { phase: 'saving' as const, message: 'Saving…', recipeName: 'Pasta' },
  };
  const view = render(<SkipRecoveryDialog {...props} pending />);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(close).not.toHaveBeenCalled();
  view.rerender(
    <SkipRecoveryDialog
      {...props}
      replacement={{ ...props.replacement, phase: 'retry' }}
      onRetryReplacement={vi.fn()}
    />
  );
  view.rerender(
    <SkipRecoveryDialog
      {...props}
      replacement={{ ...props.replacement, phase: 'retry' }}
      confirmAbandon
      onAbandon={abandon}
      onCancelAbandon={cancel}
    />
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Completed changes');
  expect(screen.getByTestId('recovery-keep-editing')).toHaveFocus();
  fireEvent.click(screen.getByTestId('recovery-keep-editing'));
  expect(cancel).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByTestId('recovery-abandon'));
  expect(abandon).toHaveBeenCalledOnce();
});

// Run the real declaration/coordinator path rather than mocking the observation hook.

it('retains recovery pending, step and feedback behavior until dismissal', async () => {
  const props = {
    isOpen: false,
    step: 1 as const,
    onClose: vi.fn(),
    onBack: vi.fn(),
    onAction: vi.fn(),
  };
  const view = render(<SkipRecoveryDialog {...props} />);
  try {
    view.rerender(<SkipRecoveryDialog {...props} isOpen />);
    view.rerender(
      <SkipRecoveryDialog
        {...props}
        isOpen
        step={2}
        pending
        replacement={{
          phase: 'saving',
          message: 'PRIVATE_RECOVERY_MESSAGE',
          recipeName: 'PRIVATE_RECOVERY_RECIPE',
        }}
      />
    );
    fireEvent.click(screen.getByTestId('recovery-close'));
    expect(props.onClose).not.toHaveBeenCalled();
    view.rerender(
      <SkipRecoveryDialog
        {...props}
        isOpen
        step={2}
        replacement={{
          phase: 'retry',
          message: 'PRIVATE_RECOVERY_MESSAGE',
          recipeName: 'PRIVATE_RECOVERY_RECIPE',
        }}
      />
    );

    fireEvent.click(screen.getByTestId('recovery-close'));
    expect(props.onClose).toHaveBeenCalledOnce();
    view.rerender(<SkipRecoveryDialog {...props} />);
    await Promise.resolve();
    view.rerender(<SkipRecoveryDialog {...props} isOpen />);
  } finally {
    view.unmount();
  }
});
