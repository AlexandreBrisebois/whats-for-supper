/**
 * Unit tests for RecipeStackCard
 * Requirements: 3.1, 3.2, 3.4, 3.5, 10.3, 10.5, 10.6, 10.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks — must be declared before component import
// ---------------------------------------------------------------------------

// Capture drag handlers so tests can invoke them directly
let capturedOnDragEnd: ((event: unknown, info: unknown) => void) | undefined;
let capturedOnTap: (() => void) | undefined;
let capturedOnDrag: ((event: unknown, info: unknown) => void) | undefined;
let capturedOnDragStart: (() => void) | undefined;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      onDragEnd,
      onTap,
      onDrag,
      onDragStart,
      // Strip framer-motion-specific props that React DOM doesn't understand
      layout: _layout,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      dragMomentum: _dragMomentum,
      whileTap: _whileTap,
      animate: _animate,
      drag: _drag,
      style: _style,
      ...props
    }: any) => {
      // Capture the outermost motion.div handlers (the draggable card root)
      if (onDragEnd) capturedOnDragEnd = onDragEnd;
      if (onTap) capturedOnTap = onTap;
      if (onDrag) capturedOnDrag = onDrag;
      if (onDragStart) capturedOnDragStart = onDragStart;
      return <div {...props}>{children}</div>;
    },
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => ({ get: () => 0 }),
  useAnimation: () => ({ start: vi.fn().mockResolvedValue(undefined) }),
  useMotionValueEvent: vi.fn(),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
import { RecipeStackCard } from './RecipeStackCard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  id: 'recipe-123',
  name: 'Spaghetti Bolognese',
  description: 'A classic Italian pasta dish',
  imageUrl: '/images/spaghetti.jpg',
  totalTime: 'PT30M',
  category: 'Italian',
  isFront: true,
  stackIndex: 0,
  onSwipeRight: vi.fn(),
  onSwipeLeft: vi.fn(),
  onTap: vi.fn(),
};

function makeDragInfo(offsetX: number, velocityX = 0) {
  return {
    offset: { x: offsetX, y: 0 },
    velocity: { x: velocityX, y: 0 },
    point: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
  };
}

beforeEach(() => {
  capturedOnDragEnd = undefined;
  capturedOnTap = undefined;
  capturedOnDrag = undefined;
  capturedOnDragStart = undefined;
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RecipeStackCard — rendering', () => {
  it('renders the recipe name', () => {
    render(<RecipeStackCard {...defaultProps} />);
    expect(screen.getByText('Spaghetti Bolognese')).toBeTruthy();
  });

  it('renders the image with correct alt text', () => {
    render(<RecipeStackCard {...defaultProps} />);
    const img = screen.getByAltText('Spaghetti Bolognese');
    expect(img).toBeTruthy();
  });

  it('renders card root with data-testid="stack-card-{id}" when isFront is false', () => {
    render(<RecipeStackCard {...defaultProps} isFront={false} />);
    expect(screen.getByTestId('stack-card-recipe-123')).toBeTruthy();
  });

  it('renders data-testid="stack-card-front" when isFront is true', () => {
    render(<RecipeStackCard {...defaultProps} isFront={true} />);
    expect(screen.getByTestId('stack-card-front')).toBeTruthy();
  });

  it('does NOT render data-testid="stack-card-front" when isFront is false', () => {
    render(<RecipeStackCard {...defaultProps} isFront={false} />);
    expect(screen.queryByTestId('stack-card-front')).toBeNull();
  });

  it('renders formatted total time', () => {
    render(<RecipeStackCard {...defaultProps} totalTime="PT30M" />);
    expect(screen.getByText(/READY IN 30 MINS/i)).toBeTruthy();
  });
});

describe('RecipeStackCard — swipe indicators', () => {
  it('renders "Back" indicator for right swipes when isFront', () => {
    render(<RecipeStackCard {...defaultProps} isFront={true} />);
    expect(screen.getByTestId('stack-swipe-next-indicator')).toBeTruthy();
    expect(screen.getByTestId('stack-swipe-next-indicator').textContent?.toUpperCase()).toContain('BACK');
  });

  it('renders "Next" indicator for left swipes when isFront', () => {
    render(<RecipeStackCard {...defaultProps} isFront={true} />);
    expect(screen.getByTestId('stack-swipe-back-indicator')).toBeTruthy();
    expect(screen.getByTestId('stack-swipe-back-indicator').textContent?.toUpperCase()).toContain('NEXT');
  });

  it('does NOT render swipe indicators when isFront is false', () => {
    render(<RecipeStackCard {...defaultProps} isFront={false} />);
    expect(screen.queryByTestId('stack-swipe-next-indicator')).toBeNull();
    expect(screen.queryByTestId('stack-swipe-back-indicator')).toBeNull();
  });
});

describe('RecipeStackCard — swipe callbacks', () => {
  it('calls onSwipeRight when dragged right beyond 80px threshold', async () => {
    const onSwipeRight = vi.fn();
    render(<RecipeStackCard {...defaultProps} onSwipeRight={onSwipeRight} />);

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(100));

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeRight when velocity exceeds 500px/s threshold', async () => {
    const onSwipeRight = vi.fn();
    render(<RecipeStackCard {...defaultProps} onSwipeRight={onSwipeRight} />);

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(10, 600));

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeLeft when dragged left beyond 80px threshold', async () => {
    const onSwipeLeft = vi.fn();
    render(<RecipeStackCard {...defaultProps} onSwipeLeft={onSwipeLeft} />);

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(-100));

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeLeft when velocity exceeds -500px/s threshold', async () => {
    const onSwipeLeft = vi.fn();
    render(<RecipeStackCard {...defaultProps} onSwipeLeft={onSwipeLeft} />);

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(-10, -600));

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onSwipeRight or onSwipeLeft when drag is below threshold', async () => {
    const onSwipeRight = vi.fn();
    const onSwipeLeft = vi.fn();
    render(
      <RecipeStackCard {...defaultProps} onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} />
    );

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(30)); // below 80px threshold
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('does NOT call onSwipeLeft when drag is below threshold on left side', async () => {
    const onSwipeRight = vi.fn();
    const onSwipeLeft = vi.fn();
    render(
      <RecipeStackCard {...defaultProps} onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} />
    );

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(null, makeDragInfo(-30)); // below 80px threshold
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});

describe('RecipeStackCard — tap callback', () => {
  it('calls onTap when tapped without completing a swipe', () => {
    const onTap = vi.fn();
    render(<RecipeStackCard {...defaultProps} onTap={onTap} />);

    expect(capturedOnTap).toBeDefined();
    // Simulate a tap: no drag occurred
    capturedOnTap!();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onTap when isFront is false', () => {
    const onTap = vi.fn();
    render(<RecipeStackCard {...defaultProps} isFront={false} onTap={onTap} />);

    // When isFront is false, the onTap handler should guard against calling onTap
    if (capturedOnTap) {
      capturedOnTap();
    }
    expect(onTap).not.toHaveBeenCalled();
  });
});

describe('RecipeStackCard — no voting indicators', () => {
  it('does NOT render "LOVE" text', () => {
    render(<RecipeStackCard {...defaultProps} />);
    expect(screen.queryByText('LOVE')).toBeNull();
  });

  it('does NOT render "PASS" text', () => {
    render(<RecipeStackCard {...defaultProps} />);
    expect(screen.queryByText('PASS')).toBeNull();
  });

  it('does NOT render "MATCH!" text', () => {
    render(<RecipeStackCard {...defaultProps} />);
    expect(screen.queryByText('MATCH!')).toBeNull();
  });

  it('does NOT render hasFamilyInterest ring (no ring-sage class)', () => {
    render(<RecipeStackCard {...defaultProps} isFront={false} />);
    // The component has no hasFamilyInterest prop — verify no ring-sage class exists
    const container = screen.getByTestId('stack-card-recipe-123');
    expect(container.innerHTML).not.toContain('ring-sage');
  });
});
