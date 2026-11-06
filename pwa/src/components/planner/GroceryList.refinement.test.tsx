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
import { render, screen, fireEvent } from '@testing-library/react';

const {
  mockReadSchedule,
  mockGetSourceRecipe,
  mockRefreshServings,
  mockToggleGroceryItem,
  mockCreateExtra,
  mockSuggestExtras,
  mockUpdateExtra,
  mockDeleteExtra,
  mockAddToast,
} = vi.hoisted(() => ({
  mockReadSchedule: vi.fn(),
  mockGetSourceRecipe: vi.fn(),
  mockRefreshServings: vi.fn(),
  mockToggleGroceryItem: vi.fn(),
  mockCreateExtra: vi.fn(),
  mockSuggestExtras: vi.fn(),
  mockUpdateExtra: vi.fn(),
  mockDeleteExtra: vi.fn(),
  mockAddToast: vi.fn(),
}));

vi.mock('@/lib/api/planner', () => ({ getSchedule: mockReadSchedule }));
vi.mock('@/lib/api/recipes', () => ({ getRecipe: mockGetSourceRecipe }));

// ── Store mock ────────────────────────────────────────────────────────────────

let mockGroceryState: Record<string, boolean> = {};
const mockSetGroceryItemToggle = vi.fn((ingredientName: string, isToggled: boolean) => {
  mockGroceryState = { ...mockGroceryState, [ingredientName]: isToggled };
});

vi.mock('@/store/plannerStore', () => ({
  usePlannerStore: Object.assign(
    () => ({
      groceryState: mockGroceryState,
      setGroceryItemToggle: mockSetGroceryItemToggle,
      setGroceryState: vi.fn(),
    }),
    {
      getState: () => ({
        groceryState: mockGroceryState,
        setGroceryState: (value: Record<string, boolean>) => {
          mockGroceryState = value;
        },
      }),
    }
  ),
}));

// ── API mock ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/supper-servings', () => ({ refreshSupperGroceries: mockRefreshServings }));

vi.mock('@/lib/api/schedule', () => ({
  useSchedule: () => ({
    toggleGroceryItem: mockToggleGroceryItem,
    updateGroceryState: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('@/lib/api/ingredients', () => ({
  reclassifyIngredient: vi.fn(),
}));

vi.mock('@/lib/api/grocery-extras', () => ({
  createGroceryExtra: mockCreateExtra,
  suggestGroceryExtraNames: mockSuggestExtras,
  updateGroceryExtra: mockUpdateExtra,
  deleteGroceryExtra: mockDeleteExtra,
}));

vi.mock('@/store/uiStore', () => ({
  useUiStore: (selector: (state: { addToast: typeof mockAddToast }) => unknown) =>
    selector({ addToast: mockAddToast }),
}));

// ── aisleOrder mock — pin to a single section so tests are deterministic ──────

vi.mock('@/lib/grocery/aisleOrder', () => ({
  AISLE_ORDER: ['Produce', 'Pantry'],
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
  tWithVars: (_key: string, fallback: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce(
      (result, [name, value]) => result.replace(`{{${name}}}`, String(value)),
      fallback
    ),
}));

// ── Import component AFTER mocks ──────────────────────────────────────────────

import { GroceryList } from './GroceryList';
import type { GroceryLineItemDto } from '@/lib/api/generated/models';
import { reclassifyIngredient } from '@/lib/api/ingredients';
import { useWeekStore } from '@/store/weekStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeItem(
  displayName: string,
  section: string,
  normalizedKey?: string,
  overrides?: Partial<GroceryLineItemDto>
): GroceryLineItemDto {
  return {
    displayName,
    normalizedKey: normalizedKey ?? displayName.toLowerCase().replace(/\s+/g, '_'),
    section,
    quantity: null,
    unitText: null,
    recipeIds: [],
    additionalData: {},
    ...overrides,
  };
}

const id = '660e8400-e29b-41d4-a716-446655440013';
const item = makeItem('pasta', 'Pantry', 'pasta', {
  quantity: 400,
  unitText: 'g',
  quantityComplete: false,
  checkReviewReason: 'prior_amount_unknown',
  recipeIds: [id, id],
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGroceryState = {};
  mockGetSourceRecipe.mockResolvedValue({ id, name: 'Family pasta' });
  mockToggleGroceryItem.mockResolvedValue(undefined);
  useWeekStore.setState({
    weekOffset: 0,
    weekStartDate: '2026-10-12',
    groceryItems: [item],
    schedule: [{ _uiId: 'source-date', date: '2026-10-14', recipe: { id, name: 'Family pasta' } }],
    groceryRefresh: undefined,
    groceryExtras: [],
    pendingGroceryExtraIds: new Set(),
  });
});

describe('quiet grocery source refinement', () => {
  it('reveals Used in and deduplicated real titles only while the book is expanded', () => {
    render(<GroceryList weekOffset={0} items={[item]} />);
    const book = screen.getByTestId('grocery-recipe-sources-toggle');
    expect(book).toHaveAccessibleName('Source recipes for pasta');
    expect(book).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Used in')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Family pasta' })).not.toBeInTheDocument();
    fireEvent.click(book);
    expect(book).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Used in')).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Family pasta' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Family pasta' })).toHaveAttribute(
      'href',
      expect.stringContaining('reviewAmounts=true')
    );
    fireEvent.click(book);
    expect(screen.queryByText('Used in')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Family pasta' })).not.toBeInTheDocument();
    expect(mockToggleGroceryItem).not.toHaveBeenCalled();
    expect(reclassifyIngredient).not.toHaveBeenCalled();
  });

  it('keeps subtotal and prior-check warnings separate from sources, check and aisle actions', () => {
    render(<GroceryList weekOffset={0} items={[item]} />);
    const book = screen.getByTestId('grocery-recipe-sources-toggle');
    const warnings = screen.getByTestId('grocery-amount-review');
    expect(warnings).toHaveTextContent('400 g known');
    expect(warnings).toHaveTextContent('Review amounts');
    expect(warnings).toHaveTextContent('Previously checked amount needs review.');
    expect(screen.getByTestId('grocery-item-checkbox')).toBeVisible();
    expect(screen.getByTestId('reclassify-btn')).toHaveAccessibleName('Change section for pasta');
    fireEvent.click(book);
    const sources = screen.getByTestId('grocery-recipe-sources-region');
    expect(sources).not.toContainElement(warnings);
    fireEvent.click(book);
    expect(warnings).toBeVisible();
    expect(mockToggleGroceryItem).not.toHaveBeenCalled();
    expect(reclassifyIngredient).not.toHaveBeenCalled();
  });

  it('does not invent a source disclosure for rows without recipe contributors', () => {
    render(<GroceryList weekOffset={0} items={[{ ...item, recipeIds: [] }]} />);
    expect(screen.queryByTestId('grocery-recipe-sources-toggle')).not.toBeInTheDocument();
    expect(screen.queryByText('Used in')).not.toBeInTheDocument();
    expect(screen.getByTestId('grocery-amount-review')).toBeVisible();
    expect(screen.getByTestId('reclassify-btn')).toBeVisible();
  });
  it('pins the loaded absolute source week during a pending week change and calendar rollover', () => {
    useWeekStore.setState({
      weekStartDate: '2026-10-12',
      calendar: {
        timeZone: 'UTC',
        today: '2026-10-19',
        capturedAtUtc: '2026-10-19T01:00:00Z',
        currentWeekStartDate: '2026-10-19',
        referenceWeekStartDate: '2026-10-19',
        nextDayAtUtc: '2026-10-20T00:00:00Z',
      },
    });
    // New prop has arrived, but loaded grocery rows still belong to October 12.
    render(<GroceryList weekOffset={1} items={[item]} />);
    fireEvent.click(screen.getByTestId('grocery-recipe-sources-toggle'));
    const href = screen.getByRole('link', { name: 'Family pasta' }).getAttribute('href')!;
    const url = new URL(href, 'http://localhost');
    expect(url.searchParams.get('sourceGroceryWeekOffset')).toBe('-1');
    expect(url.searchParams.get('sourceGroceryReferenceWeekStartDate')).toBe('2026-10-19');
    expect(mockToggleGroceryItem).not.toHaveBeenCalled();
  });
});
