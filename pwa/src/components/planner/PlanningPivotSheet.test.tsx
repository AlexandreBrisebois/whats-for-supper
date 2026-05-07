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

vi.mock('@/lib/auth', () => ({
  getVotingLink: vi.fn().mockResolvedValue('http://example.com/discovery'),
}));

import { PlanningPivotSheet } from './PlanningPivotSheet';

function renderSheet() {
  const onClose = vi.fn();
  const props = {
    isOpen: true,
    onClose,
    dayIndex: 2,
    onQuickFind: vi.fn(),
    onSearchLibrary: vi.fn(),
    onAskFamily: vi.fn(),
    onRemoveRecipe: vi.fn(),
    isVotingOpen: false,
    hasRecipe: true,
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

  it('hides nudge family until voting is open', () => {
    renderSheet();

    expect(screen.queryByTestId('pivot-nudge-family')).not.toBeInTheDocument();
  });

  it('shows nudge family after ask family when voting is open', () => {
    const onClose = vi.fn();

    render(
      <PlanningPivotSheet
        isOpen
        onClose={onClose}
        dayIndex={2}
        onQuickFind={vi.fn()}
        onSearchLibrary={vi.fn()}
        onAskFamily={vi.fn()}
        onRemoveRecipe={vi.fn()}
        isVotingOpen
        hasRecipe
      />
    );

    const askFamily = screen.getByTestId('pivot-ask-family');
    const nudgeFamily = screen.getByTestId('pivot-nudge-family');

    expect(askFamily).toBeInTheDocument();
    expect(nudgeFamily).toBeInTheDocument();
    expect(askFamily.compareDocumentPosition(nudgeFamily) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});