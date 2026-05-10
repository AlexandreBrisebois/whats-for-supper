import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

import { PlanningPivotSheet } from './PlanningPivotSheet';

function renderSheet({ hasRecipe = true }: { hasRecipe?: boolean } = {}) {
  const onClose = vi.fn();
  const props = {
    isOpen: true,
    onClose,
    dayIndex: 2,
    onQuickFind: vi.fn(),
    onSearchLibrary: vi.fn(),
    onRemoveRecipe: vi.fn(),
    hasRecipe,
  };

  render(<PlanningPivotSheet {...props} />);
  return { onClose, props };
}

describe('PlanningPivotSheet', () => {
  it('renders an explicit close button', () => {
    renderSheet();

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is pressed', () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is pressed', () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByTestId('pivot-sheet-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders slot actions without whole-week voting controls', () => {
    renderSheet();

    expect(screen.getByTestId('pivot-quick-find')).toBeInTheDocument();
    expect(screen.getByTestId('pivot-search-library')).toBeInTheDocument();
    expect(screen.getByTestId('pivot-remove-recipe')).toBeInTheDocument();
    expect(screen.queryByTestId('pivot-ask-family')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pivot-nudge-family')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pivot-nudge-dialog')).not.toBeInTheDocument();
  });

  it('hides remove recipe when the selected slot has no recipe', () => {
    renderSheet({ hasRecipe: false });

    expect(screen.queryByTestId('pivot-remove-recipe')).not.toBeInTheDocument();
  });
});
