import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReplacementFeedback } from '@/lib/planner/replacementSession';

const hook = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('@/lib/planner/useReplacementRecovery', () => ({
  useReplacementRecovery: () => hook.state,
}));
vi.mock('@/locales', () => ({
  getLocale: () => 'en',
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string, vars: Record<string, unknown>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => String(vars[key])),
}));
import { NonCookingReplacementConfirmation } from './NonCookingReplacementConfirmation';

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
const feedback = (phase: ReplacementFeedback['phase']): ReplacementFeedback => ({
  phase,
  message: `phase ${phase}`,
  recipeName: 'Chicken Soup',
});
function setup(overrides: Record<string, unknown> = {}) {
  hook.state = {
    pending: false,
    feedback: null,
    confirmAbandon: false,
    act: vi.fn(),
    retry: vi.fn(),
    close: vi.fn(),
    review: vi.fn(),
    cancelAbandon: vi.fn(),
    abandon: vi.fn(),
    ...overrides,
  };
  render(
    <NonCookingReplacementConfirmation
      slot={slot}
      recipe={recipe}
      onClose={vi.fn()}
      onSaved={vi.fn()}
      onReview={vi.fn()}
    />
  );
  return hook.state as Record<string, ReturnType<typeof vi.fn>>;
}
const actionIds = () =>
  within(screen.getByTestId('non-cooking-confirmation'))
    .getAllByRole('button')
    .map((button) => button.getAttribute('data-testid'));

beforeEach(() => {
  hook.state = {};
});

describe('NonCookingReplacementConfirmation', () => {
  it('uses Era 3 dialog chrome with one primary Replace action and Cancel', () => {
    const state = setup();
    const dialog = screen.getByTestId('non-cooking-confirmation');
    expect(dialog).toHaveClass('bg-cream', 'border-chrome-line');
    expect(screen.getByRole('heading', { name: 'Replace this supper plan?' })).toHaveClass(
      'font-heading'
    );
    expect(actionIds()).toEqual(['non-cooking-confirm', 'non-cooking-cancel']);
    expect(screen.getByTestId('non-cooking-confirm')).toHaveClass('min-h-12');
    fireEvent.click(screen.getByTestId('non-cooking-confirm'));
    expect(state.act).toHaveBeenCalledWith('drop');
    fireEvent.click(screen.getByTestId('non-cooking-cancel'));
    expect(state.close).toHaveBeenCalled();
  });

  it.each(['retry', 'unknown', 'disposition_unknown', 'refresh'] as const)(
    'offers only one primary retry action plus Cancel during transient %s recovery',
    (phase) => {
      setup({ feedback: feedback(phase) });
      expect(actionIds()).toEqual(['non-cooking-retry', 'non-cooking-cancel']);
      expect(screen.queryByRole('button', { name: 'Review plan' })).not.toBeInTheDocument();
      expect(screen.getByTestId('non-cooking-retry')).toHaveClass('min-h-12');
    }
  );

  it('offers Review plan as the one primary action only on a plan conflict', () => {
    const state = setup({ feedback: feedback('conflict') });
    expect(actionIds()).toEqual(['non-cooking-review', 'non-cooking-cancel']);
    fireEvent.click(screen.getByTestId('non-cooking-review'));
    expect(state.review).toHaveBeenCalled();
  });

  it('keeps in-flight phases to a disabled Cancel only', () => {
    setup({ feedback: feedback('saving'), pending: true });
    expect(actionIds()).toEqual(['non-cooking-cancel']);
    expect(screen.getByTestId('non-cooking-cancel')).toBeDisabled();
  });

  it('shows the post-commit abandon choice in a Hearth alert with shared buttons', () => {
    const state = setup({ confirmAbandon: true, feedback: feedback('retry') });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-terracotta-50', 'border-hearth-line');
    fireEvent.click(within(alert).getByRole('button', { name: 'Back' }));
    expect(state.cancelAbandon).toHaveBeenCalled();
    fireEvent.click(within(alert).getByRole('button', { name: 'Close' }));
    expect(state.abandon).toHaveBeenCalled();
  });
});
