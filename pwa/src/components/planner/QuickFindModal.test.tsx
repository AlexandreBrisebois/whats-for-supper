/**
 * Unit tests for QuickFindModal — fillTheGapVersion wiring (BS-7).
 *
 * Strategy: mock useDiscoveryStore so we can control fillTheGapVersion,
 * mock getFillTheGap so we can assert call counts, and render the modal
 * to verify the refetch behaviour.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, fireEvent, waitFor, screen } from '@testing-library/react';
import React from 'react';

// ── Store mock ────────────────────────────────────────────────────────────────

let mockFillTheGapVersion = 0;
let mockFillTheGapVersions: Record<number, number> = {};

vi.mock('@/store/discoveryStore', () => ({
  useDiscoveryStore: (
    selector: (s: {
      fillTheGapVersion: number;
      fillTheGapVersions: Record<number, number>;
    }) => unknown
  ) =>
    selector({
      fillTheGapVersion: mockFillTheGapVersion,
      fillTheGapVersions: mockFillTheGapVersions,
    }),
}));

// ── API mock ──────────────────────────────────────────────────────────────────

const mockGetFillTheGap = vi
  .fn()
  .mockResolvedValue([{ id: 'r1', name: 'Pasta', image: '', description: '', totalTime: 'PT20M' }]);

vi.mock('@/lib/api/planner', () => ({
  getFillTheGap: (...args: unknown[]) => mockGetFillTheGap(...args),
}));

// ── Dependency mocks ──────────────────────────────────────────────────────────

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (src: string) => src,
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      // Strip framer-motion props
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/SolarLoader', () => ({
  SolarLoader: () => <div data-testid="solar-loader" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

// ── Import component AFTER mocks ──────────────────────────────────────────────

import { QuickFindModal } from './QuickFindModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderModal() {
  const onClose = vi.fn();
  const onSelect = vi.fn();
  const utils = render(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
  return { ...utils, onClose, onSelect };
}

function suggestions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `550e8400-e29b-41d4-a716-4466554400${String(index + 1).padStart(2, '0')}`,
    name: `Recipe ${index + 1}`,
    image: '',
    description: '',
    totalTime: 'PT20M',
  }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockFillTheGapVersion = 0;
  mockFillTheGapVersions = {};
  mockGetFillTheGap.mockClear();
  mockGetFillTheGap.mockResolvedValue([
    { id: 'r1', name: 'Pasta', image: '', description: '', totalTime: 'PT20M' },
  ]);
});

describe('QuickFindModal — initial fetch', () => {
  it('calls getFillTheGap once on mount', async () => {
    renderModal();

    await waitFor(() => {
      expect(mockGetFillTheGap).toHaveBeenCalledTimes(1);
    });
    expect(mockGetFillTheGap).toHaveBeenCalledWith(0);
  });

  it('renders standardized time display', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText(/READY IN 20 MINS/i)).toBeTruthy();
    });
  });

  it('disables Skip when the API returns only one suggestion', async () => {
    renderModal();

    await screen.findByText('Pasta');

    const nextButton = screen.getByTestId('quick-find-next');
    expect(nextButton).toBeDisabled();
    expect(nextButton).toHaveTextContent('No more picks');
  });

  it('advances to the second suggestion when the API returns two suggestions', async () => {
    mockGetFillTheGap.mockResolvedValue([
      { id: 'r1', name: 'Pasta', image: '', description: '', totalTime: 'PT20M' },
      { id: 'r2', name: 'Risotto', image: '', description: '', totalTime: 'PT30M' },
    ]);
    renderModal();

    await screen.findByText('Pasta');
    const nextButton = screen.getByTestId('quick-find-next');
    expect(nextButton).toBeEnabled();

    fireEvent.click(nextButton);

    expect(await screen.findByText('Risotto')).toBeInTheDocument();
  });

  it('shows both returned suggestions before the terminal Search Library card', async () => {
    mockGetFillTheGap.mockResolvedValue(suggestions(2));
    renderModal();

    await screen.findByText('Recipe 1');
    fireEvent.click(screen.getByTestId('quick-find-next'));
    expect(await screen.findByText('Recipe 2')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('quick-find-next'));
    expect(await screen.findByText("Didn't find a match?")).toBeInTheDocument();
    expect(screen.getByTestId('quick-find-search-library')).toHaveAttribute('href', '/recipes');
  });

  it('renders one progress indicator for each of four suggestions and the terminal card', async () => {
    mockGetFillTheGap.mockResolvedValue(suggestions(4));
    renderModal();

    await screen.findByText('Recipe 1');
    expect(screen.getAllByTestId('quick-find-progress-indicator')).toHaveLength(5);
  });

  it('selects the fifth suggestion before navigating to the terminal Search Library card', async () => {
    mockGetFillTheGap.mockResolvedValue(suggestions(5));
    const { onSelect } = renderModal();

    await screen.findByText('Recipe 1');
    const nextButton = screen.getByTestId('quick-find-next');
    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(nextButton);
    }

    expect(await screen.findByText('Recipe 5')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('quick-find-select'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Recipe 5',
      })
    );

    fireEvent.click(nextButton);
    expect(await screen.findByText("Didn't find a match?")).toBeInTheDocument();
    expect(screen.getByTestId('quick-find-search-library')).toBeInTheDocument();
  });
});

describe('QuickFindModal — fillTheGapVersion wiring (BS-7)', () => {
  it('calls fetchSuggestions again when fillTheGapVersion increments', async () => {
    const { rerender, onClose, onSelect } = renderModal();

    // Wait for initial fetch to complete so initialFetchDone.current = true
    await waitFor(() => {
      expect(mockGetFillTheGap).toHaveBeenCalledTimes(1);
    });

    // Simulate SSE fill_the_gap_invalidated — increment the version
    mockFillTheGapVersion = 1;
    mockFillTheGapVersions = { 0: 1 };

    await act(async () => {
      rerender(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
    });

    await waitFor(() => {
      expect(mockGetFillTheGap).toHaveBeenCalledTimes(2);
    });
  });

  it('does NOT call fetchSuggestions a second time on initial render (version 0)', async () => {
    renderModal();

    await waitFor(() => {
      expect(mockGetFillTheGap).toHaveBeenCalledTimes(1);
    });

    // No additional calls — version 0 is the initial value, not an invalidation signal
    expect(mockGetFillTheGap).toHaveBeenCalledTimes(1);
  });

  it('calls fetchSuggestions on each subsequent version increment', async () => {
    const { rerender, onClose, onSelect } = renderModal();

    await waitFor(() => {
      expect(mockGetFillTheGap).toHaveBeenCalledTimes(1);
    });

    // First invalidation
    mockFillTheGapVersion = 1;
    mockFillTheGapVersions = { 0: 1 };
    await act(async () => {
      rerender(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
    });
    await waitFor(() => expect(mockGetFillTheGap).toHaveBeenCalledTimes(2));

    // Second invalidation
    mockFillTheGapVersion = 2;
    mockFillTheGapVersions = { 0: 2 };
    await act(async () => {
      rerender(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
    });
    await waitFor(() => expect(mockGetFillTheGap).toHaveBeenCalledTimes(3));
  });

  it('normalizes a later card to the terminal card when a refresh shrinks the list', async () => {
    mockGetFillTheGap.mockResolvedValueOnce(suggestions(4)).mockResolvedValueOnce(suggestions(1));
    const { rerender, onClose, onSelect } = renderModal();

    await screen.findByText('Recipe 1');
    const nextButton = screen.getByTestId('quick-find-next');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    expect(await screen.findByText('Recipe 4')).toBeInTheDocument();

    mockFillTheGapVersion = 1;
    mockFillTheGapVersions = { 0: 1 };
    await act(async () => {
      rerender(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
    });

    expect(await screen.findByText("Didn't find a match?")).toBeInTheDocument();
    expect(screen.getByTestId('quick-find-select')).toBeDisabled();
  });

  it('keeps the newest invalidated response when older requests resolve afterward', async () => {
    const initial = deferred<ReturnType<typeof suggestions>>();
    const olderRefresh = deferred<ReturnType<typeof suggestions>>();
    const newestRefresh = deferred<ReturnType<typeof suggestions>>();
    mockGetFillTheGap.mockImplementationOnce(() => initial.promise);
    mockGetFillTheGap.mockImplementationOnce(() => olderRefresh.promise);
    mockGetFillTheGap.mockImplementationOnce(() => newestRefresh.promise);
    const { rerender, onClose, onSelect } = renderModal();

    await act(async () => initial.resolve(suggestions(1)));
    await screen.findByText('Recipe 1');

    mockFillTheGapVersion = 1;
    mockFillTheGapVersions = { 0: 1 };
    await act(async () => {
      rerender(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
    });
    await waitFor(() => expect(mockGetFillTheGap).toHaveBeenCalledTimes(2));

    mockFillTheGapVersion = 2;
    mockFillTheGapVersions = { 0: 2 };
    await act(async () => {
      rerender(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
    });
    await waitFor(() => expect(mockGetFillTheGap).toHaveBeenCalledTimes(3));

    await act(async () => newestRefresh.resolve([{ ...suggestions(1)[0], name: 'Newest' }]));
    expect(await screen.findByText('Newest')).toBeInTheDocument();

    await act(async () => olderRefresh.resolve([{ ...suggestions(1)[0], name: 'Stale' }]));
    await waitFor(() => expect(screen.queryByText('Stale')).not.toBeInTheDocument());
    expect(screen.getByText('Newest')).toBeInTheDocument();
  });

  it('does not refetch a week 0 modal for an invalidation in another week', async () => {
    const { rerender, onClose, onSelect } = renderModal();
    await screen.findByText('Pasta');

    mockFillTheGapVersion = 1;
    mockFillTheGapVersions = { 1: 1 };
    await act(async () => {
      rerender(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
    });

    expect(mockGetFillTheGap).toHaveBeenCalledTimes(1);

    mockFillTheGapVersion = 2;
    mockFillTheGapVersions = { 0: 1, 1: 1 };
    await act(async () => {
      rerender(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
    });

    await waitFor(() => expect(mockGetFillTheGap).toHaveBeenCalledTimes(2));
  });
});
