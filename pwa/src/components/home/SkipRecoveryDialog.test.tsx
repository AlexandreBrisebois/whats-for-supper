import { observeOpening, presentationChanged } from '@/lib/telemetry/opening';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
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
function startPresentationStream() {
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/home', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
  return {
    observe,
    visibility,
    events: () => submit.mock.calls.map(([event]) => [event.eventName, event.screen]),
    raw: () => submit.mock.calls.map(([event]) => event),
    stop: () => {
      document.removeEventListener(presentationChanged, observe);
      visibility.mockRestore();
    },
  };
}

it('keeps one recovery identity across pending, step and feedback changes until dismissal', async () => {
  const stream = startPresentationStream();
  const props = {
    isOpen: false,
    step: 1 as const,
    onClose: vi.fn(),
    onBack: vi.fn(),
    onAction: vi.fn(),
  };
  const view = render(<SkipRecoveryDialog {...props} />);
  try {
    expect(stream.events()).toEqual([]);
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
    expect(stream.events()).toEqual([['pwa.surface.opened', 'planning.recovery']]);
    fireEvent.click(screen.getByTestId('recovery-close'));
    expect(props.onClose).toHaveBeenCalledOnce();
    view.rerender(<SkipRecoveryDialog {...props} />);
    await Promise.resolve();
    view.rerender(<SkipRecoveryDialog {...props} isOpen />);
    expect(stream.events()).toEqual([
      ['pwa.surface.opened', 'planning.recovery'],
      ['pwa.surface.closed', 'planning.recovery'],
      ['pwa.surface.opened', 'planning.recovery'],
    ]);
    expect(JSON.stringify(stream.raw())).not.toMatch(/PRIVATE_RECOVERY|saving|retry/);
  } finally {
    view.unmount();
    stream.stop();
  }
});
