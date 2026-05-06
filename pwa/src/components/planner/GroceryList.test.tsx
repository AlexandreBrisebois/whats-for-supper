/**
 * Unit tests for GroceryList — section completion UI (task 7.5).
 *
 * Verifies:
 * - When all items in a section are checked, the header gets the sage green
 *   background class (bg-sage/20) and shows a CheckCircle2 icon.
 * - When not all items are checked, the header keeps the gradient background
 *   and shows the percentage badge.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Store mock ────────────────────────────────────────────────────────────────

let mockGroceryState: Record<string, boolean> = {};

vi.mock('@/store/plannerStore', () => ({
  usePlannerStore: () => ({
    groceryState: mockGroceryState,
    setGroceryItemToggle: vi.fn(),
    setGroceryState: vi.fn(),
  }),
}));

// ── API mock ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/schedule', () => ({
  useSchedule: () => ({
    updateGroceryState: vi.fn().mockResolvedValue({}),
  }),
}));

// ── aisleOrder mock — pin to a single section so tests are deterministic ──────

vi.mock('@/lib/grocery/aisleOrder', () => ({
  AISLE_ORDER: ['Produce', 'Pantry'],
}));

// ── aisleMapper mock — map everything to Produce for simplicity ───────────────

vi.mock('@/lib/grocery/aisleMapper', () => ({
  mapIngredientToSection: () => 'Produce',
}));

// ── Framer Motion mock ────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Locales mock ──────────────────────────────────────────────────────────────

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string) => fallback,
}));

// ── Import component AFTER mocks ──────────────────────────────────────────────

import { GroceryList } from './GroceryList';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ITEMS = ['tomato', 'lettuce'];

function renderList() {
  return render(<GroceryList weekOffset={0} ingredients={ITEMS} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGroceryState = {};
});

describe('GroceryList — section completion UI', () => {
  it('shows percentage badge when section is not complete', () => {
    // Only one of two items checked
    mockGroceryState = { tomato: true, lettuce: false };

    renderList();

    // Percentage badge should be present (50%)
    expect(screen.getByText('50%')).toBeTruthy();

    // No checkmark icon for section completion
    expect(screen.queryByTestId('section-complete-icon')).toBeNull();
  });

  it('shows percentage badge when no items are checked', () => {
    mockGroceryState = { tomato: false, lettuce: false };

    renderList();

    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.queryByTestId('section-complete-icon')).toBeNull();
  });

  it('shows checkmark icon when all items in a section are checked', () => {
    // All items checked
    mockGroceryState = { tomato: true, lettuce: true };

    renderList();

    // CheckCircle2 icon should appear
    expect(screen.getByTestId('section-complete-icon')).toBeTruthy();

    // Percentage badge should NOT be present
    expect(screen.queryByText('100%')).toBeNull();
  });

  it('applies sage green header background when section is complete', () => {
    mockGroceryState = { tomato: true, lettuce: true };

    renderList();

    const header = screen.getByTestId('aisle-header-complete');
    expect(header.className).toContain('bg-sage/20');
  });

  it('applies gradient header background when section is not complete', () => {
    mockGroceryState = { tomato: true, lettuce: false };

    renderList();

    const header = screen.getByTestId('aisle-header-incomplete');
    expect(header.className).toContain('bg-gradient-to-r');
  });

  it('does not show completion state when section has zero items', () => {
    // No ingredients → empty state, no section cards rendered
    mockGroceryState = {};

    render(<GroceryList weekOffset={0} ingredients={[]} />);

    expect(screen.queryByTestId('section-complete-icon')).toBeNull();
    expect(screen.queryByTestId('aisle-header-complete')).toBeNull();
  });
});
