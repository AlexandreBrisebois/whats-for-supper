import { DateOnly } from '@microsoft/kiota-abstractions';
import { scalarQuantity, fixtureGroceryId, fixtureGroceryChecks } from '@/testing/grocery-fixtures';
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
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

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
  mockGroceryState = fixtureGroceryChecks({ ...mockGroceryState, [ingredientName]: isToggled });
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
import type { GroceryExtraDto, GroceryLineItemDto } from '@/lib/api/generated/models';
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
    rowId: fixtureGroceryId(normalizedKey ?? displayName),
    rowVersion: '1',
    weekStartDate: DateOnly.parse('2025-01-06'),
    source: 'recipe',
    demandIdentity: `fixture:${normalizedKey ?? displayName}`,
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
  quantity: scalarQuantity(400),
  unitText: 'g',
  quantityComplete: false,
  ...{ checkReviewReason: 'prior_amount_unknown' }, // Retired persisted data must not restore UI.
  recipeIds: [id, id],
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGroceryState = fixtureGroceryChecks({});
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

describe('shopping focus and category parity', () => {
  const extra = (name: string, id: string): GroceryExtraDto => ({
    id,
    lineageId: id,
    name,
    normalizedKey: name.toLowerCase(),
    grocerySection: 'Pantry',
    checked: false,
    occurrenceWeekStartDate: DateOnly.parse('2026-10-12'),
    version: 1,
    source: 'extra',
    readOnly: false,
  });
  const coffee = extra('Coffee', '05000000-0000-4000-8000-000000000011');
  const tea = extra('Tea', '05000000-0000-4000-8000-000000000012');
  const View = ({ future = false }: { future?: boolean }) => (
    <GroceryList
      weekOffset={future ? 1 : 0}
      items={[item]}
      extras={useWeekStore((state) => state.groceryExtras)}
    />
  );

  it('keeps the initiating extra checkbox focused after acknowledgement instead of Edit', async () => {
    useWeekStore.setState({ groceryExtras: [coffee, tea] });
    mockUpdateExtra.mockResolvedValue({ ...coffee, checked: true, version: 2 });
    render(<View />);
    const check = screen.getAllByTestId('grocery-extra-checkbox')[0];
    check.focus();
    fireEvent.click(check);
    await waitFor(() => expect(mockUpdateExtra).toHaveBeenCalledOnce());
    await act(async () => {
      await new Promise(requestAnimationFrame);
    });
    expect(check).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Edit Coffee' })).not.toHaveFocus();
    expect(screen.queryByRole('group', { name: 'Choose section' })).not.toBeInTheDocument();
  });

  it('uses an adjacent checkbox when a keyboard-activated future extra disappears', async () => {
    useWeekStore.setState({
      weekOffset: 1,
      weekStartDate: '2026-10-19',
      groceryExtras: [coffee, tea],
    });
    mockUpdateExtra.mockResolvedValue({ ...coffee, checked: true, version: 2 });
    render(<View future />);
    const check = screen.getAllByTestId('grocery-extra-checkbox')[0];
    const adjacent = screen.getAllByTestId('grocery-extra-checkbox')[1];
    check.focus();
    fireEvent.click(check, { detail: 0 });
    await waitFor(() => expect(check).not.toBeInTheDocument());
    expect(adjacent).toHaveFocus();
  });

  it('does not move focus from a later user action when an extra save returns', async () => {
    let acknowledge!: (value: GroceryExtraDto) => void;
    mockUpdateExtra.mockReturnValue(
      new Promise<GroceryExtraDto>((resolve) => {
        acknowledge = resolve;
      })
    );
    useWeekStore.setState({ groceryExtras: [coffee, tea] });
    render(<View />);
    const [check, other] = screen.getAllByTestId('grocery-extra-checkbox');
    check.focus();
    fireEvent.click(check);
    other.focus();
    await act(async () => {
      acknowledge({ ...coffee, checked: true, version: 2 });
    });
    await act(async () => {
      await new Promise(requestAnimationFrame);
    });
    expect(other).toHaveFocus();
  });

  it('matches tag icon placement and avoids a write for the current extra section', async () => {
    useWeekStore.setState({ groceryExtras: [coffee] });
    render(<View />);
    const normal = screen.getByTestId('reclassify-btn');
    const tag = screen.getByRole('button', { name: 'Change section for Coffee' });
    expect(normal.querySelector('svg')).toHaveAttribute(
      'width',
      tag.querySelector('svg')!.getAttribute('width')
    );
    expect(normal.querySelector('svg')).toHaveClass('mx-auto');
    fireEvent.click(tag);
    fireEvent.click(
      screen.getByRole('group', { name: 'Choose section' }).querySelectorAll('button')[1]
    );
    expect(screen.queryByRole('group', { name: 'Choose section' })).not.toBeInTheDocument();
    expect(mockUpdateExtra).not.toHaveBeenCalled();
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

  it('retains known subtotals and source actions without retired prior-check warnings', () => {
    render(<GroceryList weekOffset={0} items={[item]} />);
    const book = screen.getByTestId('grocery-recipe-sources-toggle');
    expect(screen.queryByTestId('grocery-amount-review')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grocery-check-review')).not.toBeInTheDocument();
    expect(screen.getByTestId('grocery-item-quantity-hint')).toHaveTextContent('400 g known');
    expect(screen.queryByText('Review amounts')).not.toBeInTheDocument();
    expect(screen.getByTestId('grocery-item-checkbox')).toBeVisible();
    expect(screen.getByTestId('reclassify-btn')).toHaveAccessibleName('Change section for pasta');
    fireEvent.click(book);
    const sources = screen.getByTestId('grocery-recipe-sources-region');
    expect(sources).not.toHaveTextContent('Previously checked amount needs review.');
    fireEvent.click(book);
    expect(screen.queryByTestId('grocery-amount-review')).not.toBeInTheDocument();
    expect(mockToggleGroceryItem).not.toHaveBeenCalled();
    expect(reclassifyIngredient).not.toHaveBeenCalled();
  });

  it('does not invent a source disclosure for rows without recipe contributors', () => {
    render(<GroceryList weekOffset={0} items={[{ ...item, recipeIds: [] }]} />);
    expect(screen.queryByTestId('grocery-recipe-sources-toggle')).not.toBeInTheDocument();
    expect(screen.queryByText('Used in')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grocery-amount-review')).not.toBeInTheDocument();
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
