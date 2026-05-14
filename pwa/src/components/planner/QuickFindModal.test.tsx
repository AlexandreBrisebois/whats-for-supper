/**
 * Unit tests for QuickFindModal — fillTheGapVersion wiring (BS-7).
 *
 * Strategy: mock useDiscoveryStore so we can control fillTheGapVersion,
 * mock getFillTheGap so we can assert call counts, and render the modal
 * to verify the refetch behaviour.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor, screen } from '@testing-library/react';
import React from 'react';

// ── Store mock ────────────────────────────────────────────────────────────────

let mockFillTheGapVersion = 0;

vi.mock('@/store/discoveryStore', () => ({
  useDiscoveryStore: (selector: (s: { fillTheGapVersion: number }) => unknown) =>
    selector({ fillTheGapVersion: mockFillTheGapVersion }),
}));

// ── API mock ──────────────────────────────────────────────────────────────────

const mockGetFillTheGap = vi
  .fn()
  .mockResolvedValue([{ id: 'r1', name: 'Pasta', image: '', description: '', time: 'PT20M' }]);

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

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockFillTheGapVersion = 0;
  mockGetFillTheGap.mockClear();
  mockGetFillTheGap.mockResolvedValue([
    { id: 'r1', name: 'Pasta', image: '', description: '', time: 'PT20M' },
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
    await act(async () => {
      rerender(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
    });
    await waitFor(() => expect(mockGetFillTheGap).toHaveBeenCalledTimes(2));

    // Second invalidation
    mockFillTheGapVersion = 2;
    await act(async () => {
      rerender(<QuickFindModal onClose={onClose} onSelect={onSelect} weekOffset={0} />);
    });
    await waitFor(() => expect(mockGetFillTheGap).toHaveBeenCalledTimes(3));
  });
});
