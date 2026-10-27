import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  const setWeekOffset = vi.fn();
  const setActiveTab = vi.fn();
  const setGroceryState = vi.fn();
  const setHasPendingCards = vi.fn();
  const weekInit = vi.fn().mockResolvedValue(undefined);
  const openVoting = vi.fn().mockResolvedValue(undefined);
  const lockWeek = vi.fn().mockResolvedValue(undefined);
  const getVotingLink = vi.fn().mockResolvedValue('http://example.com/discovery');
  const assignRecipe = vi.fn();
  const removeRecipe = vi.fn();
  const reorderLocally = vi.fn();
  const commitMove = vi.fn();
  const resolveOccupiedSlot = vi.fn();
  const addToast = vi.fn();
  const saveNonCookingDay = vi.fn();
  const getSchedule = vi.fn();
  const applySnapshot = vi.fn();
  const movePost = vi.fn();
  let weekState: any;
  let plannerState: any;
  let searchParams = '';
  let locale: 'en' | 'fr' = 'en';

  return {
    getLocale: () => locale,
    setLocale: (value: 'en' | 'fr') => {
      locale = value;
    },
    push,
    replace,
    setWeekOffset,
    setActiveTab,
    setGroceryState,
    setHasPendingCards,
    weekInit,
    openVoting,
    lockWeek,
    getVotingLink,
    assignRecipe,
    removeRecipe,
    reorderLocally,
    commitMove,
    resolveOccupiedSlot,
    addToast,
    saveNonCookingDay,
    getSchedule,
    applySnapshot,
    movePost,
    getWeekState: () => weekState,
    getPlannerState: () => plannerState,
    setWeekState: (value: any) => {
      weekState = value;
    },
    setPlannerState: (value: any) => {
      plannerState = value;
    },
    setSearchParams: (value: string) => {
      searchParams = value;
    },
    getSearchParams: () => searchParams,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.getSearchParams()),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/locales', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/locales')>();
  return {
    ...actual,
    t: (key: string, fallback: string) => actual.t(key, fallback, mocks.getLocale()),
    tWithVars: (key: string, fallback: string, vars: Record<string, string | number>) =>
      actual.tWithVars(key, fallback, vars, mocks.getLocale()),
    getLocale: mocks.getLocale,
  };
});

vi.mock('@/lib/utils', () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/lib/imageUtils', () => ({
  getTodayString: () => '2026-05-10',
  getImageUrl: (value: string) => value,
}));

vi.mock('@/lib/auth', () => ({
  getVotingLink: (...args: unknown[]) => mocks.getVotingLink(...args),
}));

vi.mock('@/store/plannerStore', () => ({
  usePlannerStore: Object.assign(() => mocks.getPlannerState(), {
    getState: () => mocks.getPlannerState(),
  }),
}));

vi.mock('@/store/weekStore', () => ({
  useWeekStore: Object.assign(
    (selector: (state: any) => unknown) => selector(mocks.getWeekState()),
    {
      getState: () => mocks.getWeekState(),
    }
  ),
}));

vi.mock('@/store/discoveryStore', () => ({
  useDiscoveryStore: () => ({ setHasPendingCards: mocks.setHasPendingCards }),
}));

vi.mock('@/store/uiStore', () => ({
  useUiStore: {
    getState: () => ({ addToast: mocks.addToast }),
  },
}));

vi.mock('@/lib/api/planner', () => ({
  lockSchedule: vi.fn().mockResolvedValue(undefined),
  referenceRequest: (reference: string) => ({
    queryParameters: { referenceWeekStartDate: reference },
  }),
  assignRecipeToDay: vi.fn().mockResolvedValue(undefined),
  openVoting: vi.fn().mockResolvedValue(undefined),
  saveNonCookingDay: (...args: unknown[]) => mocks.saveNonCookingDay(...args),
  getSchedule: (...args: unknown[]) => mocks.getSchedule(...args),
  removeRecipeFromDay: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      schedule: {
        move: { post: (...args: unknown[]) => mocks.movePost(...args) },
        day: {
          byDate: () => ({
            validate: { post: vi.fn().mockResolvedValue(undefined) },
          }),
        },
      },
    },
  },
}));

vi.mock('@/lib/planner/slotAssignment', () => ({
  resolveOccupiedSlot: (...args: unknown[]) => mocks.resolveOccupiedSlot(...args),
}));

vi.mock('@microsoft/kiota-abstractions', () => ({
  DateOnly: { parse: (value: string) => value },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/planner/PlanningPivotSheet', () => ({
  PlanningPivotSheet: ({
    isOpen,
    dayIndex,
    hasRecipe,
    onPlanLater,
    onQuickFind,
    onNoCooking,
    onClose,
  }: {
    isOpen: boolean;
    dayIndex: number;
    hasRecipe: boolean;
    onPlanLater?: () => void;
    onQuickFind: () => void;
    onNoCooking?: () => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div
        data-testid="mock-planning-pivot-sheet"
        data-day-index={dayIndex}
        data-has-recipe={hasRecipe ? 'true' : 'false'}
        data-has-plan-later={onPlanLater ? 'true' : 'false'}
        data-has-no-cooking={onNoCooking ? 'true' : 'false'}
      >
        <button onClick={onClose}>Close</button>
        {onPlanLater && (
          <button data-testid="mock-pivot-plan-later" onClick={onPlanLater}>
            Plan later
          </button>
        )}
        <button data-testid="mock-pivot-quick-find" onClick={onQuickFind}>
          Quick replace
        </button>
        {onNoCooking && (
          <button data-testid="mock-pivot-no-cooking" onClick={onNoCooking}>
            Other plans
          </button>
        )}
      </div>
    ) : null,
}));

vi.mock('@/components/planner/QuickFindModal', () => ({
  QuickFindModal: ({ onSelect }: { onSelect: (recipe: any) => void }) => (
    <button
      data-testid="mock-quick-find-select"
      onClick={() =>
        onSelect({
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Replacement recipe',
          image: '',
        })
      }
    >
      Select replacement
    </button>
  ),
}));

vi.mock('@/components/ui/SolarLoader', () => ({
  SolarLoader: () => null,
}));

vi.mock('@/components/planner/CooksMode', () => ({
  CooksMode: () => null,
}));

vi.mock('@/components/recipes/RecipeDetailSheet', () => ({
  RecipeDetailSheet: ({ recipeId, onClose }: { recipeId: string; onClose: () => void }) => (
    <div data-testid="mock-recipe-detail-sheet" data-recipe-id={recipeId}>
      <button data-testid="mock-recipe-detail-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('@/components/planner/GroceryList', () => ({
  GroceryList: () => null,
}));

vi.mock('@/components/home/SkipRecoveryDialog', () => ({
  SkipRecoveryDialog: ({
    onAction,
  }: {
    onAction: (action: 'tomorrow' | 'next_week' | 'drop') => void;
  }) => (
    <div>
      <button data-testid="mock-recovery-next-week" onClick={() => onAction('next_week')}>
        Save for Next Week
      </button>
      <button data-testid="mock-recovery-drop" onClick={() => onAction('drop')}>
        Drop
      </button>
      <button data-testid="mock-recovery-tomorrow" onClick={() => onAction('tomorrow')}>
        Move to Tomorrow
      </button>
    </div>
  ),
}));

import PlannerPage from './page';
import { useTodayStore } from '@/store/todayStore';
import { calendarTime, type CalendarContext } from '@/lib/deployment-calendar';
import { builders } from '@/testing/builders';

const ensureCalendar = vi.fn();
function setCalendar(today = '2026-05-13', lifetime = 60_000) {
  const monday = new Date(`${today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const calendar = builders.deploymentCalendar({
    today,
    capturedAtUtc: `${today}T12:00:00Z`,
    nextDayAtUtc: next.toISOString(),
    currentWeekStartDate: monday.toISOString().slice(0, 10),
    referenceWeekStartDate: '2026-05-11',
  });
  useTodayStore.setState({
    calendar,
    calendarAnchor: { receivedAtElapsed: calendarTime.elapsed(), expiresAfterMs: lifetime },
    calendarVersion: useTodayStore.getState().calendarVersion + 1,
  });
  return calendar;
}
beforeEach(() => {
  mocks.setLocale('en');
  ensureCalendar.mockReset().mockRejectedValue(new Error('Calendar unavailable'));
  useTodayStore.setState({
    calendar: { today: '2026-05-10' } as CalendarContext,
    calendarAnchor: null,
    ensureCalendar,
    assignRecipe: vi.fn(),
    applyServerUpdate: vi.fn(),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mockClipboardWriteText = vi.fn().mockResolvedValue(undefined);
const mockShare = vi.fn().mockResolvedValue(undefined);

function makeSchedule(sundayDate: string) {
  const sunday = new Date(`${sundayDate}T00:00:00.000Z`);
  const monday = new Date(sunday);
  monday.setUTCDate(sunday.getUTCDate() - 6);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return {
      _uiId: `day-${index}`,
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
      date: date.toISOString().slice(0, 10),
      status: 0,
      recipe:
        index === 0
          ? {
              id: '11111111-1111-1111-1111-111111111111',
              name: 'Pasta Carbonara',
              image: '',
            }
          : undefined,
    };
  });
}

function makeAssignedSchedule(sundayDate: string, assignedDayIndex: number) {
  return makeSchedule(sundayDate).map((day, index) => ({
    ...day,
    recipe:
      index === assignedDayIndex
        ? {
            id: '11111111-1111-1111-1111-111111111111',
            name: index === 0 ? 'Pasta Carbonara' : 'Homemade Lasagna',
            image: '',
          }
        : undefined,
  }));
}

function renderPlanner(status: 0 | 1 | 2, sundayDate = '2026-05-17', offset = 0) {
  mocks.setPlannerState({
    currentWeekOffset: offset,
    activeTab: 'planner',
    setWeekOffset: mocks.setWeekOffset,
    setActiveTab: mocks.setActiveTab,
    setGroceryState: mocks.setGroceryState,
  });
  mocks.setWeekState({
    weekOffset: offset,
    calendar: offset ? { referenceWeekStartDate: '2026-10-12' } : undefined,
    applySnapshot: mocks.applySnapshot,
    schedule: makeSchedule(sundayDate),
    isLoading: false,
    status,
    groceryItems: [],
    init: mocks.weekInit,
    openVoting: mocks.openVoting,
    lockWeek: mocks.lockWeek,
    assignRecipe: mocks.assignRecipe,
    removeRecipe: mocks.removeRecipe,
    reorderLocally: mocks.reorderLocally,
    commitMove: mocks.commitMove,
  });

  return render(<PlannerPage />);
}

describe('PlannerPage voting action row', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setSearchParams('');
    mocks.setLocale('en');
    mocks.getVotingLink.mockResolvedValue('http://example.com/discovery');
    mocks.assignRecipe.mockResolvedValue(undefined);
    mocks.resolveOccupiedSlot.mockResolvedValue(undefined);
    mocks.saveNonCookingDay.mockResolvedValue(undefined);
    mocks.getSchedule.mockResolvedValue({
      weekOffset: 0,
      status: 0,
      locked: false,
      days: makeSchedule('2026-05-17'),
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mockClipboardWriteText },
    });

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: mockShare,
    });
  });

  it.each([
    ['en', '2026-05-10', 'May 4 — 10', 'Mon', 'May'],
    ['fr', '2026-05-10', '4 — 10 mai', 'lun.', 'mai'],
    ['en', '2026-06-07', 'Jun 1 — 7', 'Mon', 'Jun'],
    ['fr', '2026-05-03', '27 avr. — 3 mai', 'lun.', 'avr.'],
  ] as const)('localizes planner dates in %s for %s', (locale, sunday, range, weekday, month) => {
    mocks.setLocale(locale);
    renderPlanner(0, sunday);
    expect(screen.getByRole('heading', { name: range })).toBeInTheDocument();
    const date = within(screen.getByTestId('day-card-0')).getByTestId('planner-date');
    expect(within(date).getByText(weekday)).toBeInTheDocument();
    expect(within(date).getByText(month)).toBeInTheDocument();
  });

  it.each(['en', 'fr'] as const)('uses localized readable planner labels in %s', (locale) => {
    mocks.setLocale(locale);
    renderPlanner(0);
    expect(screen.getByTestId('week-range')).toHaveTextContent(
      locale === 'fr' ? 'Cette semaine' : 'This week'
    );
    for (const action of screen.getAllByTestId('plan-meal-button')) {
      expect(action).toHaveAccessibleName(locale === 'fr' ? 'Planifier le souper' : 'Plan supper');
    }
  });

  it.each([-3, -1, 1, 3])('points the return control toward this week from offset %s', (offset) => {
    mocks.setSearchParams(`weekOffset=${offset}&view=family`);
    renderPlanner(0, '2026-05-17', offset);
    const button = screen.getByTestId('planner-this-week-pill');
    expect(button).toHaveAccessibleName('Back to this week');
    expect(button).toHaveAttribute('title', 'Back to this week');
    const arrow = button.querySelector('svg')!;
    expect(arrow).toHaveClass(offset < 0 ? 'lucide-chevron-right' : 'lucide-chevron-left');
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
    expect(offset < 0 ? button.lastChild : button.firstChild).toBe(arrow);
    expect(button.textContent).toBe('Back to this week');
    fireEvent.click(button);
    expect(mocks.replace).toHaveBeenCalledWith('/planner?view=family');
  });

  it('follows the selected offset while retaining loaded dates, and hides at zero', () => {
    mocks.setSearchParams('weekOffset=1');
    const view = renderPlanner(0, '2026-05-17', 1);
    const retainedSchedule = mocks.getWeekState().schedule;
    expect(screen.getByTestId('planner-this-week-pill').firstChild).toHaveClass(
      'lucide-chevron-left'
    );
    mocks.setSearchParams('weekOffset=-2');
    mocks.setPlannerState({ ...mocks.getPlannerState(), currentWeekOffset: -2 });
    view.rerender(<PlannerPage />);
    expect(mocks.getWeekState().schedule).toBe(retainedSchedule);
    expect(screen.getByTestId('planner-this-week-pill').lastChild).toHaveClass(
      'lucide-chevron-right'
    );
    mocks.setSearchParams('');
    mocks.setPlannerState({ ...mocks.getPlannerState(), currentWeekOffset: 0 });
    view.rerender(<PlannerPage />);
    expect(screen.queryByTestId('planner-this-week-pill')).not.toBeInTheDocument();
  });

  it('shows Ask the Family for a draft non-past week', () => {
    renderPlanner(0);

    expect(screen.getByTestId('ask-family-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('planned-count-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nudge-family-cta')).not.toBeInTheDocument();
  });

  it('keeps fixed dates outside recipe surfaces and gives empty/non-cooking slots no handle', () => {
    const view = renderPlanner(0);
    const state = mocks.getWeekState();
    state.schedule[2] = { ...state.schedule[2], status: 3, nonCooking: { kind: 'order_in' } };
    view.rerender(<PlannerPage />);
    const row = screen.getByTestId('day-card-0');
    const date = within(row).getByTestId('planner-date');
    const content = within(row).getByTestId('planner-meal');
    expect(content).not.toContainElement(date);
    expect(within(content).getByTestId('planner-drag-handle')).toBeVisible();
    expect(
      within(screen.getByTestId('day-card-1')).queryByTestId('planner-drag-handle')
    ).toBeNull();
    expect(
      within(screen.getByTestId('day-card-2')).queryByTestId('planner-drag-handle')
    ).toBeNull();
  });

  it('renders seven empty days without a weekly progress indicator', () => {
    const view = renderPlanner(0);
    const state = mocks.getWeekState();
    mocks.setWeekState({
      ...state,
      schedule: state.schedule.map((day: any) => ({ ...day, recipe: undefined })),
    });
    view.rerender(<PlannerPage />);
    expect(screen.getAllByTestId('plan-meal-button')).toHaveLength(7);
    expect(screen.queryByTestId('planned-count-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('ask-family-cta')).toBeInTheDocument();
  });

  it('does not offer the empty-day conversion on a legacy recipe-backed skipped day', () => {
    const view = renderPlanner(0);
    const state = mocks.getWeekState();
    state.schedule[0] = {
      ...state.schedule[0],
      status: 3,
      recipe: { id: '11111111-1111-1111-1111-111111111111', name: 'Pasta' },
    };
    view.rerender(<PlannerPage />);
    fireEvent.click(within(screen.getByTestId('day-card-0')).getByTestId('ordered-in-indicator'));
    expect(screen.getByTestId('mock-planning-pivot-sheet')).toHaveAttribute(
      'data-has-no-cooking',
      'false'
    );
  });

  it.each([0, 1, 2] as const)('allows the empty-day action in week state %s', (status) => {
    renderPlanner(status);
    fireEvent.click(within(screen.getByTestId('day-card-1')).getByTestId('plan-meal-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-no-cooking'));
    expect(screen.getByTestId('non-cooking-sheet')).toHaveTextContent('Tuesday, May 12');
  });

  it.each(['order_in', 'eating_out', 'mystery', 'custom'] as const)(
    'renders the saved %s icon on the meal plan',
    (kind) => {
      const view = renderPlanner(0);
      const state = mocks.getWeekState();
      state.schedule[1] = {
        ...state.schedule[1],
        recipe: null,
        status: 3,
        nonCooking: { kind, customLabel: kind === 'custom' ? 'Family supper' : null },
      };
      mocks.setWeekState({ ...state, schedule: [...state.schedule] });
      view.rerender(<PlannerPage />);
      const indicator = within(screen.getByTestId('day-card-1')).getByTestId(
        'ordered-in-indicator'
      );
      const iconClass =
        kind === 'custom'
          ? 'lucide-calendar-days'
          : kind === 'eating_out'
            ? 'lucide-utensils-crossed'
            : kind === 'mystery'
              ? 'lucide-sparkles'
              : 'lucide-shopping-bag';
      expect(indicator.querySelector(`.${iconClass}`)).not.toBeNull();
      expect(indicator).not.toHaveTextContent('🥡');
      expect(screen.queryByTestId('planned-count-badge')).not.toBeInTheDocument();
      if (kind === 'mystery') {
        expect(indicator).toHaveTextContent('We’ll figure out supper that day.');
        expect(indicator).not.toHaveTextContent('No cook tonight');
      } else {
        expect(indicator).not.toHaveTextContent('No cook tonight');
        expect(indicator).not.toHaveTextContent('We’ll figure out supper that day.');
      }
    }
  );

  it.each(['order_in', 'eating_out'] as const)(
    'shows the %s note beneath its preset heading',
    (kind) => {
      const view = renderPlanner(0);
      const state = mocks.getWeekState();
      state.schedule[1] = {
        ...state.schedule[1],
        recipe: null,
        status: 3,
        nonCooking: { kind, customLabel: 'Try Luigi’s' },
      };
      mocks.setWeekState({ ...state, schedule: [...state.schedule] });
      view.rerender(<PlannerPage />);
      const day = within(screen.getByTestId('day-card-1'));
      expect(day.getByTestId('non-cooking-indicator')).toHaveTextContent(
        kind === 'order_in' ? 'Order In' : 'Eating out'
      );
      expect(day.getByTestId('non-cooking-note')).toHaveTextContent('Try Luigi’s');
      expect(day.getByTestId('ordered-in-indicator')).not.toHaveTextContent('No cook tonight');
    }
  );

  it('opens the change menu from Home once and can edit the saved plan', async () => {
    mocks.setSearchParams('weekOffset=0&planDate=2026-05-12');
    const view = renderPlanner(0);
    const state = mocks.getWeekState();
    state.schedule[1] = {
      ...state.schedule[1],
      recipe: null,
      status: 3,
      nonCooking: { kind: 'custom', customLabel: 'Supper at Grandma’s' },
    };
    mocks.setWeekState({ ...state, schedule: [...state.schedule] });
    view.rerender(<PlannerPage />);
    const pivot = await screen.findByTestId('mock-planning-pivot-sheet');
    expect(pivot).toHaveAttribute('data-day-index', '1');
    expect(screen.queryByTestId('non-cooking-sheet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mock-pivot-no-cooking'));
    expect(screen.getByTestId('non-cooking-custom-label')).toHaveValue('Supper at Grandma’s');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    view.rerender(<PlannerPage />);
    expect(screen.queryByTestId('non-cooking-sheet')).not.toBeInTheDocument();
    expect(mocks.saveNonCookingDay).not.toHaveBeenCalled();
  });

  it('does not apply a late save response to the newly selected week', async () => {
    let resolveSave!: () => void;
    mocks.saveNonCookingDay.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    const view = renderPlanner(0);
    fireEvent.click(within(screen.getByTestId('day-card-1')).getByTestId('plan-meal-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-no-cooking'));
    fireEvent.click(screen.getByTestId('non-cooking-save'));
    await waitFor(() =>
      expect(mocks.saveNonCookingDay).toHaveBeenCalledWith('2026-05-12', {
        kind: 'mystery',
        customLabel: null,
      })
    );
    mocks.setPlannerState({ ...mocks.getPlannerState(), currentWeekOffset: 1 });
    mocks.setWeekState({
      ...mocks.getWeekState(),
      weekOffset: 1,
      schedule: makeSchedule('2026-05-24'),
    });
    view.rerender(<PlannerPage />);
    await act(async () => resolveSave());
    await waitFor(() => expect(mocks.getSchedule).toHaveBeenCalledWith(0, undefined));
    expect(mocks.applySnapshot).not.toHaveBeenCalled();
  });

  it('refreshes a conflicting recipe assignment and retains the editable custom draft', async () => {
    const refreshed = {
      weekOffset: 0,
      status: 0,
      locked: false,
      days: makeAssignedSchedule('2026-05-17', 1),
    };
    mocks.getSchedule.mockResolvedValue(refreshed);
    mocks.saveNonCookingDay.mockRejectedValue({ responseStatusCode: 409 });
    renderPlanner(0);
    fireEvent.click(within(screen.getByTestId('day-card-1')).getByTestId('plan-meal-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-no-cooking'));
    fireEvent.click(screen.getByTestId('non-cooking-other-plans'));
    fireEvent.change(screen.getByTestId('non-cooking-custom-label'), {
      target: { value: 'Birthday' },
    });
    fireEvent.click(screen.getByTestId('non-cooking-save'));
    await waitFor(() => expect(mocks.applySnapshot).toHaveBeenCalledWith(refreshed));
    expect(screen.getByTestId('non-cooking-custom-label')).toHaveValue('Birthday');
    expect(screen.getByRole('alert')).toHaveTextContent('plan changed');
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
    expect(mocks.removeRecipe).not.toHaveBeenCalled();
  });

  it('shows Ask the Family for a locked non-past week', () => {
    renderPlanner(2);

    expect(screen.getByTestId('ask-family-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('planned-count-badge')).not.toBeInTheDocument();
  });

  it('shows live voting controls for a voting-open week', () => {
    renderPlanner(1);

    expect(screen.queryByTestId('ask-family-cta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('voting-status-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('close-voting-btn')).toBeInTheDocument();
    expect(screen.getByTestId('nudge-family-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('planned-count-badge')).not.toBeInTheDocument();

    const actionRow = screen.getByTestId('planner-action-row');
    expect(within(actionRow).getAllByRole('button')[0]).toBe(
      screen.getByTestId('nudge-family-cta')
    );
  });

  it('hides Ask the Family for past draft and locked weeks', () => {
    const { unmount } = renderPlanner(0, '2026-05-03');
    expect(screen.queryByTestId('ask-family-cta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('planner-action-row')).not.toBeInTheDocument();

    unmount();
    renderPlanner(2, '2026-05-03');
    expect(screen.queryByTestId('ask-family-cta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('planner-action-row')).not.toBeInTheDocument();
  });

  it('copies and shares the generated nudge link', async () => {
    renderPlanner(1);

    fireEvent.click(screen.getByTestId('nudge-family-cta'));

    expect(screen.getByTestId('planner-nudge-dialog')).toBeInTheDocument();
    await screen.findByText('http://example.com/discovery');

    fireEvent.click(screen.getByTestId('planner-nudge-copy'));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith('http://example.com/discovery');
    });
    expect(screen.getByTestId('planner-nudge-copied-feedback')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('planner-nudge-share'));

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'http://example.com/discovery' })
      );
    });
  });

  it('hydrates week offset from URL query on load', async () => {
    mocks.setSearchParams('weekOffset=1');
    renderPlanner(0);

    await waitFor(() => {
      expect(mocks.setWeekOffset).toHaveBeenCalledWith(1);
    });
  });

  it('shows recipe details sheet when clicking the recipe name', () => {
    mocks.setPlannerState({
      currentWeekOffset: 0,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      schedule: makeAssignedSchedule('2026-05-10', 0),
      isLoading: false,
      status: 0,
      groceryItems: [],
      init: mocks.weekInit,
      openVoting: mocks.openVoting,
      lockWeek: mocks.lockWeek,
      assignRecipe: mocks.assignRecipe,
      removeRecipe: mocks.removeRecipe,
      reorderLocally: mocks.reorderLocally,
    });

    render(<PlannerPage />);

    const card = screen.getByTestId('day-card-0');
    const nameBtn = within(card).getByTestId('edit-recipe-button');
    fireEvent.click(nameBtn);

    const detailSheet = screen.getByTestId('mock-recipe-detail-sheet');
    expect(detailSheet).toBeInTheDocument();
    expect(detailSheet.getAttribute('data-recipe-id')).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('shows planning pivot sheet when clicking the change recipe button', () => {
    mocks.setPlannerState({
      currentWeekOffset: 0,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      schedule: makeAssignedSchedule('2026-05-10', 0),
      isLoading: false,
      status: 0,
      groceryItems: [],
      init: mocks.weekInit,
      openVoting: mocks.openVoting,
      lockWeek: mocks.lockWeek,
      assignRecipe: mocks.assignRecipe,
      removeRecipe: mocks.removeRecipe,
      reorderLocally: mocks.reorderLocally,
    });

    render(<PlannerPage />);

    const card = screen.getByTestId('day-card-0');
    const changeBtn = within(card).getByTestId('change-recipe-button');
    fireEvent.click(changeBtn);

    const pivotSheet = screen.getByTestId('mock-planning-pivot-sheet');
    expect(pivotSheet).toBeInTheDocument();
    expect(pivotSheet.getAttribute('data-day-index')).toBe('0');
  });

  it('hides the change recipe button for a pending family suggestion', () => {
    const schedule = makeAssignedSchedule('2026-05-10', 0) as any[];
    schedule[0]._isPending = true;

    mocks.setPlannerState({
      currentWeekOffset: 0,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      schedule,
      isLoading: false,
      status: 1,
      groceryItems: [],
      init: mocks.weekInit,
      openVoting: mocks.openVoting,
      lockWeek: mocks.lockWeek,
      assignRecipe: mocks.assignRecipe,
      removeRecipe: mocks.removeRecipe,
      reorderLocally: mocks.reorderLocally,
    });

    render(<PlannerPage />);

    const card = screen.getByTestId('day-card-0');
    expect(card).toHaveTextContent('Pasta Carbonara');
    expect(screen.queryByTestId('planned-count-badge')).not.toBeInTheDocument();
    expect(within(card).queryByTestId('change-recipe-button')).not.toBeInTheDocument();
    expect(within(card).getByTestId('edit-recipe-button')).toBeInTheDocument();
  });

  it('does not render start-cook-mode or view-recipe-button on the cards', () => {
    mocks.setPlannerState({
      currentWeekOffset: 0,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      schedule: makeAssignedSchedule('2026-05-10', 0),
      isLoading: false,
      status: 0,
      groceryItems: [],
      init: mocks.weekInit,
      openVoting: mocks.openVoting,
      lockWeek: mocks.lockWeek,
      assignRecipe: mocks.assignRecipe,
      removeRecipe: mocks.removeRecipe,
      reorderLocally: mocks.reorderLocally,
    });

    render(<PlannerPage />);

    expect(screen.queryByTestId('view-recipe-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('start-cook-mode')).not.toBeInTheDocument();
  });

  it('shows pivot sheet for Ordered In days with remove recipe visible but plan later disabled', () => {
    const schedule = makeAssignedSchedule('2026-05-10', 0) as any[];
    schedule[0].status = 3;
    schedule[0].recipe = null;

    mocks.setPlannerState({
      currentWeekOffset: 0,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      schedule,
      isLoading: false,
      status: 0,
      groceryItems: [],
      init: mocks.weekInit,
      openVoting: mocks.openVoting,
      lockWeek: mocks.lockWeek,
      assignRecipe: mocks.assignRecipe,
      removeRecipe: mocks.removeRecipe,
      reorderLocally: mocks.reorderLocally,
    });

    render(<PlannerPage />);

    const card = screen.getByTestId('day-card-0');
    const orderedInBtn = within(card).getByTestId('ordered-in-indicator');
    fireEvent.click(orderedInBtn);

    const pivotSheet = screen.getByTestId('mock-planning-pivot-sheet');
    expect(pivotSheet).toBeInTheDocument();
    expect(pivotSheet.getAttribute('data-has-recipe')).toBe('true');
    expect(pivotSheet.getAttribute('data-has-plan-later')).toBe('false');
  });
});

describe('Planner keyboard movement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setSearchParams('');
  });

  it('moves an eligible meal one slot through the existing optimistic commit path', () => {
    renderPlanner(0);
    const handle = within(screen.getByTestId('day-card-0')).getByTestId('planner-drag-handle');
    const snapshot = mocks.getWeekState().schedule;

    fireEvent.keyDown(handle, { key: 'ArrowDown' });

    expect(mocks.reorderLocally).toHaveBeenCalledWith(0, 1, snapshot);
    expect(mocks.commitMove).toHaveBeenCalledWith(0, 1, snapshot);
  });

  it('does not submit a keyboard move beyond the week boundary', () => {
    renderPlanner(0);
    const handle = within(screen.getByTestId('day-card-0')).getByTestId('planner-drag-handle');

    fireEvent.keyDown(handle, { key: 'ArrowUp' });

    expect(mocks.reorderLocally).not.toHaveBeenCalled();
    expect(mocks.commitMove).not.toHaveBeenCalled();
  });
});

describe('PlannerPage quick replacement recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assignRecipe.mockResolvedValue(undefined);
    mocks.resolveOccupiedSlot.mockResolvedValue(undefined);
  });

  it('captures future-week recovery and awaits defer before assigning the exact source slot', async () => {
    mocks.setSearchParams('weekOffset=1');
    let completeDefer!: () => void;
    mocks.resolveOccupiedSlot.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completeDefer = resolve;
        })
    );
    renderPlanner(0, '2026-10-25', 1);
    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-next-week'));
    await waitFor(() =>
      expect(mocks.resolveOccupiedSlot).toHaveBeenCalledWith(
        expect.objectContaining({
          weekOffset: 1,
          referenceWeekStartDate: '2026-10-12',
          date: '2026-10-19',
          dayIndex: 0,
        }),
        'next_week',
        true
      )
    );
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
    await act(async () => completeDefer());
    await waitFor(() =>
      expect(mocks.assignRecipe).toHaveBeenCalledWith(
        0,
        expect.anything(),
        expect.objectContaining({
          weekOffset: 1,
          referenceWeekStartDate: '2026-10-12',
          date: '2026-10-19',
        })
      )
    );
    mocks.setSearchParams('');
  });

  it('keeps Quick Find open, shows an error, and reconciles when an empty-slot assignment fails', async () => {
    mocks.assignRecipe.mockRejectedValue(new Error('assignment failed'));
    renderPlanner(0);
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeAssignment = mocks.weekInit.mock.calls.length;

    fireEvent.click(within(screen.getByTestId('day-card-1')).getByTestId('plan-meal-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));

    await waitFor(() => {
      expect(mocks.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('could not be added'),
        })
      );
    });
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeAssignment + 1);
    expect(screen.getByTestId('mock-quick-find-select')).toBeInTheDocument();
  });

  it('keeps recovery open, shows an error, and reconciles when moving the current recipe fails', async () => {
    mocks.resolveOccupiedSlot.mockRejectedValue(new Error('move failed'));
    renderPlanner(0);
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeRecovery = mocks.weekInit.mock.calls.length;

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-tomorrow'));

    await waitFor(() => {
      expect(mocks.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('could not be moved'),
        })
      );
    });
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeRecovery + 1);
    expect(screen.getByTestId('mock-recovery-tomorrow')).toBeInTheDocument();
  });

  it('reconciles after a successful move when replacement assignment fails and keeps recovery open', async () => {
    mocks.assignRecipe.mockRejectedValue(new Error('assignment failed'));
    renderPlanner(0);
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeRecovery = mocks.weekInit.mock.calls.length;

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-tomorrow'));

    await waitFor(() => {
      expect(mocks.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('could not be added'),
        })
      );
    });
    expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1);
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeRecovery + 1);
    expect(screen.getByTestId('mock-recovery-tomorrow')).toBeInTheDocument();

    mocks.assignRecipe.mockResolvedValue(undefined);
    fireEvent.click(screen.getByTestId('mock-recovery-tomorrow'));
    await waitFor(() => expect(mocks.assignRecipe).toHaveBeenCalledTimes(2));
    expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1);
  });

  it('submits an occupied-slot recovery action only once while it is in flight', async () => {
    let completeMove!: () => void;
    mocks.resolveOccupiedSlot.mockImplementation(
      () => new Promise<void>((resolve) => (completeMove = resolve))
    );
    renderPlanner(0);

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    const recoveryAction = await screen.findByTestId('mock-recovery-tomorrow');
    fireEvent.click(recoveryAction);
    fireEvent.click(recoveryAction);

    await waitFor(() => expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1));
    await act(async () => completeMove());
    await waitFor(() => expect(mocks.assignRecipe).toHaveBeenCalledTimes(1));
  });

  it('next-week: keeps recovery open, shows an error, and reconciles when moving the current recipe fails', async () => {
    mocks.resolveOccupiedSlot.mockRejectedValue(new Error('move failed'));
    renderPlanner(0);
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeRecovery = mocks.weekInit.mock.calls.length;

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-next-week'));

    await waitFor(() => {
      expect(mocks.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('could not be moved'),
        })
      );
    });
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeRecovery + 1);
    expect(screen.getByTestId('mock-recovery-next-week')).toBeInTheDocument();
  });

  it('next-week: reconciles after a successful move when replacement assignment fails and keeps recovery open', async () => {
    mocks.assignRecipe.mockRejectedValue(new Error('assignment failed'));
    renderPlanner(0);
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeRecovery = mocks.weekInit.mock.calls.length;

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-next-week'));

    await waitFor(() => {
      expect(mocks.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('could not be added'),
        })
      );
    });
    expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1);
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeRecovery + 1);
    expect(screen.getByTestId('mock-recovery-next-week')).toBeInTheDocument();

    mocks.assignRecipe.mockResolvedValue(undefined);
    fireEvent.click(screen.getByTestId('mock-recovery-next-week'));
    await waitFor(() => expect(mocks.assignRecipe).toHaveBeenCalledTimes(2));
    expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1);
  });

  it('next-week: submits an occupied-slot recovery action only once while it is in flight', async () => {
    let completeMove!: () => void;
    mocks.resolveOccupiedSlot.mockImplementation(
      () => new Promise<void>((resolve) => (completeMove = resolve))
    );
    renderPlanner(0);

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    const recoveryAction = await screen.findByTestId('mock-recovery-next-week');
    fireEvent.click(recoveryAction);
    fireEvent.click(recoveryAction);

    await waitFor(() => expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1));
    await act(async () => completeMove());
    await waitFor(() => expect(mocks.assignRecipe).toHaveBeenCalledTimes(1));
  });

  it('waits for the replacement assignment before refreshing the week', async () => {
    renderPlanner(0);
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeRecovery = mocks.weekInit.mock.calls.length;

    let completeAssignment!: () => void;
    mocks.assignRecipe.mockImplementation(
      () => new Promise<void>((resolve) => (completeAssignment = resolve))
    );

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    await screen.findByTestId('mock-quick-find-select');
    fireEvent.click(screen.getByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-tomorrow'));

    await waitFor(() => expect(mocks.assignRecipe).toHaveBeenCalledTimes(1));
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeRecovery);

    await act(async () => completeAssignment());
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeRecovery + 1));
  });
});

describe('Planner Plan later completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setSearchParams('');
  });

  it('warns about incomplete refresh after a committed move and sends movement only once', async () => {
    mocks.movePost.mockResolvedValue({ data: { moved: true, refreshComplete: false } });
    mocks.setPlannerState({
      currentWeekOffset: 1,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      calendar: { referenceWeekStartDate: '2026-05-04' },
      schedule: makeAssignedSchedule('2026-05-17', 0),
      isLoading: false,
      status: 0,
      groceryItems: [],
      init: mocks.weekInit,
    });
    render(<PlannerPage />);
    fireEvent.click(within(screen.getByTestId('day-card-0')).getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-plan-later'));
    await waitFor(() =>
      expect(mocks.addToast).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Meal moved. Some updates could not refresh. Refresh your plan to check it.',
      })
    );
    expect(mocks.movePost).toHaveBeenCalledTimes(1);
    expect(mocks.movePost).toHaveBeenCalledWith(
      expect.objectContaining({ weekOffset: 1, targetWeekOffset: 2, intent: 'push' }),
      expect.anything()
    );
    expect(mocks.weekInit).toHaveBeenCalled();
  });
});

describe('Planner day emphasis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setSearchParams('');
  });

  it.each(['empty', 'recipe', 'pending', 'non-cooking', 'cooked'])(
    'identifies the fixed Today date with %s content',
    (content) => {
      setCalendar();
      const view = renderPlanner(0);
      const schedule = mocks.getWeekState().schedule;
      schedule[2] = {
        ...schedule[2],
        recipe:
          content === 'recipe' || content === 'pending' || content === 'cooked'
            ? { id: '11111111-1111-1111-1111-111111111111', name: 'Wednesday supper' }
            : null,
        _isPending: content === 'pending',
        status: content === 'cooked' ? 2 : content === 'non-cooking' ? 3 : 0,
        nonCooking: content === 'non-cooking' ? { kind: 'order_in' } : null,
      };
      view.rerender(<PlannerPage />);
      const row = screen.getByTestId('day-card-2');
      expect(within(row).getByTestId('planner-date')).toHaveAttribute('aria-current', 'date');
      const today = within(row).getByText('Today');
      expect(within(row).getByTestId('planner-meal')).not.toContainElement(today);
      expect(screen.getAllByText('Today')).toHaveLength(1);
      expect(screen.getByTestId('planner-today-separator')).toHaveAttribute('aria-hidden', 'true');
      expect(ensureCalendar).not.toHaveBeenCalled();
      expect(mocks.assignRecipe).not.toHaveBeenCalled();
    }
  );

  it('localizes Today and leaves past uncooked actions usable', () => {
    mocks.setLocale('fr');
    setCalendar();
    renderPlanner(0);
    expect(screen.getByText('Aujourd’hui')).toBeVisible();
    const monday = screen.getByTestId('day-card-0');
    expect(monday).toHaveAttribute('data-temporal', 'past');
    expect(monday).toHaveTextContent('Pasta Carbonara');
    expect(within(monday).getByTestId('planner-drag-handle')).toBeEnabled();
    const tuesday = screen.getByTestId('day-card-1');
    fireEvent.click(within(tuesday).getByTestId('plan-meal-button'));
    expect(screen.getByTestId('mock-planning-pivot-sheet')).toBeVisible();
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
  });

  it.each(['absent', 'invalid', 'expired'])(
    'keeps %s context neutral without a guessed date',
    (kind) => {
      setCalendar();
      if (kind === 'absent') useTodayStore.setState({ calendar: null, calendarAnchor: null });
      if (kind === 'invalid')
        useTodayStore.setState({
          calendar: { ...useTodayStore.getState().calendar!, today: '2026-02-30' },
        });
      if (kind === 'expired')
        useTodayStore.setState({
          calendarAnchor: {
            receivedAtElapsed: calendarTime.elapsed() - 2000,
            expiresAfterMs: 1000,
          },
        });
      renderPlanner(0);
      expect(screen.queryByText('Today')).toBeNull();
      expect(document.querySelector('[aria-current="date"]')).toBeNull();
      for (const row of screen.getAllByTestId(/^day-card-/))
        expect(row).toHaveAttribute('data-temporal', 'neutral');
      expect(screen.getByText('Pasta Carbonara')).toBeVisible();
    }
  );

  it('uses authoritative dates, including retained content while another week loads', () => {
    setCalendar();
    vi.spyOn(calendarTime, 'instant').mockReturnValue(Date.parse('2026-05-14T12:00:00Z'));
    const view = renderPlanner(0);
    mocks.setPlannerState({ ...mocks.getPlannerState(), currentWeekOffset: 1 });
    mocks.setWeekState({ ...mocks.getWeekState(), isLoading: true });
    view.rerender(<PlannerPage />);
    expect(within(screen.getByTestId('day-card-2')).getByText('Today')).toBeVisible();
    mocks.setWeekState({
      ...mocks.getWeekState(),
      schedule: makeSchedule('2026-05-24'),
      isLoading: false,
    });
    view.rerender(<PlannerPage />);
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('keeps Today with its date through a recipe swap', () => {
    setCalendar();
    const view = renderPlanner(0);
    const state = mocks.getWeekState();
    [state.schedule[0].recipe, state.schedule[2].recipe] = [
      state.schedule[2].recipe,
      state.schedule[0].recipe,
    ];
    mocks.setWeekState({ ...state, schedule: [...state.schedule] });
    view.rerender(<PlannerPage />);
    expect(within(screen.getByTestId('day-card-2')).getByText('Today')).toBeVisible();
    expect(screen.getByTestId('day-card-2')).toHaveTextContent('Pasta Carbonara');
    expect(screen.getByTestId('day-card-0')).toHaveAttribute('data-temporal', 'past');
  });

  it('expires to neutral after a failed refresh, requesting once for the page', async () => {
    vi.useFakeTimers();
    let elapsed = 0;
    vi.spyOn(calendarTime, 'elapsed').mockImplementation(() => elapsed);
    setCalendar('2026-05-13', 1000);
    renderPlanner(0);
    expect(screen.getByText('Today')).toBeVisible();
    elapsed = 1001;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1001);
    });
    expect(screen.queryByText('Today')).toBeNull();
    expect(ensureCalendar).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(ensureCalendar).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Pasta Carbonara')).toBeVisible();
  });

  it('accepts a Sunday-to-Monday refresh without changing retained meal state', async () => {
    vi.useFakeTimers();
    let elapsed = 0;
    vi.spyOn(calendarTime, 'elapsed').mockImplementation(() => elapsed);
    setCalendar('2026-05-17', 1000);
    ensureCalendar.mockImplementation(async () => setCalendar('2026-05-18'));
    const view = renderPlanner(0);
    expect(within(screen.getByTestId('day-card-6')).getByText('Today')).toBeVisible();
    elapsed = 1001;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1001);
    });
    expect(screen.queryByText('Today')).toBeNull();
    expect(mocks.getWeekState().schedule[0].status).toBe(0);
    mocks.setWeekState({ ...mocks.getWeekState(), schedule: makeSchedule('2026-05-24') });
    view.rerender(<PlannerPage />);
    expect(within(screen.getByTestId('day-card-0')).getByText('Today')).toBeVisible();
    expect(ensureCalendar).toHaveBeenCalledTimes(1);
  });

  it('retires an older expiry timer when context changes and on unmount', async () => {
    vi.useFakeTimers();
    let elapsed = 0;
    vi.spyOn(calendarTime, 'elapsed').mockImplementation(() => elapsed);
    setCalendar('2026-05-13', 1000);
    const view = renderPlanner(0);
    elapsed = 500;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      setCalendar('2026-05-14', 2000);
    });
    elapsed = 1100;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(within(screen.getByTestId('day-card-3')).getByText('Today')).toBeVisible();
    expect(ensureCalendar).not.toHaveBeenCalled();
    view.unmount();
    elapsed = 3000;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(ensureCalendar).not.toHaveBeenCalled();
  });

  it('requests missing context once without a per-row burst or mutation', async () => {
    useTodayStore.setState({ calendar: null, calendarAnchor: null });
    renderPlanner(0);
    await act(async () => {});
    expect(ensureCalendar).toHaveBeenCalledTimes(1);
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
    expect(mocks.commitMove).not.toHaveBeenCalled();
  });
});
