/**
 * Unit tests for EndCard
 * Requirements: 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks — must be declared before component import
// ---------------------------------------------------------------------------

// Capture drag handler so tests can invoke it directly
let capturedOnDragEnd: ((event: unknown, info: unknown) => void) | undefined;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      onDragEnd,
      // Strip framer-motion-specific props that React DOM doesn't understand
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      dragMomentum: _dragMomentum,
      whileTap: _whileTap,
      animate: _animate,
      drag: _drag,
      style: _style,
      ...props
    }: any) => {
      if (onDragEnd) capturedOnDragEnd = onDragEnd;
      return <div {...props}>{children}</div>;
    },
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => ({ get: () => 0 }),
  useAnimation: () => ({ start: vi.fn().mockResolvedValue(undefined) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
import { EndCard } from './EndCard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDragInfo(offsetX: number, velocityX = 0) {
  return {
    offset: { x: offsetX, y: 0 },
    velocity: { x: velocityX, y: 0 },
    point: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
  };
}

const defaultProps = {
  onSwipeRight: vi.fn(),
  onSwipeLeft: vi.fn(),
};

beforeEach(() => {
  capturedOnDragEnd = undefined;
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EndCard — rendering', () => {
  it('renders root element with data-testid="browse-all-end-card"', () => {
    render(<EndCard {...defaultProps} />);
    expect(screen.getByTestId('browse-all-end-card')).toBeTruthy();
  });

  it('displays the heading "What\'s for Supper?"', () => {
    render(<EndCard {...defaultProps} />);
    // The component uses HTML entity &apos; which renders as a real apostrophe
    expect(screen.getByText("What's for Supper?")).toBeTruthy();
  });

  it('displays the supporting message about browsing completion', () => {
    render(<EndCard {...defaultProps} />);
    expect(
      screen.getByText(/You've browsed your whole library\. Did you find what you were looking for\?/i)
    ).toBeTruthy();
  });

  it('displays the secondary message about capturing a recipe', () => {
    render(<EndCard {...defaultProps} />);
    expect(screen.getByText(/Have a recipe nearby you'd like to add\?/i)).toBeTruthy();
  });

  it('renders the CTA button with data-testid="end-card-capture-cta"', () => {
    render(<EndCard {...defaultProps} />);
    expect(screen.getByTestId('end-card-capture-cta')).toBeTruthy();
  });
});

describe('EndCard — CTA navigation', () => {
  it('navigates to /capture when CTA is clicked', () => {
    render(<EndCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('end-card-capture-cta'));
    expect(mockPush).toHaveBeenCalledWith('/capture');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});

describe('EndCard — swipe callbacks', () => {
  it('calls onSwipeRight when dragged right beyond 80px threshold', async () => {
    const onSwipeRight = vi.fn();
    render(<EndCard {...defaultProps} onSwipeRight={onSwipeRight} />);

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(100));

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeRight when velocity exceeds 500px/s threshold', async () => {
    const onSwipeRight = vi.fn();
    render(<EndCard {...defaultProps} onSwipeRight={onSwipeRight} />);

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(10, 600));

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeLeft when dragged left beyond 80px threshold', async () => {
    const onSwipeLeft = vi.fn();
    render(<EndCard {...defaultProps} onSwipeLeft={onSwipeLeft} />);

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(-100));

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeLeft when velocity exceeds -500px/s threshold', async () => {
    const onSwipeLeft = vi.fn();
    render(<EndCard {...defaultProps} onSwipeLeft={onSwipeLeft} />);

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(-10, -600));

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onSwipeRight or onSwipeLeft when drag is below threshold', async () => {
    const onSwipeRight = vi.fn();
    const onSwipeLeft = vi.fn();
    render(<EndCard onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} />);

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(30)); // below 80px threshold

    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
