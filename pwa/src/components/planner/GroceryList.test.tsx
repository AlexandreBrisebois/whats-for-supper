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
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';

const {
  mockToggleGroceryItem,
  mockCreateExtra,
  mockSuggestExtras,
  mockUpdateExtra,
  mockDeleteExtra,
  mockAddToast,
} = vi.hoisted(() => ({
  mockToggleGroceryItem: vi.fn(),
  mockCreateExtra: vi.fn(),
  mockSuggestExtras: vi.fn(),
  mockUpdateExtra: vi.fn(),
  mockDeleteExtra: vi.fn(),
  mockAddToast: vi.fn(),
}));

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

const ITEMS = [makeItem('tomato', 'Produce'), makeItem('lettuce', 'Produce')];

function renderList() {
  return render(<GroceryList weekOffset={0} items={ITEMS} />);
}

function StoreBackedGroceryList({ weekOffset = 0 }: { weekOffset?: number }) {
  const items = useWeekStore((state) => state.groceryItems);
  return <GroceryList weekOffset={weekOffset} items={items} />;
}

function renderStoreBacked(items: GroceryLineItemDto[], weekOffset = 0) {
  useWeekStore.setState({ weekOffset, groceryItems: items });
  return render(<StoreBackedGroceryList weekOffset={weekOffset} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGroceryState = {};
  mockSetGroceryItemToggle.mockClear();
  mockToggleGroceryItem.mockReset();
  mockToggleGroceryItem.mockResolvedValue(undefined);
  vi.mocked(reclassifyIngredient).mockReset();
  useWeekStore.setState({ weekOffset: 0, groceryItems: [] });
  useWeekStore.setState({
    weekStartDate: '2025-01-06',
    calendar: {
      timeZone: 'UTC',
      today: '2025-01-06',
      capturedAtUtc: '2025-01-06T12:00:00Z',
      currentWeekStartDate: '2025-01-06',
      referenceWeekStartDate: '2025-01-06',
      nextDayAtUtc: '2025-01-07T00:00:00Z',
    },
    groceryExtras: [],
    pendingGroceryExtraIds: new Set(),
  });
  mockCreateExtra.mockReset();
  mockSuggestExtras.mockReset();
  mockUpdateExtra.mockReset();
  mockDeleteExtra.mockReset();
  mockAddToast.mockReset();
});

describe('GroceryList — everyday extras', () => {
  const extra = {
    id: '11111111-1111-4111-8111-111111111111',
    lineageId: '11111111-1111-4111-8111-111111111111',
    name: 'Coffee',
    normalizedKey: 'coffee',
    grocerySection: 'Pantry' as any,
    checked: false,
    occurrenceWeekStartDate: '2025-01-06' as any,
    readOnly: false,
    source: 'extra',
    version: 1,
  };

  it('shows the composer only for the current week and suggestions fill without submitting', async () => {
    vi.useFakeTimers();
    mockSuggestExtras.mockResolvedValue(['Coffee beans']);
    const { rerender } = render(<GroceryList weekOffset={0} items={[]} extras={[]} />);
    const input = screen.getByRole('combobox', { name: 'Add an extra' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'co' } });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    expect(screen.getByRole('status')).toHaveTextContent('1 suggestion available');
    fireEvent.click(screen.getByRole('option').querySelector('button')!);
    expect(input).toHaveValue('Coffee beans');
    expect(mockCreateExtra).not.toHaveBeenCalled();
    useWeekStore.setState({ weekStartDate: '2025-01-13' });
    rerender(<GroceryList weekOffset={1} items={[]} extras={[]} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('uses absolute Monday rather than offset and supports active-option keyboard selection', async () => {
    vi.useFakeTimers();
    mockSuggestExtras.mockResolvedValue(['Coffee beans', 'Coffee filters']);
    render(<GroceryList weekOffset={7} items={[]} extras={[]} />);
    const input = screen.getByRole('combobox', { name: 'Add an extra' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'co' } });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', 'grocery-extra-option-0');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('Coffee beans');
    expect(mockCreateExtra).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('uses mobile-keyboard replacement text for the household-history lookup', async () => {
    vi.useFakeTimers();
    mockSuggestExtras.mockResolvedValue(['Coffee beans']);
    render(<GroceryList weekOffset={0} items={[]} extras={[]} />);
    const input = screen.getByRole('combobox', { name: 'Add an extra' });
    fireEvent.focus(input);
    fireEvent.input(input, {
      target: { value: 'coffee' },
      inputType: 'insertReplacementText',
      data: 'coffee',
    });

    await act(async () => vi.advanceTimersByTimeAsync(200));

    expect(mockSuggestExtras).toHaveBeenCalledWith('coffee');
    expect(screen.getByRole('option')).toHaveTextContent('Coffee beans');
    vi.useRealTimers();
  });

  it('announces the server-selected section after a successful add', async () => {
    mockCreateExtra.mockImplementation(async (_name, weekStartDate, clientId) => ({
      ...extra,
      id: clientId,
      occurrenceWeekStartDate: weekStartDate,
    }));
    render(<GroceryList weekOffset={0} items={[]} extras={[]} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Coffee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Saved to Pantry',
      })
    );
  });

  it('queries only while the eligible composer is focused and cancels on focus exit', async () => {
    vi.useFakeTimers();
    mockSuggestExtras.mockResolvedValue(['Coffee beans']);
    render(<GroceryList weekOffset={0} items={[]} extras={[]} />);
    const input = screen.getByRole('combobox', { name: 'Add an extra' });

    fireEvent.change(input, { target: { value: 'co' } });
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(mockSuggestExtras).not.toHaveBeenCalled();

    fireEvent.focus(input);
    fireEvent.blur(input, { relatedTarget: null });
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(mockSuggestExtras).not.toHaveBeenCalled();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('ignores a stale suggestion response and preserves free text when lookup fails', async () => {
    vi.useFakeTimers();
    let resolveFirst!: (names: string[]) => void;
    let resolveSecond!: (names: string[]) => void;
    mockSuggestExtras
      .mockImplementationOnce(() => new Promise<string[]>((resolve) => (resolveFirst = resolve)))
      .mockImplementationOnce(() => new Promise<string[]>((resolve) => (resolveSecond = resolve)))
      .mockRejectedValueOnce(new Error('lookup unavailable'));
    render(<GroceryList weekOffset={0} items={[]} extras={[]} />);
    const input = screen.getByRole('combobox', { name: 'Add an extra' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'co' } });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    fireEvent.change(input, { target: { value: 'cof' } });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    await act(async () => resolveSecond(['Coffee filters']));
    expect(screen.getByRole('option')).toHaveTextContent('Coffee filters');
    await act(async () => resolveFirst(['Cocoa']));
    expect(screen.getByRole('option')).toHaveTextContent('Coffee filters');

    fireEvent.change(input, { target: { value: 'tea' } });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    expect(input).toHaveValue('tea');
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('reuses its idempotency UUID after an uncertain create outcome', async () => {
    mockCreateExtra.mockRejectedValueOnce(new Error('response lost')).mockResolvedValueOnce(extra);
    render(<GroceryList weekOffset={0} items={[]} extras={[]} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Coffee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(mockCreateExtra).toHaveBeenCalledTimes(2));
    expect(mockCreateExtra.mock.calls[1][2]).toBe(mockCreateExtra.mock.calls[0][2]);
  });

  it('rejects a create response with the wrong identity and rereads authoritatively', async () => {
    const sync = vi.fn().mockResolvedValue(undefined);
    useWeekStore.setState({ sync });
    mockCreateExtra.mockImplementationOnce(async (_name, weekStartDate) => ({
      ...extra,
      id: '22222222-2222-4222-8222-222222222222',
      occurrenceWeekStartDate: weekStartDate,
    }));
    render(<GroceryList weekOffset={0} items={[]} extras={[]} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Coffee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(sync).toHaveBeenCalledOnce());
    expect(screen.getByRole('combobox')).toHaveValue('Coffee');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not add this extra');
    expect(useWeekStore.getState().groceryExtras).toEqual([]);
  });

  it('adds explicitly and keeps duplicate extras distinct from recipe rows', async () => {
    mockCreateExtra.mockResolvedValue(extra);
    render(
      <GroceryList
        weekOffset={0}
        items={[makeItem('Coffee', 'Pantry')]}
        extras={[extra, { ...extra, id: '22222222-2222-4222-8222-222222222222' }]}
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Coffee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(mockCreateExtra).toHaveBeenCalled());
    expect(screen.getAllByTestId('grocery-extra-row')).toHaveLength(2);
    expect(screen.getByTestId('grocery-item-label')).toHaveTextContent('Coffee');
  });

  it('renders historical extras without mutation controls', () => {
    render(
      <GroceryList
        weekOffset={-1}
        items={[]}
        extras={[{ ...extra, readOnly: true, checked: true }]}
      />
    );
    expect(screen.getByText('Bought')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit Coffee/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('grocery-extra-checkbox')).not.toBeInTheDocument();
  });

  it('checks an occurrence by identity and retains its noninteractive Extra label', async () => {
    mockUpdateExtra.mockResolvedValue({ ...extra, checked: true, version: 2 });
    render(<GroceryList weekOffset={0} items={[]} extras={[extra]} />);
    fireEvent.click(screen.getByTestId('grocery-extra-checkbox'));
    await waitFor(() => expect(mockUpdateExtra).toHaveBeenCalledWith(extra, { checked: true }));
    expect(screen.getByText('Extra').tagName).toBe('SPAN');
  });

  it('uses icon-only save and delete actions without a cancel action while renaming', () => {
    render(<GroceryList weekOffset={0} items={[]} extras={[extra]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Coffee' }));

    const save = screen.getByRole('button', { name: 'Save' });
    const remove = screen.getByRole('button', { name: 'Delete' });
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(save).toHaveTextContent('');
    expect(remove).toHaveTextContent('');
    expect(save.querySelector('svg')).toBeInTheDocument();
    expect(remove.querySelector('svg')).toBeInTheDocument();
    expect(save).toHaveClass('h-11', 'w-11');
    expect(remove).toHaveClass('h-11', 'w-11');
  });

  it('clears the pending guard before an uncertain mutation rereads authoritative state', async () => {
    mockUpdateExtra.mockRejectedValueOnce(new Error('response lost'));
    const sync = vi.fn().mockImplementation(async () => {
      expect(useWeekStore.getState().pendingGroceryExtraIds.has(extra.id)).toBe(false);
    });
    useWeekStore.setState({ sync });
    render(<GroceryList weekOffset={0} items={[]} extras={[extra]} />);

    fireEvent.click(screen.getByTestId('grocery-extra-checkbox'));

    await waitFor(() => expect(sync).toHaveBeenCalledOnce());
  });

  it('clears the pending guard before an uncertain delete rereads authoritative state', async () => {
    mockDeleteExtra.mockRejectedValueOnce(new Error('response lost'));
    const sync = vi.fn().mockImplementation(async () => {
      expect(useWeekStore.getState().pendingGroceryExtraIds.has(extra.id)).toBe(false);
    });
    useWeekStore.setState({ sync, groceryExtras: [extra] });
    render(<GroceryList weekOffset={0} items={[]} extras={[extra]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Coffee' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(sync).toHaveBeenCalledOnce());
  });

  it('reconciles a current occurrence after navigation to its eligible next-week projection', async () => {
    let resolveUpdate!: (value: typeof extra) => void;
    mockUpdateExtra.mockImplementationOnce(
      () => new Promise<typeof extra>((resolve) => (resolveUpdate = resolve))
    );
    useWeekStore.setState({ groceryExtras: [extra] });
    render(<GroceryList weekOffset={0} items={[]} extras={[extra]} />);

    fireEvent.click(screen.getByTestId('grocery-extra-checkbox'));
    act(() => useWeekStore.setState({ weekOffset: 1, weekStartDate: '2025-01-13' }));
    await act(async () => resolveUpdate({ ...extra, checked: true, version: 2 }));

    expect(useWeekStore.getState().groceryExtras).toEqual([]);
  });

  it('rejects a mutation response for a different occurrence and refreshes authoritatively', async () => {
    const sync = vi.fn().mockResolvedValue(undefined);
    useWeekStore.setState({ sync, groceryExtras: [extra] });
    mockUpdateExtra.mockResolvedValueOnce({
      ...extra,
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Wrong occurrence',
      version: 2,
    });
    render(<GroceryList weekOffset={0} items={[]} extras={[extra]} />);

    fireEvent.click(screen.getByTestId('grocery-extra-checkbox'));

    await waitFor(() => expect(sync).toHaveBeenCalledOnce());
    expect(useWeekStore.getState().groceryExtras).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Wrong occurrence' })])
    );
  });

  it('combines recipe rows and extras in one aisle with one shared count', () => {
    render(<GroceryList weekOffset={0} items={[makeItem('Coffee', 'Pantry')]} extras={[extra]} />);

    expect(screen.getAllByTestId('aisle-section-Pantry')).toHaveLength(1);
    expect(within(screen.getByTestId('aisle-section-Pantry')).getByText('0/2 items')).toBeVisible();
    expect(
      within(screen.getByTestId('aisle-section-Pantry')).getByTestId('grocery-extra-row')
    ).toBeVisible();
    expect(
      within(screen.getByTestId('aisle-section-Pantry')).getByTestId('grocery-item-label')
    ).toHaveTextContent('Coffee');
  });

  it('counts a checked extra toward aisle completion and initial collapse', () => {
    render(<GroceryList weekOffset={0} items={[]} extras={[{ ...extra, checked: true }]} />);

    const section = screen.getByTestId('aisle-section-Pantry');
    expect(within(section).getByTestId('aisle-header-complete')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(within(section).getByText('1/1 items')).toBeVisible();
    expect(within(section).getByTestId('grocery-extra-row')).not.toBeVisible();
  });
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

describe('GroceryList — duplicate display names', () => {
  it('keeps every duplicate row rendered exactly once while toggling its shared grocery state', async () => {
    const duplicateItems = [
      makeItem('Eau', 'Pantry', 'water-cup', { quantity: 0.25, unitText: 'tasse' }),
      makeItem('Eau', 'Pantry', 'water-ml', { quantity: 250, unitText: 'ml' }),
      makeItem('Eau', 'Pantry', 'water-litre', { quantity: 0.25, unitText: 'L' }),
    ];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(<GroceryList weekOffset={0} items={duplicateItems} />);

    const rows = () => screen.getAllByTestId('grocery-item-checkbox');
    const labels = () => screen.getAllByTestId('grocery-item-label');

    expect(rows()).toHaveLength(3);
    expect(labels()).toHaveLength(3);
    expect(screen.getByText('0/3 items')).toBeInTheDocument();

    fireEvent.click(rows()[0]);
    rerender(<GroceryList weekOffset={0} items={duplicateItems} />);

    expect(rows()).toHaveLength(3);
    expect(labels()).toHaveLength(3);
    expect(screen.getByText('3/3 items')).toBeInTheDocument();
    expect(rows().every((row) => row.getAttribute('aria-checked') === 'true')).toBe(true);

    fireEvent.click(rows()[0]);
    rerender(<GroceryList weekOffset={0} items={duplicateItems} />);

    expect(rows()).toHaveLength(3);
    expect(labels()).toHaveLength(3);
    expect(screen.getByText('0/3 items')).toBeInTheDocument();
    expect(rows().every((row) => row.getAttribute('aria-checked') === 'false')).toBe(true);

    fireEvent.click(rows()[0]);
    rerender(<GroceryList weekOffset={0} items={duplicateItems} />);

    expect(rows()).toHaveLength(3);
    expect(labels()).toHaveLength(3);
    expect(screen.getByText('3/3 items')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe('GroceryList — optimistic grocery state synchronization', () => {
  const items = [makeItem('Tomato', 'Produce'), makeItem('Lettuce', 'Produce')];
  const rowCount = () => screen.getAllByTestId('grocery-item-checkbox').length;

  it('preserves row cardinality and ordering after a successful optimistic toggle', async () => {
    mockGroceryState = { Tomato: false, Lettuce: false };
    const { rerender } = render(<GroceryList weekOffset={0} items={items} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Tomato/ }));
    rerender(<GroceryList weekOffset={0} items={items} />);

    expect(mockToggleGroceryItem).toHaveBeenCalledWith(0, 'Tomato', true);
    expect(rowCount()).toBe(2);
    expect(screen.getAllByTestId('grocery-item-label').map((label) => label.textContent)).toEqual([
      'Lettuce',
      'Tomato',
    ]);
    expect(screen.getByText('1/2 items')).toBeInTheDocument();
  });

  it('rolls back a failed optimistic toggle without changing row cardinality', async () => {
    mockGroceryState = { Tomato: false, Lettuce: false };
    mockToggleGroceryItem.mockRejectedValueOnce(new Error('Network error'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(<GroceryList weekOffset={0} items={items} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Tomato/ }));
    await waitFor(() => expect(mockGroceryState.Tomato).toBe(false));
    rerender(<GroceryList weekOffset={0} items={items} />);

    expect(rowCount()).toBe(2);
    expect(screen.getAllByTestId('grocery-item-label').map((label) => label.textContent)).toEqual([
      'Tomato',
      'Lettuce',
    ]);
    expect(screen.getByText('0/2 items')).toBeInTheDocument();
    expect(screen.getByTestId('grocery-item-error')).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('reconciles repeated remote states without changing duplicate-row cardinality', () => {
    const duplicateItems = [
      makeItem('Flour', 'Pantry', 'flour-grams', { quantity: 200, unitText: 'g' }),
      makeItem('Flour', 'Pantry', 'flour-volume', { quantity: 240, unitText: 'ml' }),
    ];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(<GroceryList weekOffset={0} items={duplicateItems} />);

    mockGroceryState = { Flour: true };
    rerender(<GroceryList weekOffset={0} items={duplicateItems} />);
    rerender(<GroceryList weekOffset={0} items={duplicateItems} />);

    expect(rowCount()).toBe(2);
    expect(screen.getByText('2/2 items')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe('GroceryList — replacement and remount consistency', () => {
  it('renders the same duplicate rows after an equivalent replacement and remount', () => {
    const items = [
      makeItem('Eau', 'Pantry', 'water-cup', { quantity: 0.25, unitText: 'tasse' }),
      makeItem('Eau', 'Pantry', 'water-ml', { quantity: 250, unitText: 'ml' }),
    ];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender, unmount } = render(<GroceryList weekOffset={0} items={items} />);

    rerender(<GroceryList weekOffset={0} items={items.map((item) => ({ ...item }))} />);
    expect(screen.getAllByTestId('grocery-item-checkbox')).toHaveLength(2);

    unmount();
    render(<GroceryList weekOffset={0} items={items.map((item) => ({ ...item }))} />);
    expect(screen.getAllByTestId('grocery-item-checkbox')).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
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
  it('keeps a section open when its final ingredient is checked', () => {
    mockGroceryState = { tomato: true, lettuce: false };
    const { rerender } = renderList();
    const header = screen.getByRole('button', { name: /Produce/ });

    expect(header).toHaveAttribute('aria-expanded', 'true');

    mockGroceryState = { tomato: true, lettuce: true };
    rerender(<GroceryList weekOffset={0} items={ITEMS} />);

    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('lettuce')).toBeVisible();
  });

  it('defaults completed sections to collapsed and re-collapses them when the app returns', () => {
    mockGroceryState = { tomato: true, lettuce: true };
    renderList();
    const header = screen.getByRole('button', { name: /Produce/ });

    expect(header).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');

    fireEvent(document, new Event('visibilitychange'));

    expect(header).toHaveAttribute('aria-expanded', 'false');
  });

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
    expect(screen.getByTestId('section-picker')).toBeInTheDocument();
  });

  it('moves the item from its source aisle to its destination after PATCH succeeds', async () => {
    vi.mocked(reclassifyIngredient).mockResolvedValue(undefined);
    renderStoreBacked([makeItem('Tomato', 'Produce', 'tomato')]);

    fireEvent.click(screen.getByTestId('reclassify-btn'));
    await act(async () => fireEvent.click(screen.getByTestId('section-option-Pantry')));

    expect(screen.queryByTestId('aisle-section-Produce')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('aisle-section-Pantry')).getByText('Tomato')).toBeVisible();
  });

  it('does not move an item when PATCH fails and allows retry', async () => {
    vi.mocked(reclassifyIngredient).mockRejectedValue(new Error('Network error'));
    renderStoreBacked([makeItem('Tomato', 'Produce', 'tomato')]);

    fireEvent.click(screen.getByTestId('reclassify-btn'));
    await act(async () => fireEvent.click(screen.getByTestId('section-option-Pantry')));

    expect(within(screen.getByTestId('aisle-section-Produce')).getByText('Tomato')).toBeVisible();
    expect(screen.queryByTestId('aisle-section-Pantry')).not.toBeInTheDocument();
    expect(screen.getByTestId('section-picker')).toBeInTheDocument();
    expect(screen.getByTestId('section-option-Pantry')).not.toBeDisabled();
  });

  it('does not duplicate an item when its current section is selected', async () => {
    vi.mocked(reclassifyIngredient).mockResolvedValue(undefined);
    renderStoreBacked([makeItem('Tomato', 'Produce', 'tomato')]);

    fireEvent.click(screen.getByTestId('reclassify-btn'));
    await act(async () => fireEvent.click(screen.getByTestId('section-option-Produce')));

    expect(screen.getAllByText('Tomato')).toHaveLength(1);
    expect(useWeekStore.getState().groceryItems).toHaveLength(1);
  });

  it('preserves checked state when the item moves sections', async () => {
    mockGroceryState = { Tomato: true };
    vi.mocked(reclassifyIngredient).mockResolvedValue(undefined);
    renderStoreBacked([makeItem('Tomato', 'Produce', 'tomato')]);

    fireEvent.click(screen.getByTestId('reclassify-btn'));
    await act(async () => fireEvent.click(screen.getByTestId('section-option-Pantry')));

    expect(screen.getByTestId('grocery-item-checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('moves only the selected duplicate-display-name line without cloning either row', async () => {
    vi.mocked(reclassifyIngredient).mockResolvedValue(undefined);
    renderStoreBacked([
      makeItem('Flour', 'Produce', 'flour-grams', { quantity: 200, unitText: 'g' }),
      makeItem('Flour', 'Produce', 'flour-volume', { quantity: 240, unitText: 'ml' }),
    ]);

    fireEvent.click(screen.getAllByTestId('reclassify-btn')[0]);
    await act(async () => fireEvent.click(screen.getByTestId('section-option-Pantry')));

    expect(useWeekStore.getState().groceryItems).toHaveLength(2);
    expect(within(screen.getByTestId('aisle-section-Produce')).getAllByText('Flour')).toHaveLength(
      1
    );
    expect(within(screen.getByTestId('aisle-section-Pantry')).getAllByText('Flour')).toHaveLength(
      1
    );
    expect(screen.getAllByTestId('grocery-item-checkbox')).toHaveLength(2);
  });

  it('prevents a second selection while the item PATCH is pending', async () => {
    let resolvePatch!: () => void;
    vi.mocked(reclassifyIngredient).mockImplementation(
      () => new Promise<void>((resolve) => (resolvePatch = resolve))
    );
    renderStoreBacked([makeItem('Tomato', 'Produce', 'tomato')]);

    fireEvent.click(screen.getByTestId('reclassify-btn'));
    fireEvent.click(screen.getByTestId('section-option-Pantry'));

    expect(screen.getByTestId('section-picker')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('section-option-Produce')).toBeDisabled();
    fireEvent.click(screen.getByTestId('section-option-Produce'));
    expect(reclassifyIngredient).toHaveBeenCalledTimes(1);

    await act(async () => resolvePatch());
  });

  it('ignores a successful response after navigation loads another week', async () => {
    let resolvePatch!: () => void;
    vi.mocked(reclassifyIngredient).mockImplementation(
      () => new Promise<void>((resolve) => (resolvePatch = resolve))
    );
    renderStoreBacked([makeItem('Tomato', 'Produce', 'tomato')]);

    fireEvent.click(screen.getByTestId('reclassify-btn'));
    fireEvent.click(screen.getByTestId('section-option-Pantry'));
    useWeekStore.setState({
      weekOffset: 1,
      groceryItems: [makeItem('Rice', 'Pantry', 'rice')],
    });
    await act(async () => resolvePatch());

    expect(useWeekStore.getState().groceryItems).toEqual([makeItem('Rice', 'Pantry', 'rice')]);
  });
});
