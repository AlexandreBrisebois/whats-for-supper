import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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

const mockClipboardWriteText = vi.fn().mockResolvedValue(undefined);
const mockShare = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  mockClipboardWriteText.mockClear();
  mockShare.mockClear();

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: mockClipboardWriteText },
  });

  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: mockShare,
  });
});

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
    expect(screen.getByTestId('pivot-ask-family')).toBeInTheDocument();
  });

  it('shows nudge family and hides ask family when voting is open', () => {
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

    const nudgeFamily = screen.getByTestId('pivot-nudge-family');

    expect(screen.queryByTestId('pivot-ask-family')).not.toBeInTheDocument();
    expect(nudgeFamily).toBeInTheDocument();
  });

  it('opens a nudge dialog with copy and share actions instead of sharing immediately', async () => {
    render(
      <PlanningPivotSheet
        isOpen
        onClose={vi.fn()}
        dayIndex={2}
        onQuickFind={vi.fn()}
        onSearchLibrary={vi.fn()}
        onAskFamily={vi.fn()}
        onRemoveRecipe={vi.fn()}
        isVotingOpen
        hasRecipe
      />
    );

    fireEvent.click(screen.getByTestId('pivot-nudge-family'));

    expect(screen.getByTestId('pivot-nudge-dialog')).toBeInTheDocument();
    await screen.findByText('http://example.com/discovery');
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('copies the voting link from the nudge dialog', async () => {
    render(
      <PlanningPivotSheet
        isOpen
        onClose={vi.fn()}
        dayIndex={2}
        onQuickFind={vi.fn()}
        onSearchLibrary={vi.fn()}
        onAskFamily={vi.fn()}
        onRemoveRecipe={vi.fn()}
        isVotingOpen
        hasRecipe
      />
    );

    fireEvent.click(screen.getByTestId('pivot-nudge-family'));
    await screen.findByText('http://example.com/discovery');
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith('http://example.com/discovery');
    });
  });
});
