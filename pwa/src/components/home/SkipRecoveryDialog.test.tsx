vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/locales', () => ({
  getLocale: () => 'en',
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce(
      (acc, [name, val]) => acc.replaceAll(`{{${name}}}`, String(val)),
      fallback
    ),
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
  it('fires the expected step 1 actions including Eating out and inline Made plans validation', () => {
    const onAction = vi.fn();
    const onCustomPlan = vi.fn();

    render(
      <SkipRecoveryDialog
        isOpen
        step={1}
        onClose={vi.fn()}
        onBack={vi.fn()}
        onAction={onAction}
        onCustomPlan={onCustomPlan}
      />
    );

    expect(
      screen.getByTestId('recovery-action-order-in').querySelector('.lucide-shopping-bag')
    ).not.toBeNull();
    fireEvent.click(screen.getByTestId('recovery-action-order-in'));
    fireEvent.click(screen.getByTestId('recovery-action-eating-out'));
    fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
    fireEvent.click(screen.getByTestId('recovery-action-search'));

    expect(onAction).toHaveBeenNthCalledWith(1, 'order_in');
    expect(onAction).toHaveBeenNthCalledWith(2, 'eating_out');
    expect(onAction).toHaveBeenNthCalledWith(3, 'pick_else');
    expect(onAction).toHaveBeenNthCalledWith(4, 'search');
    expect(screen.getByTestId('recovery-action-pick-else')).toHaveAccessibleName(/Suggestions/);
    expect(screen.getByTestId('recovery-action-search')).toHaveAccessibleName(/Search/);

    // Made plans expands inline without an extra menu and enforces 1-80 char validation
    const madePlansBtn = screen.getByTestId('recovery-action-made-plans');
    expect(madePlansBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(madePlansBtn);
    expect(madePlansBtn).toHaveAttribute('aria-pressed', 'true');
    const input = screen.getByTestId('recovery-custom-plan-input');
    const nextBtn = screen.getByTestId('recovery-custom-plan-next');

    // Blank submission focuses input and shows alert
    fireEvent.click(nextBtn);
    expect(screen.getByRole('alert')).toHaveTextContent(/1–80/);
    expect(input).toHaveFocus();
    expect(onCustomPlan).not.toHaveBeenCalled();

    // Over-limit submission (>80 chars) rejected
    fireEvent.change(input, { target: { value: 'a'.repeat(81) } });
    fireEvent.click(nextBtn);
    expect(screen.getByRole('alert')).toHaveTextContent(/1–80/);
    expect(onCustomPlan).not.toHaveBeenCalled();

    // Valid trimmed submission advances
    fireEvent.change(input, { target: { value: "  Supper at Grandma's  " } });
    fireEvent.click(nextBtn);
    expect(onCustomPlan).toHaveBeenCalledWith("Supper at Grandma's");
  });

  it('retains the Made plans draft when navigating Back from Step 2 to Step 1', () => {
    const onCustomPlan = vi.fn();
    const { rerender } = render(
      <SkipRecoveryDialog
        isOpen
        step={1}
        onClose={vi.fn()}
        onBack={vi.fn()}
        onAction={vi.fn()}
        onCustomPlan={onCustomPlan}
      />
    );
    fireEvent.click(screen.getByTestId('recovery-action-made-plans'));
    fireEvent.change(screen.getByTestId('recovery-custom-plan-input'), {
      target: { value: "Supper at Grandma's" },
    });
    fireEvent.click(screen.getByTestId('recovery-custom-plan-next'));
    rerender(
      <SkipRecoveryDialog
        isOpen
        step={2}
        onClose={vi.fn()}
        onBack={vi.fn()}
        onAction={vi.fn()}
        onCustomPlan={onCustomPlan}
      />
    );
    rerender(
      <SkipRecoveryDialog
        isOpen
        step={1}
        onClose={vi.fn()}
        onBack={vi.fn()}
        onAction={vi.fn()}
        onCustomPlan={onCustomPlan}
      />
    );
    expect(screen.getByTestId('recovery-action-made-plans')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('recovery-custom-plan-input')).toHaveValue("Supper at Grandma's");
  });

  it('fires the expected step 2 actions and supports backing out from top-right Back', () => {
    const onAction = vi.fn();
    const onBack = vi.fn();

    render(
      <SkipRecoveryDialog isOpen step={2} onClose={vi.fn()} onBack={onBack} onAction={onAction} />
    );

    fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
    fireEvent.click(screen.getByTestId('recovery-go-back'));

    expect(onAction).toHaveBeenCalledWith('tomorrow');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses >= 12px sentence-case Family Cookbook typography, 48px header controls, and non-clickable terracotta-bar meal context', () => {
    const { rerender } = render(
      <SkipRecoveryDialog isOpen step={1} onClose={vi.fn()} onBack={vi.fn()} onAction={vi.fn()} />
    );
    const title = screen.getByTestId('recovery-dialog-title');
    expect(title).not.toHaveClass('text-[10px]', 'uppercase');
    expect(screen.getByTestId('recovery-close')).toHaveClass('h-12', 'w-12');

    rerender(
      <SkipRecoveryDialog
        isOpen
        step={2}
        source={{
          weekOffset: 0,
          dayIndex: 2,
          date: '2026-09-23',
          referenceWeekStartDate: '2026-09-21',
          recipe: { id: 'r1', name: 'Grilled Cilantro Lime Chicken', image: '' },
        }}
        backupIntent={{
          kind: 'non_cooking',
          nonCooking: { kind: 'custom', customLabel: "Supper at Grandma's" },
        }}
        onClose={vi.fn()}
        onBack={vi.fn()}
        onAction={vi.fn()}
      />
    );
    const mealContext = screen.getByTestId('recovery-meal-context');
    expect(mealContext.tagName).not.toBe('BUTTON');
    expect(mealContext).not.toHaveClass('bg-white');
    expect(mealContext).toHaveTextContent('Wednesday, September 23');
    expect(mealContext).toHaveTextContent('Grilled Cilantro Lime Chicken');
    expect(screen.getByText(/Supper at Grandma's/)).toBeInTheDocument();
    expect(screen.queryByText(/before saving your new recipe/i)).not.toBeInTheDocument();

    const tomorrowBtn = screen.getByTestId('recovery-action-tomorrow');
    expect(tomorrowBtn).toHaveTextContent('Move to Thu, Sep 24');
    expect(tomorrowBtn).toHaveClass('bg-terracotta-50', 'border-hearth-line');
    expect(tomorrowBtn.querySelector('.lucide-calendar')).toBeNull();
    expect(
      screen.getByTestId('recovery-action-next-week').querySelectorAll('.lucide-refresh-cw')
    ).toHaveLength(1);
    expect(screen.getByTestId('recovery-action-drop')).toHaveTextContent('Remove from Wed, Sep 23');

    const consequence = screen.getByText('Keeps the recipe in your library');
    expect(consequence).toHaveClass('text-xs', 'text-ink-muted');
    expect(consequence).not.toHaveClass('text-[10px]', 'uppercase', 'text-charcoal/30');
    const goBack = screen.getByTestId('recovery-go-back');
    expect(goBack).toHaveClass('min-h-12', 'text-sm', 'text-hearth-ink');
  });

  it('places Back beside Close in the header when canGoBack is true and omits it when canGoBack is false', () => {
    const onBack = vi.fn();
    const { rerender } = render(
      <SkipRecoveryDialog
        isOpen
        step={2}
        canGoBack
        onClose={vi.fn()}
        onBack={onBack}
        onAction={vi.fn()}
      />
    );
    const goBack = screen.getByTestId('recovery-go-back');
    expect(goBack.querySelector('.lucide-arrow-left')).not.toBeNull();
    expect(goBack.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(goBack).toHaveClass('focus-visible:outline-2');
    const tomorrow = screen.getByTestId('recovery-action-tomorrow');
    expect(
      goBack.compareDocumentPosition(tomorrow) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    fireEvent.click(goBack);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('recovery-close')).toBeInTheDocument();

    rerender(
      <SkipRecoveryDialog
        isOpen
        step={2}
        canGoBack={false}
        onClose={vi.fn()}
        onBack={onBack}
        onAction={vi.fn()}
      />
    );
    expect(screen.queryByTestId('recovery-go-back')).not.toBeInTheDocument();
    expect(screen.getByTestId('recovery-close')).toBeInTheDocument();
  });

  it('disables Back while a disposition is pending', () => {
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
    const goBack = screen.getByTestId('recovery-go-back');
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

it('shows dated unsaved pre-commit conflict details, Not saved yet label, and meal-preserving actions', () => {
  const onChooseAnotherDay = vi.fn();
  const onReviewPlan = vi.fn();

  render(
    <SkipRecoveryDialog
      isOpen
      step={2}
      source={{
        weekOffset: 0,
        dayIndex: 3,
        date: '2026-11-26',
        referenceWeekStartDate: '2026-11-23',
        recipe: { id: 'orig', name: 'Tacos', image: '' },
      }}
      replacement={{
        phase: 'conflict',
        message: 'Your plan changed. Review it before replacing this meal.',
        recipeName: 'Pasta',
      }}
      onChooseAnotherDay={onChooseAnotherDay}
      onReviewPlan={onReviewPlan}
      onClose={vi.fn()}
      onBack={vi.fn()}
      onAction={vi.fn()}
    />
  );

  expect(screen.getByTestId('replacement-feedback')).toHaveTextContent(
    'Your plan on Thu, Nov 26 changed before anything was saved.'
  );
  expect(screen.getByText('Not saved yet')).toBeInTheDocument();
  expect(screen.queryByText('Your new meal')).not.toBeInTheDocument();
  expect(screen.getByText('Pasta')).toBeInTheDocument();

  const chooseBtn = screen.getByTestId('recovery-choose-another-day');
  const reviewBtn = screen.getByTestId('recovery-review-plan');
  expect(chooseBtn).toHaveTextContent('Choose a day for this meal');
  expect(reviewBtn).toHaveTextContent('Open Thu, Nov 26 in Planner');

  fireEvent.click(chooseBtn);
  fireEvent.click(reviewBtn);
  expect(onChooseAnotherDay).toHaveBeenCalledOnce();
  expect(onReviewPlan).toHaveBeenCalledOnce();
});

it('keeps original disposition details and hides Choose a day for post-disposition conflicts', () => {
  render(
    <SkipRecoveryDialog
      isOpen
      step={2}
      source={{
        weekOffset: 0,
        dayIndex: 3,
        date: '2026-11-26',
        referenceWeekStartDate: '2026-11-23',
        recipe: { id: 'orig', name: 'Tacos', image: '' },
      }}
      replacement={{
        phase: 'conflict',
        message: 'Your plan changed. Review it before replacing this meal.',
        recipeName: 'Pasta',
        original: {
          action: 'drop',
          recipeName: 'Tacos',
          sourceDate: '2026-11-26',
        },
      }}
      onChooseAnotherDay={vi.fn()}
      onReviewPlan={vi.fn()}
      onClose={vi.fn()}
      onBack={vi.fn()}
      onAction={vi.fn()}
    />
  );

  expect(screen.getByTestId('replacement-feedback')).toHaveTextContent(
    'Your plan changed. Review it before replacing this meal.'
  );
  expect(screen.getByText(/Tacos was removed from Thursday, November 26/i)).toBeInTheDocument();
  expect(screen.queryByTestId('recovery-choose-another-day')).not.toBeInTheDocument();
  expect(screen.getByTestId('recovery-review-plan')).toHaveTextContent(
    'Open Thu, Nov 26 in Planner'
  );
});
