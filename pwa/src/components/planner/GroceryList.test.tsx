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
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import { DateOnly } from '@microsoft/kiota-abstractions';

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

const ITEMS = [makeItem('tomato', 'Produce'), makeItem('lettuce', 'Produce')];
function seedChecks(values: Record<string, boolean>) {
  mockGroceryState = fixtureGroceryChecks(values);
  useWeekStore.setState({
    groceryListVersion: '1',
    groceryVersionWeek: '2025-01-06',
    authoritativeGroceryChecks: mockGroceryState,
  });
}

function renderList() {
  return render(<GroceryList weekOffset={0} items={ITEMS} />);
}

// Group 1 contract regression: IDs are deliberately unrelated to all labels.
const WATER_ROWS = ['g', 'ml', 'bottle'].map((unitText, index) =>
  Object.assign(makeItem('Water', 'Produce', 'water', { unitText, quantity: null }), {
    rowId: `04000000-0000-4000-8000-00000000000${index + 1}`,
    rowVersion: '1',
    weekStartDate: DateOnly.parse('2025-01-06'),
    source: 'recipe',
  })
);
const WATER_EXTRA: GroceryExtraDto = {
  id: '04000000-0000-4000-8000-000000000004',
  lineageId: '04000000-0000-4000-8000-000000000005',
  occurrenceWeekStartDate: DateOnly.parse('2025-01-06'),
  name: 'Water',
  normalizedKey: 'water',
  grocerySection: 'Produce',
  checked: false,
  version: 1,
  source: 'extra',
  readOnly: false,
};

describe('independent grocery row contract (C26 / bounded C31)', () => {
  it('reads one checked water identity without sharing it with the other water buckets', () => {
    seedChecks({ [WATER_ROWS[0].rowId]: true });
    render(<GroceryList weekOffset={0} items={WATER_ROWS} extras={[WATER_EXTRA]} />);

    const controls = screen.getAllByTestId('grocery-item-checkbox');
    expect(controls).toHaveLength(3);
    expect(screen.getAllByRole('checkbox', { name: /Water/ })).toHaveLength(4);
    expect(
      controls.filter((control) => control.getAttribute('aria-checked') === 'true')
    ).toHaveLength(1);
  });

  it('writes the selected opaque identity instead of its shared display label', async () => {
    render(<GroceryList weekOffset={0} items={WATER_ROWS} />);
    await act(async () => fireEvent.click(screen.getAllByTestId('grocery-item-checkbox')[1]));

    expect(mockSetGroceryItemToggle).toHaveBeenCalledWith(WATER_ROWS[1].rowId, true);
    expect(mockGroceryState).toEqual({ [WATER_ROWS[1].rowId]: true });
  });
});

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
  mockReadSchedule.mockReset();
  mockGetSourceRecipe.mockReset().mockRejectedValue(new Error('Recipe unavailable'));
  useWeekStore.setState({ schedule: [] });
  mockRefreshServings.mockReset();
  useWeekStore.setState({ groceryRefresh: undefined });
  seedChecks({});
  mockSetGroceryItemToggle.mockClear();
  mockToggleGroceryItem.mockReset();
  mockToggleGroceryItem.mockImplementation(async (_offset, request) => {
    const current = useWeekStore.getState();
    const version = String(BigInt(request.expectedRowVersion) + 1n);
    const rows = current.groceryItems.some((row) => row.rowId === request.rowId)
      ? current.groceryItems
      : [
          {
            rowId: request.rowId,
            rowVersion: request.expectedRowVersion,
            weekStartDate: request.weekStartDate,
            displayName: 'Fixture row',
            normalizedKey: 'fixture',
            source: 'recipe',
            demandIdentity: 'fixture',
            section: 'Produce',
            recipeIds: [],
            quantity: null,
          },
        ];
    return {
      updatedAt: new Date(),
      weekStartDate: request.weekStartDate,
      listVersion: String(BigInt(current.groceryListVersion ?? '1') + 1n),
      rowId: request.rowId,
      rowVersion: version,
      checked: request.checked,
      checks: { additionalData: { ...mockGroceryState, [request.rowId]: request.checked } },
      rows: rows.map((row) =>
        row.rowId === request.rowId ? { ...row, rowVersion: version } : row
      ),
    };
  });
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

describe('quiet reset notices across absolute weeks', () => {
  const showWeek = (week: string, summary: string) =>
    useWeekStore.setState({
      weekStartDate: week,
      groceryRefresh: {
        status: 'current',
        version: summary,
        appliedVersion: summary,
        resetSummaryVersion: summary,
      },
    });

  it('remembers each week after A dismiss, B dismiss and reopening A, but shows a new A reset', () => {
    sessionStorage.clear();
    showWeek('2025-01-06', 'reset-A');
    let view = renderList();
    fireEvent.click(
      within(screen.getByTestId('grocery-portions-summary')).getByRole('button', {
        name: 'Dismiss',
      })
    );
    expect(screen.queryByTestId('grocery-portions-summary')).not.toBeInTheDocument();
    view.unmount();
    showWeek('2025-01-13', 'reset-B');
    view = renderList();
    fireEvent.click(
      within(screen.getByTestId('grocery-portions-summary')).getByRole('button', {
        name: 'Dismiss',
      })
    );
    view.unmount();
    showWeek('2025-01-06', 'reset-A');
    view = renderList();
    expect(screen.queryByTestId('grocery-portions-summary')).not.toBeInTheDocument();
    act(() => showWeek('2025-01-06', 'reset-A-new'));
    expect(screen.getByTestId('grocery-portions-summary')).toBeVisible();
    fireEvent.click(
      within(screen.getByTestId('grocery-portions-summary')).getByRole('button', {
        name: 'Dismiss',
      })
    );
    view.unmount();
    showWeek('2025-01-06', 'reset-A-new');
    renderList();
    expect(screen.queryByTestId('grocery-portions-summary')).not.toBeInTheDocument();
  });

  it('keeps the list usable when reading notice acknowledgements is denied', () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage denied');
    });
    try {
      showWeek('2025-01-06', 'denied-read');
      expect(() => renderList()).not.toThrow();
      expect(screen.getByTestId('grocery-portions-summary')).toBeVisible();
    } finally {
      storage.mockRestore();
    }
  });

  it('dismisses locally when writing notice acknowledgements is denied', () => {
    showWeek('2025-01-06', 'denied-write');
    renderList();
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage denied');
    });
    try {
      fireEvent.click(
        within(screen.getByTestId('grocery-portions-summary')).getByRole('button', {
          name: 'Dismiss',
        })
      );
      expect(screen.queryByTestId('grocery-portions-summary')).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /tomato/i })).toBeVisible();
    } finally {
      storage.mockRestore();
    }
  });
});

describe('serving refresh acknowledgement lifetime', () => {
  it.each(['week', 'value'] as const)(
    'does not roll an old recipe check failure into a newer %s',
    async (change) => {
      let fail!: (error: Error) => void;
      mockToggleGroceryItem.mockReturnValue(new Promise((_, reject) => (fail = reject)));
      renderList();
      fireEvent.click(screen.getByRole('checkbox', { name: /tomato/i }));
      if (change === 'week') useWeekStore.setState({ weekStartDate: '2025-01-13' });
      else seedChecks({ tomato: false });
      const calls = mockSetGroceryItemToggle.mock.calls.length;
      await act(async () => fail(new Error('old check failed')));
      expect(mockSetGroceryItemToggle).toHaveBeenCalledTimes(calls);
    }
  );
  it.each(['different week', 'newer same-week freshness'] as const)(
    'preserves %s after an old Retry reply',
    async (change) => {
      let resolve!: () => void;
      mockRefreshServings.mockReturnValue(
        new Promise<void>((done) => {
          resolve = done;
        })
      );
      useWeekStore.setState({
        schedule: [{ date: '2025-01-06', day: 'Monday', status: 0 }] as any,
        groceryRefresh: {
          status: 'failed',
          version: 'old',
          appliedVersion: 'older',
          resetSummaryVersion: 'old-summary',
        },
      });
      renderList();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(mockRefreshServings).toHaveBeenCalledWith('2025-01-06');
      const newer = {
        status: 'current' as const,
        version: 'new',
        appliedVersion: 'new',
        resetSummaryVersion: 'new-summary',
      };
      act(() =>
        useWeekStore.setState({
          ...(change === 'different week'
            ? { schedule: [{ date: '2025-01-13', day: 'Monday', status: 0 }] as any }
            : {}),
          groceryRefresh: newer,
        })
      );
      await act(async () => resolve());
      expect(useWeekStore.getState().groceryRefresh).toEqual(newer);
    }
  );
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

  it('uses an icon-only Add action with an accessible name and a stable touch target', () => {
    render(<GroceryList weekOffset={0} items={[]} />);
    const add = screen.getByRole('button', { name: 'Add' });
    expect(add).toHaveTextContent('');
    expect(add.querySelector('svg')).toBeInTheDocument();
    expect(add).toHaveClass('h-12', 'w-12', 'shrink-0');
  });

  it('keeps the composer focused when the Add button is pressed', () => {
    render(<GroceryList weekOffset={0} items={[]} extras={[]} />);
    const input = screen.getByRole('combobox', { name: 'Add an extra' });
    const add = screen.getByRole('button', { name: 'Add' });
    input.focus();
    expect(input).toHaveFocus();

    expect(fireEvent.pointerDown(add)).toBe(false);
    expect(input).toHaveFocus();
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

  it('offers a new explicit submission after authoritative absence of an earlier accepted create', async () => {
    const sync = vi.fn().mockResolvedValue(undefined);
    useWeekStore.setState({ sync });
    mockCreateExtra.mockRejectedValueOnce(
      Object.assign(new Error('Removed elsewhere'), { absent: true })
    );
    mockCreateExtra.mockImplementationOnce(async (_name, week, id) => ({
      ...extra,
      id,
      occurrenceWeekStartDate: week,
    }));
    render(<GroceryList weekOffset={0} items={[]} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Coffee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(sync).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(mockCreateExtra).toHaveBeenCalledTimes(2));
    expect(mockCreateExtra.mock.calls[1][2]).not.toBe(mockCreateExtra.mock.calls[0][2]);
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

  it.each(['check', 'delete'] as const)(
    'optimistically applies %s and restores the row after an uncertain failure',
    async (operation) => {
      let fail!: (error: Error) => void;
      const pending = new Promise((_, reject) => {
        fail = reject;
      });
      const sync = vi.fn().mockResolvedValue(undefined);
      useWeekStore.setState({ groceryExtras: [extra], sync });
      const View = () => (
        <GroceryList
          weekOffset={0}
          items={[]}
          extras={useWeekStore((state) => state.groceryExtras)}
        />
      );
      mockUpdateExtra.mockReturnValue(pending);
      mockDeleteExtra.mockReturnValue(pending);
      render(<View />);
      if (operation === 'check') {
        fireEvent.click(screen.getByTestId('grocery-extra-checkbox'));
        expect(screen.getByTestId('grocery-extra-checkbox')).toHaveAttribute(
          'aria-checked',
          'true'
        );
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'Edit Coffee' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(screen.queryByTestId('grocery-extra-row')).not.toBeInTheDocument();
      }
      await act(async () => fail(new Error('response lost')));
      expect(screen.getByTestId('grocery-extra-row')).toBeInTheDocument();
      expect(useWeekStore.getState().groceryExtras[0].checked).toBe(false);
      expect(sync).toHaveBeenCalledOnce();
      expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    }
  );

  it('rejects blank rename and retains the authoritative name on a failed save', async () => {
    const sync = vi.fn().mockResolvedValue(undefined);
    useWeekStore.setState({ groceryExtras: [extra], sync });
    mockUpdateExtra.mockRejectedValue(new Error('save failed'));
    render(<GroceryList weekOffset={0} items={[]} extras={[extra]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Coffee' }));
    const input = screen.getByRole('textbox', { name: 'Extra name' });
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Changed coffee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(sync).toHaveBeenCalledOnce());
    expect(useWeekStore.getState().groceryExtras[0].name).toBe('Coffee');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
  });

  it('keeps existing rows usable and announces a pending icon-only add', async () => {
    let finish!: (value: typeof extra) => void;
    mockCreateExtra.mockImplementation(
      (_name, week, id) =>
        new Promise((resolve) => {
          finish = () => resolve({ ...extra, id, occurrenceWeekStartDate: week });
        })
    );
    render(<GroceryList weekOffset={0} items={[]} extras={[extra]} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Coffee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('button', { name: 'Adding…' })).toBeDisabled();
    expect(screen.getByText('Adding…')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('grocery-extra-checkbox')).not.toBeDisabled();
    await act(async () => finish(extra));
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('keeps the authoritative category while an extra category save is pending', async () => {
    let finish!: (value: typeof extra) => void;
    mockUpdateExtra.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    useWeekStore.setState({ groceryExtras: [extra] });
    render(<GroceryList weekOffset={0} items={[]} extras={[extra]} />);
    fireEvent.click(screen.getByRole('button', { name: /Change section.*Coffee/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Produce' }));
    expect(useWeekStore.getState().groceryExtras[0].grocerySection).toBe(extra.grocerySection);
    await act(async () => finish({ ...extra, grocerySection: 'Produce', version: 2 }));
    expect(useWeekStore.getState().groceryExtras[0].grocerySection).toBe('Produce');
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
  const makeExtra = (id: string, name: string, checked: boolean) => ({
    id,
    lineageId: id,
    name,
    normalizedKey: name.toLowerCase(),
    grocerySection: 'Pantry' as const,
    checked,
    occurrenceWeekStartDate: '2025-01-06' as any,
    readOnly: false,
    source: 'extra',
    version: 1,
  });
  const pantryRows = () =>
    Array.from(document.querySelector('#aisle-items-pantry')!.children).map((row) => ({
      name:
        row.querySelector('[data-testid="grocery-extra-name"]')?.textContent ??
        row.querySelector('[data-testid="grocery-item-label"]')?.textContent,
      checked: row.querySelector('[role="checkbox"]')?.getAttribute('aria-checked'),
    }));

  it('orders mixed extra and recipe rows by check state without changing source order', () => {
    seedChecks({ Rice: false, Beans: true });
    render(
      <GroceryList
        weekOffset={0}
        items={[makeItem('Beans', 'Pantry'), makeItem('Rice', 'Pantry')]}
        extras={[
          makeExtra('extra-a', 'Coffee', true),
          makeExtra('extra-b', 'Coffee', false),
          makeExtra('extra-c', 'Tea', false),
          makeExtra('extra-d', 'Jam', true),
        ]}
      />
    );

    expect(pantryRows()).toEqual([
      { name: 'Coffee', checked: 'false' },
      { name: 'Tea', checked: 'false' },
      { name: 'Rice', checked: 'false' },
      { name: 'Coffee', checked: 'true' },
      { name: 'Jam', checked: 'true' },
      { name: 'Beans', checked: 'true' },
    ]);
    expect(within(screen.getByTestId('aisle-section-Pantry')).getByText('3/6 items')).toBeVisible();
  });

  it('moves one extra by identity on optimistic check, acknowledgement, and uncheck', async () => {
    let acknowledge!: (extra: ReturnType<typeof makeExtra>) => void;
    const pending = new Promise<ReturnType<typeof makeExtra>>((resolve) => {
      acknowledge = resolve;
    });
    const coffee = makeExtra('extra-a', 'Coffee', false);
    const tea = makeExtra('extra-b', 'Tea', false);
    useWeekStore.setState({ groceryExtras: [coffee, tea] });
    const View = () => (
      <GroceryList
        weekOffset={0}
        items={[makeItem('Rice', 'Pantry')]}
        extras={useWeekStore((state) => state.groceryExtras)}
      />
    );
    mockUpdateExtra.mockReturnValueOnce(pending);
    render(<View />);
    const coffeeRow = () => document.querySelector('[data-extra-id="extra-a"]')!;

    expect(pantryRows().map((row) => row.name)).toEqual(['Coffee', 'Tea', 'Rice']);
    fireEvent.click(within(coffeeRow() as HTMLElement).getByRole('checkbox'));
    expect(pantryRows().map((row) => row.name)).toEqual(['Tea', 'Rice', 'Coffee']);
    expect(coffeeRow().querySelector('[role="checkbox"]')).toHaveAttribute('aria-checked', 'true');
    await act(async () => acknowledge({ ...coffee, checked: true, version: 2 }));
    expect(pantryRows().map((row) => row.name)).toEqual(['Tea', 'Rice', 'Coffee']);

    mockUpdateExtra.mockResolvedValueOnce({ ...coffee, checked: false, version: 3 });
    fireEvent.click(within(coffeeRow() as HTMLElement).getByRole('checkbox'));
    expect(pantryRows().map((row) => row.name)).toEqual(['Coffee', 'Tea', 'Rice']);
    await waitFor(() => expect(mockUpdateExtra).toHaveBeenCalledTimes(2));
    expect(useWeekStore.getState().groceryExtras.map((extra) => extra.checked)).toEqual([
      false,
      false,
    ]);

    act(() =>
      useWeekStore.setState({ groceryExtras: [{ ...coffee, checked: true, version: 4 }, tea] })
    );
    expect(pantryRows().map((row) => row.name)).toEqual(['Tea', 'Rice', 'Coffee']);
  });

  it('restores an extra to its source-relative position after a rejected check', async () => {
    const coffee = makeExtra('extra-a', 'Coffee', false);
    const tea = makeExtra('extra-b', 'Tea', false);
    const sync = vi.fn().mockResolvedValue(undefined);
    useWeekStore.setState({ groceryExtras: [coffee, tea], sync });
    const View = () => (
      <GroceryList
        weekOffset={0}
        items={[makeItem('Rice', 'Pantry')]}
        extras={useWeekStore((state) => state.groceryExtras)}
      />
    );
    mockUpdateExtra.mockRejectedValueOnce(new Error('save failed'));
    render(<View />);

    fireEvent.click(
      within(document.querySelector('[data-extra-id="extra-a"]') as HTMLElement).getByRole(
        'checkbox'
      )
    );
    expect(pantryRows().map((row) => row.name)).toEqual(['Tea', 'Rice', 'Coffee']);
    await waitFor(() => expect(sync).toHaveBeenCalledOnce());
    expect(pantryRows().map((row) => row.name)).toEqual(['Coffee', 'Tea', 'Rice']);
    expect(screen.getAllByTestId('grocery-extra-row')).toHaveLength(2);
  });

  it('renders unchecked items before checked items while preserving order within each group', () => {
    seedChecks({ tomato: true, lettuce: false, carrot: true, cucumber: false });

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
    seedChecks({ tomato: false, lettuce: false, carrot: true });
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
  it('keeps duplicate rows rendered exactly once while toggling only the selected identity', async () => {
    const duplicateItems = [
      makeItem('Eau', 'Pantry', 'water-cup', { quantity: scalarQuantity(0.25), unitText: 'tasse' }),
      makeItem('Eau', 'Pantry', 'water-ml', { quantity: scalarQuantity(250), unitText: 'ml' }),
      makeItem('Eau', 'Pantry', 'water-litre', { quantity: scalarQuantity(0.25), unitText: 'L' }),
    ];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(<GroceryList weekOffset={0} items={duplicateItems} />);

    const rows = () => screen.getAllByTestId('grocery-item-checkbox');
    const labels = () => screen.getAllByTestId('grocery-item-label');
    const selected = () =>
      rows().find((row) => row.getAttribute('data-row-id') === duplicateItems[0].rowId)!;

    expect(rows()).toHaveLength(3);
    expect(labels()).toHaveLength(3);
    expect(screen.getByText('0/3 items')).toBeInTheDocument();

    fireEvent.click(selected());
    rerender(<GroceryList weekOffset={0} items={duplicateItems} />);

    expect(rows()).toHaveLength(3);
    expect(labels()).toHaveLength(3);
    expect(screen.getByText('1/3 items')).toBeInTheDocument();
    expect(rows().filter((row) => row.getAttribute('aria-checked') === 'true')).toHaveLength(1);

    fireEvent.click(selected());
    rerender(<GroceryList weekOffset={0} items={duplicateItems} />);

    expect(rows()).toHaveLength(3);
    expect(labels()).toHaveLength(3);
    expect(screen.getByText('0/3 items')).toBeInTheDocument();
    expect(rows().every((row) => row.getAttribute('aria-checked') === 'false')).toBe(true);

    fireEvent.click(selected());
    rerender(<GroceryList weekOffset={0} items={duplicateItems} />);

    expect(rows()).toHaveLength(3);
    expect(labels()).toHaveLength(3);
    expect(screen.getByText('1/3 items')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe('GroceryList — optimistic grocery state synchronization', () => {
  const items = [makeItem('Tomato', 'Produce'), makeItem('Lettuce', 'Produce')];
  const rowCount = () => screen.getAllByTestId('grocery-item-checkbox').length;

  it('preserves row cardinality and ordering after a successful optimistic toggle', async () => {
    seedChecks({ Tomato: false, Lettuce: false });
    const { rerender } = render(<GroceryList weekOffset={0} items={items} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Tomato/ }));
    rerender(<GroceryList weekOffset={0} items={items} />);

    await waitFor(() =>
      expect(mockToggleGroceryItem).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          rowId: fixtureGroceryId('Tomato'),
          checked: true,
          expectedRowVersion: '1',
        }),
        '2025-01-06'
      )
    );
    expect(rowCount()).toBe(2);
    expect(screen.getAllByTestId('grocery-item-label').map((label) => label.textContent)).toEqual([
      'Lettuce',
      'Tomato',
    ]);
    expect(screen.getByText('1/2 items')).toBeInTheDocument();
  });

  it('rolls back a failed optimistic toggle without changing row cardinality', async () => {
    seedChecks({ Tomato: false, Lettuce: false });
    mockToggleGroceryItem.mockRejectedValueOnce(new Error('Network error'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(<GroceryList weekOffset={0} items={items} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Tomato/ }));
    await waitFor(() => expect(mockGroceryState[fixtureGroceryId('Tomato')]).toBe(false));
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
      makeItem('Flour', 'Pantry', 'flour-grams', { quantity: scalarQuantity(200), unitText: 'g' }),
      makeItem('Flour', 'Pantry', 'flour-volume', {
        quantity: scalarQuantity(240),
        unitText: 'ml',
      }),
    ];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(<GroceryList weekOffset={0} items={duplicateItems} />);

    seedChecks(Object.fromEntries(duplicateItems.map((item) => [item.rowId!, true])));
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
      makeItem('Eau', 'Pantry', 'water-cup', { quantity: scalarQuantity(0.25), unitText: 'tasse' }),
      makeItem('Eau', 'Pantry', 'water-ml', { quantity: scalarQuantity(250), unitText: 'ml' }),
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
    seedChecks({ tomato: true, lettuce: false });

    renderList();

    // Percentage badge should be present (50%)
    expect(screen.getByText('50%')).toBeTruthy();

    // No checkmark icon for section completion
    expect(screen.queryByTestId('section-complete-icon')).toBeNull();
  });

  it('shows percentage badge when no items are checked', () => {
    seedChecks({ tomato: false, lettuce: false });

    renderList();

    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.queryByTestId('section-complete-icon')).toBeNull();
  });

  it('shows checkmark icon when all items in a section are checked', () => {
    // All items checked
    seedChecks({ tomato: true, lettuce: true });

    renderList();

    // CheckCircle2 icon should appear
    expect(screen.getByTestId('section-complete-icon')).toBeTruthy();

    // Percentage badge should NOT be present
    expect(screen.queryByText('100%')).toBeNull();
  });

  it('applies sage green header background when section is complete', () => {
    seedChecks({ tomato: true, lettuce: true });

    renderList();

    const header = screen.getByTestId('aisle-header-complete');
    expect(header.className).toContain('bg-sage/20');
  });

  it('applies gradient header background when section is not complete', () => {
    seedChecks({ tomato: true, lettuce: false });

    renderList();

    const header = screen.getByTestId('aisle-header-incomplete');
    expect(header.className).toContain('bg-gradient-to-r');
  });

  it('does not show completion state when section has zero items', () => {
    // No items → empty state, no section cards rendered
    seedChecks({});

    render(<GroceryList weekOffset={0} items={[]} />);

    expect(screen.queryByTestId('section-complete-icon')).toBeNull();
    expect(screen.queryByTestId('aisle-header-complete')).toBeNull();
  });
});

describe('GroceryList — collapsible sections', () => {
  it('keeps a section open when its final ingredient is checked', () => {
    seedChecks({ tomato: true, lettuce: false });
    const { rerender } = renderList();
    const header = screen.getByRole('button', { name: /Produce/ });

    expect(header).toHaveAttribute('aria-expanded', 'true');

    seedChecks({ tomato: true, lettuce: true });
    rerender(<GroceryList weekOffset={0} items={ITEMS} />);

    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('lettuce')).toBeVisible();
  });

  it('defaults completed sections to collapsed and re-collapses them when the app returns', () => {
    seedChecks({ tomato: true, lettuce: true });
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
            quantity: scalarQuantity(1500),
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

  it.each([null, '', '   '])(
    'shows a trusted scalar without inventing a blank unit (%j)',
    (unitText) => {
      render(
        <GroceryList
          weekOffset={0}
          items={[
            makeItem('Milk', 'Pantry', 'milk', {
              quantity: scalarQuantity(2),
              unitText,
            }),
          ]}
        />
      );
      expect(screen.getByTestId('grocery-item-quantity-hint')).toHaveTextContent(/^\(2\)$/);
    }
  );

  it.each([
    { quantity: scalarQuantity(0), expected: '(0)' },
    { quantity: scalarQuantity(0.5), expected: '(0.5)' },
    {
      quantity: { kind: 'range', min: { n: '2', d: '1' }, max: { n: '3', d: '1' } },
      expected: '(2–3)',
    },
  ])('shows trusted unitless $expected', ({ quantity, expected }) => {
    render(
      <GroceryList
        weekOffset={0}
        items={[
          makeItem('Milk', 'Pantry', 'milk', {
            quantity,
            unitText: null,
          }),
        ]}
      />
    );
    expect(screen.getByTestId('grocery-item-quantity-hint').textContent).toBe(expected);
  });

  it('preserves unit-bearing precision and hides genuinely missing or unreadable amounts', () => {
    render(
      <GroceryList
        weekOffset={0}
        items={[
          makeItem('Milk', 'Pantry', 'milk', { quantity: scalarQuantity(1.23456), unitText: 'kg' }),
          makeItem('Onion', 'Produce', 'onion', { quantity: null, unitText: null }),
          makeItem('Rice', 'Pantry', 'rice', {
            quantity: { kind: 'scalar', value: { n: '1', d: '0' } },
            unitText: '',
          }),
        ]}
      />
    );
    expect(screen.getAllByTestId('grocery-item-quantity-hint')).toHaveLength(1);
    expect(screen.getByTestId('grocery-item-quantity-hint').textContent).toBe('(1.235 kg)');
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
    seedChecks({ Tomato: true });
    vi.mocked(reclassifyIngredient).mockResolvedValue(undefined);
    renderStoreBacked([makeItem('Tomato', 'Produce', 'tomato')]);

    fireEvent.click(screen.getByTestId('reclassify-btn'));
    await act(async () => fireEvent.click(screen.getByTestId('section-option-Pantry')));

    expect(screen.getByTestId('grocery-item-checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('moves only the selected duplicate-display-name line without cloning either row', async () => {
    vi.mocked(reclassifyIngredient).mockResolvedValue(undefined);
    renderStoreBacked([
      makeItem('Flour', 'Produce', 'flour-grams', { quantity: scalarQuantity(200), unitText: 'g' }),
      makeItem('Flour', 'Produce', 'flour-volume', {
        quantity: scalarQuantity(240),
        unitText: 'ml',
      }),
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

describe('authoritative grocery entry freshness', () => {
  it.each(['updating', 'failed'] as const)(
    'reads persisted %s state when groceries open',
    async (status) => {
      const current = useWeekStore.getState();
      mockReadSchedule.mockResolvedValue({
        calendar: current.calendar,
        weekStartDate: current.weekStartDate,
        weekOffset: 0,
        status: 0,
        days: [],
        groceryItems: ITEMS,
        groceryState: {},
        groceryListVersion: '2',
        groceryRefresh: { status, version: 'remote' },
      });
      renderList();
      await waitFor(() => expect(mockReadSchedule).toHaveBeenCalledWith(0, '2025-01-06'));
      if (status === 'updating')
        expect(screen.getByTestId('grocery-portions-updating')).toBeInTheDocument();
      else expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    }
  );
});

describe('honest quantity completeness', () => {
  it('identifies a known subtotal and unresolved row without warning for to-taste content', () => {
    const partial = {
      ...makeItem('pasta', 'Pantry'),
      quantity: scalarQuantity(400),
      unitText: 'g',
      quantityComplete: false,
    };
    const unresolved = { ...makeItem('sauce', 'Pantry'), quantityComplete: false };
    const toTaste = { ...makeItem('salt to taste', 'Pantry'), quantityComplete: true };
    render(<GroceryList weekOffset={0} items={[partial, unresolved, toTaste]} />);
    expect(screen.getByText(/400 g known/i)).toBeVisible();
    expect(screen.queryByText(/Review amounts/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('grocery-amount-review')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('grocery-item-quantity-hint')).toHaveLength(1);
    expect(screen.getByText('salt to taste').parentElement).not.toHaveTextContent(/Review amounts/);
  });
});

it('offers affected recipe review outside the shopping checkbox', async () => {
  render(
    <GroceryList
      weekOffset={0}
      items={[
        {
          ...makeItem('pasta', 'Pantry'),
          quantityComplete: false,
          recipeIds: ['660e8400-e29b-41d4-a716-446655440013'] as any,
        },
      ]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
  expect(await screen.findByRole('link', { name: 'Recipe title unavailable' })).toHaveAttribute(
    'href',
    '/recipes?open=660e8400-e29b-41d4-a716-446655440013&reviewAmounts=true&sourceGroceryWeekOffset=0&sourceGroceryReferenceWeekStartDate=2025-01-06'
  );
  expect(mockToggleGroceryItem).not.toHaveBeenCalled();
});

describe('prior checked amount review', () => {
  it('keeps a complete current total truthful while reviewing an unknown prior check', async () => {
    const item = {
      ...makeItem('pasta', 'Pantry'),
      quantity: scalarQuantity(600),
      unitText: 'g',
      recipeIds: ['11111111-1111-4111-8111-111111111111'],
      quantityComplete: true,
      checkReviewReason: 'prior_amount_unknown',
    } as any;
    renderStoreBacked([
      item,
      {
        ...item,
        rowId: fixtureGroceryId('tomato'),
        displayName: 'tomato',
        normalizedKey: 'tomato',
      },
    ]);
    expect(screen.getAllByTestId('grocery-item-quantity-hint')[0]).toHaveTextContent('600');
    expect(screen.queryByTestId('grocery-check-review')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grocery-amount-review')).not.toBeInTheDocument();
    expect(screen.queryByText(/600.*known/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('grocery-portions-summary')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
    expect(await screen.findByRole('link', { name: 'Recipe title unavailable' })).toBeVisible();
  });
});

describe('recipe source titles', () => {
  const id = '660e8400-e29b-41d4-a716-446655440013';
  const sourceItem = (name = 'pasta') => ({
    ...makeItem(name, 'Pantry'),
    quantity: scalarQuantity(400),
    unitText: 'g',
    quantityComplete: true,
    recipeIds: [id, id] as any,
  });
  it('discloses loaded Planner titles without another recipe GET or a shopping mutation', () => {
    useWeekStore.setState({
      schedule: [{ date: '2025-01-08', recipe: { id, name: 'Family pasta' } }] as any,
    });
    render(<GroceryList weekOffset={0} items={[sourceItem()]} />);
    const control = screen.getByRole('button', { name: 'Source recipes for pasta' });
    expect(control).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(control);
    expect(screen.getAllByRole('link', { name: 'Family pasta' })).toHaveLength(1);
    expect(
      within(screen.getByTestId('grocery-recipe-sources-region')).getAllByRole('listitem')
    ).toHaveLength(1);
    expect(control).toHaveAttribute('aria-expanded', 'true');
    expect(mockGetSourceRecipe).not.toHaveBeenCalled();
    expect(mockToggleGroceryItem).not.toHaveBeenCalled();
  });
  it('deduplicates a missing lunch-only source across open ingredient rows', async () => {
    let finish!: (value: unknown) => void;
    mockGetSourceRecipe.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    render(<GroceryList weekOffset={0} items={[sourceItem(), sourceItem('sauce')]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
    await waitFor(() => expect(mockGetSourceRecipe).toHaveBeenCalledExactlyOnceWith(id));
    fireEvent.click(screen.getByRole('button', { name: 'Source recipes for sauce' }));
    await act(async () => finish({ id, name: 'Lunch pasta' }));
    expect(await screen.findByRole('link', { name: 'Lunch pasta' })).toHaveAttribute(
      'href',
      `/recipes?open=${id}&reviewAmounts=true&sourceGroceryWeekOffset=0&sourceGroceryReferenceWeekStartDate=2025-01-06`
    );
    expect(mockGetSourceRecipe).toHaveBeenCalledTimes(1);
    expect(mockToggleGroceryItem).not.toHaveBeenCalled();
  });
  it('ignores a late title after week departure and retries unavailable titles on deliberate reopen', async () => {
    let finish!: (value: unknown) => void;
    mockGetSourceRecipe
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      )
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValue({ id, name: 'Recovered title' });
    const view = render(<GroceryList weekOffset={0} items={[sourceItem()]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
    await waitFor(() => expect(mockGetSourceRecipe).toHaveBeenCalledTimes(1));
    view.rerender(<GroceryList weekOffset={1} items={[sourceItem()]} />);
    await act(async () => finish({ id, name: 'Old week title' }));
    expect(screen.queryByText('Old week title')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
    expect(await screen.findByRole('link', { name: 'Recipe title unavailable' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
    expect(await screen.findByRole('link', { name: 'Recovered title' })).toBeVisible();
  });
});

it('resolves new live grocery contributors and prefers a later loaded Planner name', async () => {
  const first = '660e8400-e29b-41d4-a716-446655440013';
  const second = '660e8400-e29b-41d4-a716-446655440016';
  mockGetSourceRecipe
    .mockResolvedValueOnce({ id: first, name: 'First source' })
    .mockResolvedValueOnce({ id: second, name: 'Added lunch' });
  const item = { ...makeItem('pasta', 'Pantry'), recipeIds: [first] } as any;
  const view = render(<GroceryList weekOffset={0} items={[item]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
  await screen.findByRole('link', { name: 'First source' });
  view.rerender(<GroceryList weekOffset={0} items={[{ ...item, recipeIds: [second] }]} />);
  await screen.findByRole('link', { name: 'Added lunch' });
  expect(screen.queryByText('First source')).not.toBeInTheDocument();
  act(() =>
    useWeekStore.setState({
      schedule: [{ date: '2025-01-08', recipe: { id: second, name: 'Renamed in Planner' } }] as any,
    })
  );
  expect(screen.getByRole('link', { name: 'Renamed in Planner' })).toBeVisible();
  expect(mockGetSourceRecipe).toHaveBeenCalledTimes(2);
});
it('retires pending contributor titles when the demo session resets', async () => {
  const { demoSession } = await import('@/lib/api/demo-session');
  const previous = { generation: demoSession.generation, resetRequired: demoSession.resetRequired };
  demoSession.generation = null;
  demoSession.resetRequired = false;
  const id = '660e8400-e29b-41d4-a716-446655440013';
  let finish!: (value: unknown) => void;
  mockGetSourceRecipe.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const view = render(
    <GroceryList
      weekOffset={0}
      items={[{ ...makeItem('pasta', 'Pantry'), recipeIds: [id] } as any]}
    />
  );
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
    await waitFor(() => expect(mockGetSourceRecipe).toHaveBeenCalledTimes(1));
    act(() => {
      demoSession.observe('one');
      demoSession.observe('two');
    });
    await act(async () => finish({ id, name: 'Retired household title' }));
    expect(screen.queryByText('Retired household title')).not.toBeInTheDocument();
    expect(mockGetSourceRecipe).toHaveBeenCalledTimes(1);
  } finally {
    view.unmount();
    Object.assign(demoSession, previous);
  }
});

it.each([false, true])(
  'retires a departed pending lookup when its old reply arrives after return: %s',
  async (lateReply) => {
    const first = '660e8400-e29b-41d4-a716-446655440013';
    const second = '660e8400-e29b-41d4-a716-446655440016';
    let finishOld!: (value: unknown) => void;
    mockGetSourceRecipe
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          })
      )
      .mockResolvedValueOnce({ id: second, name: 'Other lunch' })
      .mockResolvedValueOnce({ id: first, name: 'Current returning source' });
    const item = { ...makeItem('pasta', 'Pantry'), recipeIds: [first] } as any;
    const view = render(<GroceryList weekOffset={0} items={[item]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
    await waitFor(() => expect(mockGetSourceRecipe).toHaveBeenCalledTimes(1));
    view.rerender(<GroceryList weekOffset={0} items={[{ ...item, recipeIds: [second] }]} />);
    await screen.findByRole('link', { name: 'Other lunch' });
    if (!lateReply) await act(async () => finishOld({ id: first, name: 'Retired source title' }));
    expect(screen.queryByText('Retired source title')).not.toBeInTheDocument();
    view.rerender(<GroceryList weekOffset={0} items={[item]} />);
    expect(await screen.findByRole('link', { name: 'Current returning source' })).toBeVisible();
    expect(mockGetSourceRecipe).toHaveBeenCalledTimes(3);
    if (lateReply) await act(async () => finishOld({ id: first, name: 'Retired source title' }));
    expect(screen.getByRole('link', { name: 'Current returning source' })).toBeVisible();
    expect(screen.queryByText('Retired source title')).not.toBeInTheDocument();
  }
);

it.each([
  { id: '660e8400-e29b-41d4-a716-446655440013', name: '   ' },
  { id: '660e8400-e29b-41d4-a716-446655440016', name: 'Wrong recipe title' },
])('keeps an honest source fallback for unusable detail metadata: %j', async (recipe) => {
  const id = '660e8400-e29b-41d4-a716-446655440013';
  mockGetSourceRecipe.mockResolvedValue(recipe);
  render(
    <GroceryList
      weekOffset={0}
      items={[{ ...makeItem('pasta', 'Pantry'), recipeIds: [id] } as any]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Source recipes for pasta' }));
  expect(await screen.findByRole('link', { name: 'Recipe title unavailable' })).toHaveAttribute(
    'href',
    `/recipes?open=${id}&reviewAmounts=true&sourceGroceryWeekOffset=0&sourceGroceryReferenceWeekStartDate=2025-01-06`
  );
  expect(screen.queryByText('Wrong recipe title')).not.toBeInTheDocument();
  expect(mockGetSourceRecipe).toHaveBeenCalledTimes(1);
  expect(mockToggleGroceryItem).not.toHaveBeenCalled();
});

it('accepts a Retry acknowledgement after an equivalent same-week freshness reread', async () => {
  let finish!: () => void;
  mockRefreshServings.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    })
  );
  const freshness = {
    status: 'failed' as const,
    version: 'same-input',
    appliedVersion: 'previous',
    workflowId: '550e8400-e29b-41d4-a716-446655440001',
    resetSummaryVersion: null,
  };
  useWeekStore.setState({
    schedule: [{ date: '2025-01-06', day: 'Monday', status: 0 }] as any,
    groceryRefresh: freshness,
  });
  renderList();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  act(() => useWeekStore.setState({ groceryRefresh: { ...freshness } }));
  await act(async () => finish());
  expect(useWeekStore.getState().groceryRefresh?.status).toBe('updating');
  expect(mockRefreshServings).toHaveBeenCalledExactlyOnceWith('2025-01-06');
});

it('keeps a replacement workflow after an old Retry acknowledgement for the same input', async () => {
  let finish!: () => void;
  mockRefreshServings.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    })
  );
  const freshness = {
    status: 'failed' as const,
    version: 'same-input',
    appliedVersion: 'previous',
    workflowId: '550e8400-e29b-41d4-a716-446655440001',
    resetSummaryVersion: null,
  };
  useWeekStore.setState({
    schedule: [{ date: '2025-01-06', day: 'Monday', status: 0 }] as any,
    groceryRefresh: freshness,
  });
  renderList();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  const replacement = { ...freshness, workflowId: '550e8400-e29b-41d4-a716-446655440002' };
  act(() => useWeekStore.setState({ groceryRefresh: replacement }));
  await act(async () => finish());
  expect(useWeekStore.getState().groceryRefresh).toEqual(replacement);
});
