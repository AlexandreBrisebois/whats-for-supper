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
import { render, screen, fireEvent, act, within } from '@testing-library/react';

// ── Store mock ────────────────────────────────────────────────────────────────

let mockGroceryState: Record<string, boolean> = {};
const mockSetGroceryItemToggle = vi.fn((ingredientName: string, isToggled: boolean) => {
  mockGroceryState = { ...mockGroceryState, [ingredientName]: isToggled };
});

vi.mock('@/store/plannerStore', () => ({
  usePlannerStore: () => ({
    groceryState: mockGroceryState,
    setGroceryItemToggle: mockSetGroceryItemToggle,
    setGroceryState: vi.fn(),
  }),
}));

// ── API mock ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/schedule', () => ({
  useSchedule: () => ({
    toggleGroceryItem: vi.fn().mockResolvedValue({}),
    updateGroceryState: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('@/lib/api/ingredients', () => ({
  reclassifyIngredient: vi.fn(),
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
  tWithVars: (_key: string, fallback: string) => fallback,
}));

// ── Import component AFTER mocks ──────────────────────────────────────────────

import { GroceryList } from './GroceryList';
import type { GroceryLineItemDto } from '@/lib/api/generated/models';
import { reclassifyIngredient } from '@/lib/api/ingredients';

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

const ITEMS = [makeItem('tomato', 'Produce'), makeItem('lettuce', 'Produce')];

function renderList() {
  return render(<GroceryList weekOffset={0} items={ITEMS} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGroceryState = {};
  mockSetGroceryItemToggle.mockClear();
});

describe('GroceryList — checked item ordering', () => {
  const orderedNames = () =>
    screen.getAllByTestId('grocery-item-label').map((label) => label.textContent);

  it('renders unchecked items before checked items while preserving order within each group', () => {
    mockGroceryState = { tomato: true, lettuce: false, carrot: true, cucumber: false };

    render(
      <GroceryList
        weekOffset={0}
        items={[
          makeItem('tomato', 'Produce'),
          makeItem('lettuce', 'Produce'),
          makeItem('carrot', 'Produce'),
          makeItem('cucumber', 'Produce'),
        ]}
      />
    );

    expect(orderedNames()).toEqual(['lettuce', 'cucumber', 'tomato', 'carrot']);
  });

  it('moves an item down when checked and back up when unchecked', async () => {
    mockGroceryState = { tomato: false, lettuce: false, carrot: true };
    const items = [
      makeItem('tomato', 'Produce'),
      makeItem('lettuce', 'Produce'),
      makeItem('carrot', 'Produce'),
    ];
    const { rerender } = render(<GroceryList weekOffset={0} items={items} />);

    fireEvent.click(
      screen
        .getAllByTestId('grocery-item-checkbox')
        .find((checkbox) => checkbox.getAttribute('data-item-name') === 'tomato')!
    );
    rerender(<GroceryList weekOffset={0} items={items} />);

    expect(orderedNames()).toEqual(['lettuce', 'tomato', 'carrot']);

    fireEvent.click(
      screen
        .getAllByTestId('grocery-item-checkbox')
        .find((checkbox) => checkbox.getAttribute('data-item-name') === 'tomato')!
    );
    rerender(<GroceryList weekOffset={0} items={items} />);

    expect(orderedNames()).toEqual(['tomato', 'lettuce', 'carrot']);
  });
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
    // No items → empty state, no section cards rendered
    mockGroceryState = {};

    render(<GroceryList weekOffset={0} items={[]} />);

    expect(screen.queryByTestId('section-complete-icon')).toBeNull();
    expect(screen.queryByTestId('aisle-header-complete')).toBeNull();
  });
});

describe('GroceryList — collapsible sections', () => {
  it('starts expanded and toggles one section without affecting another', () => {
    render(
      <GroceryList
        weekOffset={0}
        items={[makeItem('tomato', 'Produce'), makeItem('rice', 'Pantry')]}
      />
    );

    const produceSection = screen.getByTestId('aisle-section-Produce');
    const pantrySection = screen.getByTestId('aisle-section-Pantry');
    const produceHeader = within(produceSection).getByRole('button', { name: /Produce/ });
    const pantryHeader = within(pantrySection).getByRole('button', { name: /Pantry/ });

    expect(produceHeader).toHaveAttribute('aria-expanded', 'true');
    expect(pantryHeader).toHaveAttribute('aria-expanded', 'true');
    expect(within(produceSection).getByText('tomato')).toBeInTheDocument();
    expect(within(pantrySection).getByText('rice')).toBeInTheDocument();

    fireEvent.click(produceHeader);

    expect(produceHeader).toHaveAttribute('aria-expanded', 'false');
    expect(within(produceSection).getByText('tomato')).not.toBeVisible();
    expect(pantryHeader).toHaveAttribute('aria-expanded', 'true');
    expect(within(pantrySection).getByText('rice')).toBeInTheDocument();

    fireEvent.click(produceHeader);

    expect(produceHeader).toHaveAttribute('aria-expanded', 'true');
    expect(within(produceSection).getByText('tomato')).toBeVisible();
  });
});

describe('GroceryList — section grouping from DTO', () => {
  it('groups items by section from the DTO, not by keyword matching', () => {
    // 'xyzzy' would fall to Grocery by keyword but we explicitly assign it to Pantry
    render(<GroceryList weekOffset={0} items={[makeItem('xyzzy', 'Pantry', 'xyzzy')]} />);
    expect(screen.getByTestId('aisle-section-Pantry')).toBeInTheDocument();
    expect(screen.queryByTestId('aisle-section-Grocery')).not.toBeInTheDocument();
  });
});

describe('GroceryList — quantity hints', () => {
  it('shows the aggregated amount hint when quantity and unitText are present', () => {
    render(
      <GroceryList
        weekOffset={0}
        items={[
          makeItem('Potato', 'Produce', 'potato', {
            quantity: 1500,
            unitText: 'g',
          }),
        ]}
      />
    );

    expect(screen.getByText('Potato')).toBeInTheDocument();
    expect(screen.getByTestId('grocery-item-quantity-hint')).toHaveTextContent('1500 g');
  });

  it('does not show the amount hint when quantity is missing', () => {
    render(
      <GroceryList
        weekOffset={0}
        items={[
          makeItem('Onion', 'Produce', 'onion', {
            quantity: null,
            unitText: 'piece',
          }),
        ]}
      />
    );

    expect(screen.getByText('Onion')).toBeInTheDocument();
    expect(screen.queryByText(/piece/)).not.toBeInTheDocument();
  });

  it('does not show the amount hint when unitText is missing', () => {
    render(
      <GroceryList
        weekOffset={0}
        items={[
          makeItem('Milk', 'Pantry', 'milk', {
            quantity: 2,
            unitText: null,
          }),
        ]}
      />
    );

    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.queryByText(/\(2/)).not.toBeInTheDocument();
  });
});

describe('GroceryList — reclassify affordance', () => {
  it('shows the section picker when the reclassify button is clicked', async () => {
    render(<GroceryList weekOffset={0} items={[makeItem('Tomato', 'Produce', 'tomato')]} />);
    const btn = screen.getByTestId('reclassify-btn');
    fireEvent.click(btn);
    expect(screen.getByTestId('section-picker')).toBeInTheDocument();
  });

  it('calls reclassifyIngredient with the selected section', async () => {
    vi.mocked(reclassifyIngredient).mockResolvedValue(undefined);
    render(<GroceryList weekOffset={0} items={[makeItem('Tomato', 'Produce', 'tomato')]} />);
    fireEvent.click(screen.getByTestId('reclassify-btn'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('section-option-Pantry'));
    });

    expect(reclassifyIngredient).toHaveBeenCalledWith('tomato', 'Pantry');
    expect(screen.queryByTestId('section-picker')).not.toBeInTheDocument();
  });

  it('shows reclassify error indicator when the API call fails', async () => {
    vi.mocked(reclassifyIngredient).mockRejectedValue(new Error('Network error'));
    render(<GroceryList weekOffset={0} items={[makeItem('Tomato', 'Produce', 'tomato')]} />);
    fireEvent.click(screen.getByTestId('reclassify-btn'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('section-option-Pantry'));
    });

    await screen.findByTestId('reclassify-error');
  });
});
