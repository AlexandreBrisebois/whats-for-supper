import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  let wide = false;
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
  const guardedAssign = vi.fn();
  const addToast = vi.fn();
  const saveNonCookingDay = vi.fn();
  const getSchedule = vi.fn();
  const applySnapshot = vi.fn();
  const movePost = vi.fn();
  const servingsGet = vi.fn();
  const servingsPut = vi.fn();
  let weekState: any;
  let plannerState: any;
  let searchParams = '';
  let locale: 'en' | 'fr' = 'en';

  return {
    getWide: () => wide,
    setWide: (value: boolean) => {
      wide = value;
    },
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
    guardedAssign,
    addToast,
    saveNonCookingDay,
    getSchedule,
    applySnapshot,
    movePost,
    servingsGet,
    servingsPut,
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

vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => mocks.getWide() }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/planner',
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
      setState: (update: any) =>
        mocks.setWeekState({
          ...mocks.getWeekState(),
          ...(typeof update === 'function' ? update(mocks.getWeekState()) : update),
        }),
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
  assignRecipeToDay: (...args: unknown[]) => mocks.guardedAssign(...args),
  openVoting: vi.fn().mockResolvedValue(undefined),
  saveNonCookingDay: (...args: unknown[]) => mocks.saveNonCookingDay(...args),
  getSchedule: (...args: unknown[]) => mocks.getSchedule(...args),
  normalizeScheduleRecipe: (recipe: unknown) => recipe ?? null,
  removeRecipeFromDay: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      schedule: {
        servings: {
          get: (...args: unknown[]) => mocks.servingsGet(...args),
          put: (...args: unknown[]) => mocks.servingsPut(...args),
        },
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
  assignRecipeToEmptySlot: (w: number, d: number, r: unknown, ref: string) =>
    mocks.guardedAssign(w, d, r, ref, true),
  disposeReplacementOriginal: async (slot: any, action: string) => {
    await mocks.resolveOccupiedSlot(slot, action);
    return {
      action,
      sourceDate: slot.date,
      recipeName: slot.recipe?.name ?? '',
      destinationDate: '2026-10-26',
    };
  },
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
  RecipeDetailSheet: ({
    recipeId,
    sourceDayLabel,
    ingredientContext,
    plannedDayLabel,
    onOpenPlannedDay,
    planningLoading,
    planningNeedsCheck,
    planningActionLabel,
    planningMessage,
    onRetryTarget,
    onFindSimilar,
    onClose,
  }: {
    recipeId: string;
    sourceDayLabel?: string;
    ingredientContext?: unknown;
    plannedDayLabel?: string;
    onOpenPlannedDay?: () => void;
    planningLoading?: boolean;
    planningNeedsCheck?: boolean;
    planningActionLabel?: string;
    planningMessage?: string;
    onRetryTarget?: () => void;
    onFindSimilar?: (recipeId: string) => void;
    onClose: () => void;
  }) => (
    <div
      data-testid="mock-recipe-detail-sheet"
      data-recipe-id={recipeId}
      data-planning-loading={String(!!planningLoading)}
      data-planning-needs-check={String(!!planningNeedsCheck)}
    >
      <span>{sourceDayLabel}</span>
      <span data-testid="mock-ingredient-context">{JSON.stringify(ingredientContext)}</span>
      {planningMessage && <span data-testid="mock-planning-message">{planningMessage}</span>}
      {plannedDayLabel && (
        <button data-testid="mock-planned" onClick={onOpenPlannedDay}>
          Planned for {plannedDayLabel}
        </button>
      )}
      {onRetryTarget && (
        <button data-testid="mock-review-plan" onClick={onRetryTarget}>
          {planningActionLabel}
        </button>
      )}
      <button data-testid="mock-find-similar" onClick={() => onFindSimilar?.(recipeId)}>
        Find Similar
      </button>
      <button data-testid="mock-recipe-detail-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('@/components/planner/GroceryList', () => ({
  GroceryList: ({ weekOffset, isEmbedded }: { weekOffset: number; isEmbedded?: boolean }) => (
    <div data-testid="mock-grocery" data-week={weekOffset} data-embedded={!!isEmbedded} />
  ),
}));

vi.mock('@/components/home/SkipRecoveryDialog', () => ({
  SkipRecoveryDialog: ({
    onAction,
    replacement,
    onRetryReplacement,
  }: {
    replacement?: { message: string };
    onRetryReplacement?: () => void;
    onAction: (action: 'tomorrow' | 'next_week' | 'drop') => void;
  }) => (
    <div>
      {replacement && <p data-testid="mock-replacement-feedback">{replacement.message}</p>}
      <button data-testid="mock-retry-replacement" onClick={onRetryReplacement}>
        Retry
      </button>
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
  mocks.setWide(false);
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
  sessionStorage.clear();
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

function renderPlanner(
  status: 0 | 1 | 2,
  sundayDate = '2026-05-17',
  offset = 0,
  capturedReference?: string
) {
  mocks.setPlannerState({
    currentWeekOffset: offset,
    activeTab: 'planner',
    setWeekOffset: mocks.setWeekOffset,
    setActiveTab: mocks.setActiveTab,
    setGroceryState: mocks.setGroceryState,
  });
  mocks.setWeekState({
    weekOffset: offset,
    calendar:
      capturedReference || offset
        ? { referenceWeekStartDate: capturedReference ?? '2026-10-12' }
        : undefined,
    applySnapshot: mocks.applySnapshot,
    applySlotUpdate: vi.fn(),
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

describe('Planner result trust', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    sessionStorage.clear();
  });
  it('does not invent confirmation from a success query alone', async () => {
    vi.clearAllMocks();
    mocks.setSearchParams('success=1&dayIndex=2&weekOffset=0&referenceWeekStartDate=2026-05-11');
    renderPlanner(0);
    expect(screen.queryByTestId('planner-planning-confirmation')).not.toBeInTheDocument();
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
  });

  it('ignores an incoherent receipt whose date differs from its week and index', async () => {
    vi.clearAllMocks();
    sessionStorage.setItem(
      'wfs.planning-result',
      JSON.stringify({
        weekOffset: 0,
        dayIndex: 0,
        referenceWeekStartDate: '2026-05-11',
        date: '2026-05-12',
        recipeId: '11111111-1111-1111-1111-111111111111',
        recipeName: 'Pasta Carbonara',
      })
    );
    mocks.setSearchParams('success=1&dayIndex=0&weekOffset=0&referenceWeekStartDate=2026-05-11');
    mocks.getSchedule.mockResolvedValue({ days: makeSchedule('2026-05-17') });
    renderPlanner(0);
    await act(async () => {});
    expect(screen.queryByTestId('planner-planning-confirmation')).not.toBeInTheDocument();
    expect(mocks.getSchedule).not.toHaveBeenCalled();
  });

  it('confirms the replacement and original actual spillover date together', async () => {
    vi.clearAllMocks();
    const days = makeSchedule('2026-05-17');
    sessionStorage.setItem(
      'wfs.planning-result',
      JSON.stringify({
        weekOffset: 0,
        dayIndex: 0,
        referenceWeekStartDate: '2026-05-11',
        date: '2026-05-11',
        recipeId: days[0].recipe!.id,
        recipeName: 'Pasta Carbonara',
        original: {
          action: 'next_week',
          recipeName: 'Lasagna',
          sourceDate: '2026-05-11',
          destinationDate: '2026-05-25',
          spillover: true,
        },
      })
    );
    mocks.setSearchParams('success=1&dayIndex=0&weekOffset=0&referenceWeekStartDate=2026-05-11');
    mocks.getSchedule.mockResolvedValue({ days });
    renderPlanner(0);
    await waitFor(() =>
      expect(screen.getByTestId('planner-planning-confirmation')).toHaveTextContent(
        'The following week was full. Lasagna moved to Monday, May 25.'
      )
    );
  });

  it('retires confirmation when navigation leaves the acknowledged week', async () => {
    vi.clearAllMocks();
    sessionStorage.setItem(
      'wfs.planning-result',
      JSON.stringify({
        weekOffset: 0,
        dayIndex: 0,
        referenceWeekStartDate: '2026-05-11',
        date: '2026-05-11',
        recipeId: '11111111-1111-1111-1111-111111111111',
        recipeName: 'Pasta Carbonara',
      })
    );
    mocks.setSearchParams('success=1&dayIndex=0&weekOffset=0&referenceWeekStartDate=2026-05-11');
    mocks.getSchedule.mockResolvedValue({ days: makeSchedule('2026-05-17') });
    const view = renderPlanner(0);
    expect(await screen.findByTestId('planner-planning-confirmation')).toHaveTextContent(
      'Pasta Carbonara'
    );
    mocks.setSearchParams('weekOffset=1&referenceWeekStartDate=2026-05-11');
    mocks.setPlannerState({ ...mocks.getPlannerState(), currentWeekOffset: 1 });
    view.rerender(<PlannerPage />);
    expect(screen.queryByTestId('planner-planning-confirmation')).not.toBeInTheDocument();
  });

  it('clears prior success emphasis when a refresh finds a changed recipe', async () => {
    vi.clearAllMocks();
    sessionStorage.setItem(
      'wfs.planning-result',
      JSON.stringify({
        weekOffset: 0,
        dayIndex: 0,
        referenceWeekStartDate: '2026-05-11',
        date: '2026-05-11',
        recipeId: '11111111-1111-1111-1111-111111111111',
        recipeName: 'Pasta Carbonara',
      })
    );
    mocks.setSearchParams('success=1&dayIndex=0&weekOffset=0&referenceWeekStartDate=2026-05-11');
    mocks.getSchedule.mockResolvedValue({ days: makeSchedule('2026-05-17') });
    renderPlanner(0);
    expect(await screen.findByTestId('planner-planning-confirmation')).toHaveTextContent(
      'Pasta Carbonara'
    );
    const meal = within(screen.getByTestId('day-card-0')).getByTestId('planner-meal');
    await waitFor(() => expect(meal).toHaveClass('ring-4'));
    const changed = makeSchedule('2026-05-17');
    changed[0].recipe!.id = '22222222-2222-2222-2222-222222222222';
    mocks.getSchedule.mockResolvedValue({ days: changed });
    fireEvent.click(screen.getByTestId('planner-confirmation-refresh'));
    await waitFor(() =>
      expect(screen.getByTestId('planner-planning-confirmation')).toHaveTextContent('has changed')
    );
    await waitFor(() => expect(meal).not.toHaveClass('ring-4'));
  });

  it('treats an unusable confirmation read as saved but unrefreshed', async () => {
    vi.clearAllMocks();
    sessionStorage.setItem(
      'wfs.planning-result',
      JSON.stringify({
        weekOffset: 0,
        dayIndex: 0,
        referenceWeekStartDate: '2026-05-11',
        date: '2026-05-11',
        recipeId: '11111111-1111-1111-1111-111111111111',
        recipeName: 'Pasta Carbonara',
      })
    );
    mocks.setSearchParams('success=1&dayIndex=0&weekOffset=0&referenceWeekStartDate=2026-05-11');
    mocks.getSchedule.mockResolvedValue(undefined);
    renderPlanner(0);
    expect(await screen.findByTestId('planner-planning-confirmation')).toHaveTextContent(
      'was saved'
    );
    expect(screen.getByTestId('planner-planning-confirmation')).toHaveTextContent(
      'could not refresh'
    );
  });

  it('reads a session-acknowledged result before confirming its recipe and date', async () => {
    vi.clearAllMocks();
    sessionStorage.setItem(
      'wfs.planning-result',
      JSON.stringify({
        weekOffset: 0,
        dayIndex: 0,
        referenceWeekStartDate: '2026-05-11',
        date: '2026-05-11',
        recipeId: '11111111-1111-1111-1111-111111111111',
        recipeName: 'Pasta Carbonara',
      })
    );
    mocks.setSearchParams('success=1&dayIndex=0&weekOffset=0&referenceWeekStartDate=2026-05-11');
    mocks.getSchedule.mockResolvedValue({ days: makeSchedule('2026-05-17') });
    renderPlanner(0);
    expect(await screen.findByTestId('planner-planning-confirmation')).toHaveTextContent(
      /Pasta Carbonara.*May 11/
    );
    expect(mocks.getSchedule).toHaveBeenCalledWith(0, '2026-05-11', true);
    expect(mocks.applySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ days: makeSchedule('2026-05-17') })
    );
    sessionStorage.clear();
  });
});

describe('PlannerPage voting action row', () => {
  it('keeps an uncommitted uncertain draft through failed checking until explicit review and one deliberate save', async () => {
    const baseline = {
      referenceWeekStartDate: '2026-05-11',
      weekStartDate: '2026-05-11',
      weekOffset: 0,
      version: 'before',
      defaultServings: 4,
      days: makeSchedule('2026-05-17').map((d) => ({
        date: d.date,
        servings: 4,
        overrideServings: null,
        editable: true,
      })),
    };
    mocks.servingsGet.mockResolvedValue({ data: baseline });
    mocks.servingsPut.mockRejectedValueOnce(new Error('reply lost'));
    renderPlanner(0);
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    fireEvent.change(await screen.findByTestId('portion-input-2026-05-13'), {
      target: { value: '6' },
    });
    fireEvent.click(screen.getByTestId('save-portions'));
    await screen.findByTestId('portions-review');
    mocks.servingsGet.mockRejectedValueOnce(new Error('read unavailable'));
    fireEvent.click(screen.getByTestId('portions-review'));
    await waitFor(() => expect(screen.getByTestId('portions-review')).toBeEnabled());
    expect(screen.getByTestId('save-portions')).toBeDisabled();
    mocks.servingsGet.mockResolvedValue({ data: { ...baseline, version: 'fresh' } });
    fireEvent.click(screen.getByTestId('portions-review'));
    await screen.findByTestId('portions-saved-review');
    expect(screen.getByTestId('portion-input-2026-05-13')).toHaveValue(6);
    expect(mocks.servingsPut).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('portions-keep-draft'));
    mocks.servingsPut.mockResolvedValueOnce({ data: { ...baseline, version: 'saved' } });
    fireEvent.click(screen.getByTestId('save-portions'));
    await waitFor(() => expect(screen.getByTestId('at-the-table-mode')).toBeVisible());
    expect(mocks.servingsPut).toHaveBeenCalledTimes(2);
    expect(mocks.servingsPut.mock.calls[1][0]).toMatchObject({
      expectedVersion: 'fresh',
      days: [{ date: expect.anything(), servings: 6 }],
    });
  });

  it.each(['count', 'reset', 'departure'])(
    'accepts an authoritative matching %s intent without replay',
    async (kind) => {
      const baseline = {
        referenceWeekStartDate: '2026-05-11',
        weekStartDate: '2026-05-11',
        weekOffset: 0,
        version: 'before',
        defaultServings: 4,
        days: makeSchedule('2026-05-17').map((d) => ({
          date: d.date,
          servings: kind === 'reset' ? 6 : 4,
          overrideServings: kind === 'reset' ? 6 : null,
          editable: true,
        })),
      };
      mocks.servingsGet.mockResolvedValue({ data: baseline });
      mocks.servingsPut.mockRejectedValue(new Error('reply lost'));
      renderPlanner(0);
      fireEvent.click(screen.getByTestId('at-the-table-mode'));
      await screen.findByTestId('portion-input-2026-05-13');
      if (kind === 'reset') fireEvent.click(screen.getByTestId('reset-portions-2026-05-13'));
      else
        fireEvent.change(screen.getByTestId('portion-input-2026-05-13'), {
          target: { value: '6' },
        });
      if (kind === 'departure') {
        fireEvent.click(screen.getByTestId('grocery-tab'));
        fireEvent.click(screen.getByTestId('portions-save-continue'));
      } else fireEvent.click(screen.getByTestId('save-portions'));
      await screen.findByTestId('portions-review');
      const saved = {
        ...baseline,
        version: 'committed',
        defaultServings: 4,
        days: baseline.days.map((d) =>
          d.date === '2026-05-13'
            ? {
                ...d,
                servings: kind === 'reset' ? 4 : 6,
                overrideServings: kind === 'count' || kind === 'departure' ? 6 : null,
              }
            : d
        ),
      };
      mocks.servingsGet.mockResolvedValue({ data: saved });
      fireEvent.click(screen.getByTestId('portions-review'));
      await waitFor(() => expect(screen.getByTestId('at-the-table-mode')).toBeVisible());
      expect(mocks.servingsPut).toHaveBeenCalledTimes(1);
      if (kind === 'departure')
        await waitFor(() => expect(mocks.setActiveTab).toHaveBeenCalledWith('grocery'));
    }
  );

  it.each(['lost reply', 'in-flight reload'])(
    'reconciles an uncertain portions save after %s without replay',
    async (failure) => {
      const baseline = {
        referenceWeekStartDate: '2026-05-11',
        weekStartDate: '2026-05-11',
        weekOffset: 0,
        version: 'before',
        defaultServings: 4,
        days: makeSchedule('2026-05-17').map((d) => ({
          date: d.date,
          servings: 4,
          overrideServings: null,
          editable: true,
        })),
      };
      const saved = {
        ...baseline,
        version: 'committed',
        days: baseline.days.map((d) =>
          d.date === '2026-05-13' ? { ...d, servings: 6, overrideServings: 6 } : d
        ),
        groceryRefresh: { status: 'failed', version: 'committed' },
      };
      mocks.servingsGet.mockResolvedValue({ data: baseline });
      mocks.servingsPut.mockImplementation(() =>
        failure === 'lost reply' ? Promise.reject(new Error('reply lost')) : new Promise(() => {})
      );
      const first = renderPlanner(0);
      fireEvent.click(screen.getByTestId('at-the-table-mode'));
      fireEvent.change(await screen.findByTestId('portion-input-2026-05-13'), {
        target: { value: '6' },
      });
      fireEvent.click(screen.getByTestId('save-portions'));
      await waitFor(() => expect(mocks.servingsPut).toHaveBeenCalledTimes(1));
      if (failure === 'lost reply') await screen.findByTestId('portions-review');
      first.unmount();
      mocks.servingsGet.mockResolvedValue({ data: saved });
      renderPlanner(0);
      await screen.findByTestId('portions-restored');
      expect(screen.getByTestId('save-portions')).toBeDisabled();
      fireEvent.click(screen.getByTestId('portions-review'));
      await waitFor(() => expect(screen.getByTestId('at-the-table-mode')).toBeVisible());
      expect(mocks.servingsPut).toHaveBeenCalledTimes(1);
      expect(mocks.getWeekState().groceryRefresh).toMatchObject({
        status: 'failed',
        version: 'committed',
      });
      expect(sessionStorage.getItem('wfs-portions-draft:2026-05-11')).toBeNull();
    }
  );

  it.each([false, true])(
    'requires exact override intent when reconciling a reset (%s)',
    async (reset) => {
      const baseline = {
        referenceWeekStartDate: '2026-05-11',
        weekStartDate: '2026-05-11',
        weekOffset: 0,
        version: 'before',
        defaultServings: 4,
        days: makeSchedule('2026-05-17').map((d) => ({
          date: d.date,
          servings: reset ? 6 : 4,
          overrideServings: reset ? 6 : null,
          editable: true,
        })),
      };
      mocks.servingsGet.mockResolvedValue({ data: baseline });
      mocks.servingsPut.mockRejectedValue(new Error('reply lost'));
      renderPlanner(0);
      fireEvent.click(screen.getByTestId('at-the-table-mode'));
      await screen.findByTestId('portion-input-2026-05-13');
      if (reset) fireEvent.click(screen.getByTestId('reset-portions-2026-05-13'));
      else
        fireEvent.change(screen.getByTestId('portion-input-2026-05-13'), {
          target: { value: '6' },
        });
      fireEvent.click(screen.getByTestId('save-portions'));
      await screen.findByTestId('portions-review');
      const effective = reset ? 4 : 6;
      // Equal effective quantities do not prove an explicit override or reset committed.
      mocks.servingsGet.mockResolvedValue({
        data: {
          ...baseline,
          version: 'other',
          defaultServings: effective,
          days: baseline.days.map((d) => ({
            ...d,
            servings: effective,
            overrideServings: reset ? 4 : null,
          })),
        },
      });
      fireEvent.click(screen.getByTestId('portions-review'));
      await screen.findByTestId('portions-saved-review');
      expect(screen.getByTestId('save-portions')).toBeDisabled();
      expect(mocks.servingsPut).toHaveBeenCalledTimes(1);
    }
  );

  it('saves one dated draft and returns before grocery work is current', async () => {
    const days = makeSchedule('2026-05-17').map((d) => ({
      date: d.date,
      servings: 2,
      overrideServings: null,
      editable: true,
    }));
    const baseline = {
      referenceWeekStartDate: '2026-05-11',
      weekStartDate: '2026-05-11',
      weekOffset: 0,
      version: 'baseline',
      defaultServings: null,
      days,
      groceryRefresh: { status: 'current', version: 'baseline' },
    };
    mocks.servingsGet.mockResolvedValue({ data: baseline });
    mocks.servingsPut.mockResolvedValue({
      data: {
        ...baseline,
        version: 'saved',
        days: days.map((d, i) => (i === 2 ? { ...d, servings: 6, overrideServings: 6 } : d)),
        groceryRefresh: { status: 'updating', version: 'saved' },
      },
    });
    renderPlanner(0);
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    await screen.findByTestId('portion-input-2026-05-13');
    fireEvent.change(screen.getByTestId('portion-input-2026-05-13'), { target: { value: '6' } });
    expect(mocks.servingsPut).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('save-portions'));
    await waitFor(() =>
      expect(mocks.servingsPut).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedVersion: 'baseline',
          days: [{ date: '2026-05-13', servings: 6 }],
        }),
        expect.anything()
      )
    );
    await waitFor(() =>
      expect(screen.queryByTestId('portion-input-2026-05-13')).not.toBeInTheDocument()
    );
    expect(screen.getByTestId('at-the-table-mode')).toBeVisible();
  });

  it('saves only a date reset without usual mutation or unchanged rows', async () => {
    const baseline = {
      referenceWeekStartDate: '2026-05-11',
      weekStartDate: '2026-05-11',
      weekOffset: 0,
      version: 'baseline',
      defaultServings: 4,
      days: makeSchedule('2026-05-17').map((d, i) => ({
        date: d.date,
        servings: i === 2 ? 6 : 4,
        overrideServings: i === 2 ? 6 : null,
        editable: true,
      })),
    };
    mocks.servingsGet.mockResolvedValue({ data: baseline });
    mocks.servingsPut.mockResolvedValue({ data: { ...baseline, version: 'saved' } });
    renderPlanner(0);
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    await screen.findByTestId('portion-input-2026-05-13');
    expect(screen.queryByTestId('usual-portions')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reset-portions-2026-05-13'));
    expect(screen.getByTestId('portion-input-2026-05-13')).toHaveValue(4);
    fireEvent.click(screen.getByTestId('save-portions'));
    await waitFor(() =>
      expect(mocks.servingsPut).toHaveBeenCalledWith(
        expect.objectContaining({
          days: [{ date: '2026-05-13', servings: null }],
        }),
        expect.anything()
      )
    );
    expect(mocks.servingsPut.mock.calls[0][0]).not.toHaveProperty('defaultServings');
  });
  it('offers inline departure choices and keeps the draft when editing continues', async () => {
    mocks.servingsGet.mockResolvedValue({
      data: {
        referenceWeekStartDate: '2026-05-11',
        version: 'baseline',
        defaultServings: 4,
        days: makeSchedule('2026-05-17').map((d) => ({
          date: d.date,
          servings: 4,
          overrideServings: null,
          editable: true,
        })),
      },
    });
    renderPlanner(0);
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    fireEvent.change(await screen.findByTestId('portion-input-2026-05-13'), {
      target: { value: '6' },
    });
    fireEvent.click(screen.getByTestId('grocery-tab'));
    expect(mocks.setActiveTab).not.toHaveBeenCalledWith('grocery');
    fireEvent.click(screen.getByTestId('portions-keep-editing'));
    expect(screen.getByTestId('portion-input-2026-05-13')).toHaveValue(6);
    fireEvent.click(screen.getByTestId('grocery-tab'));
    fireEvent.click(screen.getByTestId('portions-discard'));
    await waitFor(() => expect(mocks.setActiveTab).toHaveBeenCalledWith('grocery'));
    expect(mocks.servingsPut).not.toHaveBeenCalled();
  });

  it('keeps confirmed saves usable when draft storage is unavailable', async () => {
    const originalGet = Storage.prototype.getItem;
    const originalRemove = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      if (key.startsWith('wfs-portions-draft:')) throw new Error('denied');
      return originalGet.call(this, key);
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key) {
      if (key.startsWith('wfs-portions-draft:')) throw new Error('denied');
      return originalRemove.call(this, key);
    });
    const baseline = {
      referenceWeekStartDate: '2026-05-11',
      version: 'before',
      days: makeSchedule('2026-05-17').map((d) => ({ date: d.date, servings: 4, editable: true })),
    };
    mocks.servingsGet.mockResolvedValue({ data: baseline });
    mocks.servingsPut.mockResolvedValue({
      data: {
        ...baseline,
        version: 'saved',
        groceryRefresh: { status: 'updating', version: 'saved' },
      },
    });
    renderPlanner(0);
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    fireEvent.change(await screen.findByTestId('portion-input-2026-05-13'), {
      target: { value: '6' },
    });
    fireEvent.click(screen.getByTestId('save-portions'));
    await waitFor(() => expect(screen.getByTestId('at-the-table-mode')).toBeVisible());
    expect(mocks.getWeekState().groceryRefresh).toMatchObject({ version: 'saved' });
  });
  it('removes an obsolete persisted draft when a date override is changed back', async () => {
    mocks.servingsGet.mockResolvedValue({
      data: {
        referenceWeekStartDate: '2026-05-11',
        version: 'before',
        defaultServings: 4,
        days: makeSchedule('2026-05-17').map((d) => ({
          date: d.date,
          servings: 4,
          overrideServings: 4,
          editable: true,
        })),
      },
    });
    renderPlanner(0);
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    const dateInput = await screen.findByTestId('portion-input-2026-05-13');
    fireEvent.change(dateInput, { target: { value: '5' } });
    expect(sessionStorage.getItem('wfs-portions-draft:2026-05-11')).toContain('"2026-05-13":"5"');
    fireEvent.change(dateInput, { target: { value: '4' } });
    expect(sessionStorage.getItem('wfs-portions-draft:2026-05-11')).toBeNull();
  });

  it('does not restore an older session over a newly opened serving read', async () => {
    const key = '2026-05-11';
    sessionStorage.setItem(
      `wfs-portions-draft:${key}`,
      JSON.stringify({
        key,
        state: {
          referenceWeekStartDate: '2026-05-11',
          weekStartDate: '2026-05-11',
          version: 'stored',
          weekOffset: 0,
          days: makeSchedule('2026-05-17').map((d) => ({
            date: d.date,
            servings: 4,
            editable: true,
          })),
        },
        draft: { '2026-05-13': '8' },
      })
    );
    mocks.servingsGet.mockReturnValue(new Promise(() => {}));
    renderPlanner(0);
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId('portion-input-2026-05-13')).not.toBeInTheDocument();
  });

  it('does not show retained old-week rows while opening another week', async () => {
    mocks.servingsGet.mockResolvedValueOnce({
      data: {
        version: 'old',
        weekOffset: 0,
        referenceWeekStartDate: '2026-05-11',
        days: makeSchedule('2026-05-17').map((day) => ({
          date: day.date,
          servings: 2,
          editable: true,
        })),
      },
    });
    const view = renderPlanner(0);
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    await screen.findByTestId('portion-input-2026-05-13');
    mocks.setPlannerState({ ...mocks.getPlannerState(), currentWeekOffset: 1 });
    view.rerender(<PlannerPage />);
    mocks.servingsGet.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    expect(screen.queryByTestId('portion-input-2026-05-13')).not.toBeInTheDocument();
  });
  it('does not install an old serving read after changing the displayed week', async () => {
    let resolve!: (value: unknown) => void;
    mocks.servingsGet.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const view = renderPlanner(0);
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    mocks.setPlannerState({ ...mocks.getPlannerState(), currentWeekOffset: 1 });
    view.rerender(<PlannerPage />);
    await act(async () =>
      resolve({
        data: {
          version: 'old',
          weekOffset: 0,
          referenceWeekStartDate: '2026-05-11',
          days: makeSchedule('2026-05-17').map((day) => ({
            date: day.date,
            servings: 6,
            editable: true,
          })),
        },
      })
    );
    expect(screen.queryByTestId('portion-input-2026-05-13')).not.toBeInTheDocument();
    expect(screen.getByTestId('at-the-table-mode')).toBeVisible();
  });
  it('does not install an old save acknowledgement into another week grocery state', async () => {
    const baseline = {
      version: 'old',
      weekOffset: 0,
      referenceWeekStartDate: '2026-05-11',
      days: makeSchedule('2026-05-17').map((day) => ({
        date: day.date,
        servings: 2,
        editable: true,
      })),
    };
    mocks.servingsGet.mockResolvedValue({ data: baseline });
    let resolve!: (value: unknown) => void;
    mocks.servingsPut.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const view = renderPlanner(0);
    fireEvent.click(screen.getByTestId('at-the-table-mode'));
    await screen.findByTestId('portion-input-2026-05-13');
    fireEvent.change(screen.getByTestId('portion-input-2026-05-13'), { target: { value: '6' } });
    fireEvent.click(screen.getByTestId('save-portions'));
    mocks.setPlannerState({ ...mocks.getPlannerState(), currentWeekOffset: 1 });
    mocks.setWeekState({
      ...mocks.getWeekState(),
      weekOffset: 1,
      groceryRefresh: { status: 'current', version: 'new-week' },
    });
    view.rerender(<PlannerPage />);
    await act(async () =>
      resolve({
        data: {
          ...baseline,
          version: 'saved',
          groceryRefresh: { status: 'updating', version: 'old-week' },
        },
      })
    );
    expect(mocks.getWeekState().groceryRefresh).toEqual({ status: 'current', version: 'new-week' });
  });
  it('offers the separate inline Portions control without hiding voting', () => {
    renderPlanner(0);
    expect(screen.getByTestId('at-the-table-mode')).toHaveAccessibleName('Portions');
    expect(screen.getByTestId('ask-family-cta')).toBeVisible();
  });
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

  for (const locale of ['en', 'fr'] as const) {
    it.each([
      [1, '1 voted', '1 vote'],
      [2, '2 voted', '2 votes'],
      [12, '12 voted', '12 votes'],
      [0, 'Chosen', 'Choisie'],
      [undefined, 'Chosen', 'Choisie'],
    ] as const)(`localizes assigned and pending counts in ${locale}: %s`, (count, en, fr) => {
      mocks.setLocale(locale);
      const view = renderPlanner(0);
      const state = mocks.getWeekState();
      state.schedule[0].recipe.voteCount = count;
      state.schedule[1] = {
        ...state.schedule[1],
        recipe: { ...state.schedule[0].recipe, voteCount: 12 },
        _isPending: true,
        _voteCount: count,
      };
      // Missing metadata falls back to the recipe count; missing both uses chosen.
      if (count === undefined) state.schedule[1].recipe.voteCount = undefined;
      mocks.setWeekState({ ...state });
      view.rerender(<PlannerPage />);
      for (const index of [0, 1]) {
        const row = within(screen.getByTestId(`day-card-${index}`));
        expect(row.getByTestId('vote-count').textContent).toBe(locale === 'fr' ? fr : en);
        expect(row.queryByTestId('change-recipe-button') !== null).toBe(index === 0);
      }
      expect(mocks.assignRecipe).not.toHaveBeenCalled();
    });
  }

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
        kind === 'order_in' ? 'Take Out' : 'Eating out'
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

  it.each([true, false])(
    'captures pending=%s explicitly rather than treating a missing saved occurrence as undated',
    (pending) => {
      const schedule = makeAssignedSchedule(
        '2026-05-10',
        0
      ) as import('@/store/weekStore').UILocalScheduleDay[];
      schedule[0] = { ...schedule[0], _isPending: pending };
      mocks.setWeekState({
        ...mocks.getWeekState(),
        calendar: { referenceWeekStartDate: '2026-05-04' },
        schedule,
        isLoading: false,
      });
      render(<PlannerPage />);
      fireEvent.click(within(screen.getByTestId('day-card-0')).getByTestId('edit-recipe-button'));
      expect(screen.getByTestId('mock-ingredient-context')).toHaveTextContent(
        pending ? '"context":"proposed"' : '"context":"assigned"'
      );
      const context = JSON.parse(screen.getByTestId('mock-ingredient-context').textContent!);
      expect(context.supperDate).toBe('2026-05-04');
      expect(context.context).toBe(pending ? 'proposed' : 'assigned');
      if (!pending) expect(context.occurrenceId).toBe('');
    }
  );

  it('shows recipe details sheet when clicking the recipe name', async () => {
    mocks.getSchedule.mockResolvedValue({
      calendar: {
        timeZone: 'UTC',
        today: '2026-05-04',
        capturedAtUtc: '2026-05-04T12:00:00Z',
        currentWeekStartDate: '2026-05-04',
        referenceWeekStartDate: '2026-05-04',
        nextDayAtUtc: '2026-05-05T00:00:00Z',
      },
      days: makeAssignedSchedule('2026-05-10', 0),
    });
    mocks.setPlannerState({
      currentWeekOffset: 0,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      calendar: { referenceWeekStartDate: '2026-05-04' },
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
    expect(detailSheet).toHaveTextContent('May 4');
    expect(detailSheet).toHaveAttribute('data-planning-loading', 'true');
    expect(await screen.findByTestId('mock-planned')).toHaveTextContent('May 4');
    expect(detailSheet).toHaveAttribute('data-planning-loading', 'false');
    fireEvent.click(screen.getByTestId('mock-planned'));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        '/planner?dayIndex=0&weekOffset=0&referenceWeekStartDate=2026-05-04'
      )
    );
    expect(screen.queryByTestId('mock-recipe-detail-sheet')).not.toBeInTheDocument();
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
  });

  it('opens Similar search from Planner detail without reopening detail', () => {
    mocks.setPlannerState({
      currentWeekOffset: 0,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      calendar: { referenceWeekStartDate: '2026-05-04' },
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
    fireEvent.click(within(screen.getByTestId('day-card-0')).getByTestId('edit-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-find-similar'));
    expect(mocks.push).toHaveBeenCalledWith(
      '/recipes?similarTo=11111111-1111-1111-1111-111111111111'
    );
  });

  it('does not claim Planned when the captured Planner occurrence changed', async () => {
    mocks.setPlannerState({
      currentWeekOffset: 0,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      calendar: { referenceWeekStartDate: '2026-05-04' },
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
    const changed = makeAssignedSchedule('2026-05-10', 0);
    changed[0].recipe = {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Replacement',
      image: '',
    };
    mocks.getSchedule.mockResolvedValue({
      calendar: {
        timeZone: 'UTC',
        today: '2026-05-04',
        capturedAtUtc: '2026-05-04T12:00:00Z',
        currentWeekStartDate: '2026-05-04',
        referenceWeekStartDate: '2026-05-04',
        nextDayAtUtc: '2026-05-05T00:00:00Z',
      },
      days: changed,
    });
    render(<PlannerPage />);
    fireEvent.click(within(screen.getByTestId('day-card-0')).getByTestId('edit-recipe-button'));
    await waitFor(() => expect(mocks.getSchedule).toHaveBeenCalled());
    expect(screen.queryByTestId('mock-planned')).not.toBeInTheDocument();
    expect(await screen.findByTestId('mock-review-plan')).toHaveTextContent('Review plan');
    expect(screen.getByTestId('mock-recipe-detail-sheet')).toHaveAttribute(
      'data-planning-needs-check',
      'true'
    );
    fireEvent.click(screen.getByTestId('mock-review-plan'));
    expect(mocks.push).toHaveBeenCalledWith(
      '/planner?dayIndex=0&weekOffset=0&referenceWeekStartDate=2026-05-04'
    );
    expect(screen.queryByTestId('mock-recipe-detail-sheet')).not.toBeInTheDocument();
  });

  it('opens the captured Sunday in a later week across calendar rollover', async () => {
    mocks.setSearchParams(
      'detailRecipe=11111111-1111-1111-1111-111111111111&planDate=2026-05-17&referenceWeekStartDate=2026-05-04'
    );
    mocks.setPlannerState({
      currentWeekOffset: 1,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      calendar: { referenceWeekStartDate: '2026-05-04' },
      schedule: makeAssignedSchedule('2026-05-17', 6),
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
    mocks.getSchedule.mockResolvedValue({
      calendar: {
        timeZone: 'UTC',
        today: '2026-05-18',
        capturedAtUtc: '2026-05-18T12:00:00Z',
        currentWeekStartDate: '2026-05-18',
        referenceWeekStartDate: '2026-05-04',
        nextDayAtUtc: '2026-05-19T00:00:00Z',
      },
      days: makeAssignedSchedule('2026-05-17', 6),
    });
    render(<PlannerPage />);
    expect(await screen.findByTestId('mock-planned')).toHaveTextContent('May 17');
    fireEvent.click(screen.getByTestId('mock-planned'));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        '/planner?dayIndex=6&weekOffset=1&referenceWeekStartDate=2026-05-04'
      )
    );
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
  });

  it('retires Planned after the displayed occurrence changes in a background refresh', async () => {
    mocks.setPlannerState({
      currentWeekOffset: 0,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    mocks.setWeekState({
      calendar: { referenceWeekStartDate: '2026-05-04' },
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
    mocks.getSchedule.mockResolvedValue({
      calendar: {
        timeZone: 'UTC',
        today: '2026-05-04',
        capturedAtUtc: '2026-05-04T12:00:00Z',
        currentWeekStartDate: '2026-05-04',
        referenceWeekStartDate: '2026-05-04',
        nextDayAtUtc: '2026-05-05T00:00:00Z',
      },
      days: makeAssignedSchedule('2026-05-10', 0),
    });
    const view = render(<PlannerPage />);
    fireEvent.click(within(screen.getByTestId('day-card-0')).getByTestId('edit-recipe-button'));
    expect(await screen.findByTestId('mock-planned')).toBeInTheDocument();
    const changed = makeAssignedSchedule('2026-05-10', 0);
    changed[0].recipe = {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Replacement',
      image: '',
    };
    mocks.getSchedule.mockResolvedValue({
      calendar: {
        timeZone: 'UTC',
        today: '2026-05-04',
        capturedAtUtc: '2026-05-04T12:00:00Z',
        currentWeekStartDate: '2026-05-04',
        referenceWeekStartDate: '2026-05-04',
        nextDayAtUtc: '2026-05-05T00:00:00Z',
      },
      days: changed,
    });
    mocks.setWeekState({ ...mocks.getWeekState(), schedule: changed });
    view.rerender(<PlannerPage />);
    expect(screen.queryByTestId('mock-planned')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-recipe-detail-sheet')).toHaveAttribute(
      'data-planning-loading',
      'true'
    );
    expect(await screen.findByTestId('mock-review-plan')).toHaveTextContent('Review plan');
  });

  it.each([2, 4])(
    'reviews a confirmed status %i occurrence without a false Planned claim',
    async (mealStatus) => {
      mocks.setPlannerState({
        currentWeekOffset: 0,
        activeTab: 'planner',
        setWeekOffset: mocks.setWeekOffset,
        setActiveTab: mocks.setActiveTab,
        setGroceryState: mocks.setGroceryState,
      });
      const days = makeAssignedSchedule('2026-05-10', 0);
      days[0].status = mealStatus;
      mocks.setWeekState({
        calendar: { referenceWeekStartDate: '2026-05-04' },
        schedule: days,
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
      mocks.getSchedule.mockResolvedValue({
        calendar: {
          timeZone: 'UTC',
          today: '2026-05-04',
          capturedAtUtc: '2026-05-04T12:00:00Z',
          currentWeekStartDate: '2026-05-04',
          referenceWeekStartDate: '2026-05-04',
          nextDayAtUtc: '2026-05-05T00:00:00Z',
        },
        days,
      });
      render(<PlannerPage />);
      fireEvent.click(within(screen.getByTestId('day-card-0')).getByTestId('edit-recipe-button'));
      expect(await screen.findByTestId('mock-review-plan')).toHaveTextContent('Review plan');
      expect(screen.getByTestId('mock-planning-message')).toHaveTextContent(
        'Review this completed or voting supper in Planner.'
      );
      expect(screen.queryByTestId('mock-planned')).not.toBeInTheDocument();
      expect(screen.getByTestId('mock-recipe-detail-sheet')).toHaveAttribute(
        'data-planning-needs-check',
        'false'
      );
      expect(mocks.assignRecipe).not.toHaveBeenCalled();
    }
  );

  it('ignores a late Planned click read after detail closes', async () => {
    mocks.setPlannerState({
      currentWeekOffset: 0,
      activeTab: 'planner',
      setWeekOffset: mocks.setWeekOffset,
      setActiveTab: mocks.setActiveTab,
      setGroceryState: mocks.setGroceryState,
    });
    const days = makeAssignedSchedule('2026-05-10', 0);
    mocks.setWeekState({
      calendar: { referenceWeekStartDate: '2026-05-04' },
      schedule: days,
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
    const response = {
      calendar: {
        timeZone: 'UTC',
        today: '2026-05-04',
        capturedAtUtc: '2026-05-04T12:00:00Z',
        currentWeekStartDate: '2026-05-04',
        referenceWeekStartDate: '2026-05-04',
        nextDayAtUtc: '2026-05-05T00:00:00Z',
      },
      days,
    };
    let finish!: (value: typeof response) => void;
    mocks.getSchedule.mockResolvedValueOnce(response).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    render(<PlannerPage />);
    fireEvent.click(within(screen.getByTestId('day-card-0')).getByTestId('edit-recipe-button'));
    fireEvent.click(await screen.findByTestId('mock-planned'));
    fireEvent.click(screen.getByTestId('mock-recipe-detail-close'));
    await act(async () => finish(response));
    expect(screen.queryByTestId('mock-recipe-detail-sheet')).not.toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
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
      calendar: { referenceWeekStartDate: '2026-05-04' },
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
      calendar: { referenceWeekStartDate: '2026-05-04' },
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

  it('does not let delayed move focus override a newer focus choice', () => {
    let finishFrame!: FrameRequestCallback;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      finishFrame = callback;
      return 1;
    });
    const rendered = renderPlanner(0);
    const source = within(screen.getByTestId('day-card-0')).getByTestId('planner-drag-handle');
    source.focus();
    fireEvent.keyDown(source, { key: 'ArrowDown' });
    // The destination becomes occupied after the optimistic render.
    const state = mocks.getWeekState();
    mocks.setWeekState({ ...state, schedule: makeAssignedSchedule('2026-05-17', 1) });
    rendered.rerender(<PlannerPage />);
    const view = screen.getByTestId('next-week');
    view.focus();
    act(() => finishFrame(16));
    expect(view).toHaveFocus();
  });

  it('follows the moved recipe when its source handle disappears and focus is otherwise unclaimed', () => {
    let finishFrame!: FrameRequestCallback;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      finishFrame = callback;
      return 1;
    });
    const view = renderPlanner(0);
    const source = within(screen.getByTestId('day-card-0')).getByTestId('planner-drag-handle');
    source.focus();
    fireEvent.keyDown(source, { key: 'ArrowDown' });
    const state = mocks.getWeekState();
    mocks.setWeekState({ ...state, schedule: makeAssignedSchedule('2026-05-17', 1) });
    view.rerender(<PlannerPage />);
    expect(source).not.toBeInTheDocument();
    act(() => finishFrame(16));
    expect(
      within(screen.getByTestId('day-card-1')).getByTestId('planner-drag-handle')
    ).toHaveFocus();
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
    mocks.guardedAssign.mockReset().mockResolvedValue(undefined);
    mocks.assignRecipe.mockReset().mockResolvedValue(undefined);
    mocks.getSchedule.mockReset().mockResolvedValue({
      days: makeSchedule('2026-05-17').map((day) => ({
        ...day,
        recipe: undefined,
        nonCooking: null,
      })),
    });
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
        'next_week'
      )
    );
    expect(mocks.guardedAssign).not.toHaveBeenCalled();
    await act(async () => completeDefer());
    await waitFor(() =>
      expect(mocks.guardedAssign).toHaveBeenCalledWith(1, 0, expect.anything(), '2026-10-12', true)
    );
    mocks.setSearchParams('');
  });

  it('blocks blind assignment replay after a lost reply until authoritative checking', async () => {
    mocks.guardedAssign.mockRejectedValueOnce(new Error('Reply lost'));
    mocks.getSchedule.mockRejectedValue(new Error('Read unavailable'));
    renderPlanner(0, '2026-05-17', 0, '2026-05-11');
    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-tomorrow'));
    await waitFor(() => expect(mocks.guardedAssign).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('mock-recovery-tomorrow'));
    await act(async () => {});
    expect(mocks.guardedAssign).toHaveBeenCalledTimes(1);
    expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1);
  });

  it('guards replacement assignment against a competing fill', async () => {
    mocks.guardedAssign.mockResolvedValue(undefined);
    renderPlanner(0, '2026-05-17', 0, '2026-05-11');
    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-tomorrow'));
    await waitFor(() =>
      expect(mocks.guardedAssign).toHaveBeenCalledWith(0, 0, expect.anything(), '2026-05-11', true)
    );
  });

  it('keeps Quick Find open, shows an error, and reconciles when an empty-slot assignment fails', async () => {
    mocks.assignRecipe.mockRejectedValue(new Error('assignment failed'));
    renderPlanner(0, '2026-05-17', 0, '2026-05-11');
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeAssignment = mocks.weekInit.mock.calls.length;

    fireEvent.click(within(screen.getByTestId('day-card-1')).getByTestId('plan-meal-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));

    await waitFor(() =>
      expect(mocks.addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('could not be added'),
        })
      )
    );
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeAssignment + 1);
    expect(screen.getByTestId('mock-quick-find-select')).toBeInTheDocument();
  });

  it('keeps recovery open, shows an error, and reconciles when moving the current recipe fails', async () => {
    mocks.resolveOccupiedSlot.mockRejectedValue(new Error('move failed'));
    renderPlanner(0, '2026-05-17', 0, '2026-05-11');
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeRecovery = mocks.weekInit.mock.calls.length;

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-tomorrow'));

    await waitFor(() =>
      expect(screen.getByTestId('mock-replacement-feedback')).toHaveTextContent(
        'original meal could not be confirmed'
      )
    );
    expect(mocks.guardedAssign).not.toHaveBeenCalled();
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeRecovery);
    expect(mocks.getSchedule).toHaveBeenCalled();
    expect(screen.getByTestId('mock-recovery-tomorrow')).toBeInTheDocument();
  });

  it('reconciles after a successful move when replacement assignment fails and keeps recovery open', async () => {
    mocks.guardedAssign.mockRejectedValue(new Error('assignment failed'));
    renderPlanner(0, '2026-05-17', 0, '2026-05-11');
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeRecovery = mocks.weekInit.mock.calls.length;

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-tomorrow'));

    await waitFor(() =>
      expect(screen.getByTestId('mock-replacement-feedback')).toHaveTextContent(
        "new meal wasn't saved"
      )
    );
    expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1);
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeRecovery);
    expect(mocks.getSchedule).toHaveBeenCalled();
    expect(screen.getByTestId('mock-recovery-tomorrow')).toBeInTheDocument();

    mocks.guardedAssign.mockResolvedValue(undefined);
    fireEvent.click(screen.getByTestId('mock-recovery-tomorrow'));
    await waitFor(() => expect(mocks.guardedAssign).toHaveBeenCalledTimes(2));
    expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1);
  });

  it('submits an occupied-slot recovery action only once while it is in flight', async () => {
    let completeMove!: () => void;
    mocks.resolveOccupiedSlot.mockImplementation(
      () => new Promise<void>((resolve) => (completeMove = resolve))
    );
    renderPlanner(0, '2026-05-17', 0, '2026-05-11');

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    const recoveryAction = await screen.findByTestId('mock-recovery-tomorrow');
    fireEvent.click(recoveryAction);
    fireEvent.click(recoveryAction);

    await waitFor(() => expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1));
    await act(async () => completeMove());
    await waitFor(() => expect(mocks.guardedAssign).toHaveBeenCalledTimes(1));
  });

  it('next-week: keeps recovery open, shows an error, and reconciles when moving the current recipe fails', async () => {
    mocks.resolveOccupiedSlot.mockRejectedValue(new Error('move failed'));
    renderPlanner(0, '2026-05-17', 0, '2026-05-11');
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeRecovery = mocks.weekInit.mock.calls.length;

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-next-week'));

    await waitFor(() =>
      expect(screen.getByTestId('mock-replacement-feedback')).toHaveTextContent(
        'original meal could not be confirmed'
      )
    );
    expect(mocks.guardedAssign).not.toHaveBeenCalled();
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeRecovery);
    expect(mocks.getSchedule).toHaveBeenCalled();
    expect(screen.getByTestId('mock-recovery-next-week')).toBeInTheDocument();
  });

  it('next-week: reconciles after a successful move when replacement assignment fails and keeps recovery open', async () => {
    mocks.guardedAssign.mockRejectedValue(new Error('assignment failed'));
    renderPlanner(0, '2026-05-17', 0, '2026-05-11');
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeRecovery = mocks.weekInit.mock.calls.length;

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-next-week'));

    await waitFor(() =>
      expect(screen.getByTestId('mock-replacement-feedback')).toHaveTextContent(
        "new meal wasn't saved"
      )
    );
    expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1);
    expect(mocks.weekInit).toHaveBeenCalledTimes(initCallsBeforeRecovery);
    expect(mocks.getSchedule).toHaveBeenCalled();
    expect(screen.getByTestId('mock-recovery-next-week')).toBeInTheDocument();

    mocks.guardedAssign.mockResolvedValue(undefined);
    fireEvent.click(screen.getByTestId('mock-recovery-next-week'));
    await waitFor(() => expect(mocks.guardedAssign).toHaveBeenCalledTimes(2));
    expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1);
  });

  it('next-week: submits an occupied-slot recovery action only once while it is in flight', async () => {
    let completeMove!: () => void;
    mocks.resolveOccupiedSlot.mockImplementation(
      () => new Promise<void>((resolve) => (completeMove = resolve))
    );
    renderPlanner(0, '2026-05-17', 0, '2026-05-11');

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    fireEvent.click(await screen.findByTestId('mock-quick-find-select'));
    const recoveryAction = await screen.findByTestId('mock-recovery-next-week');
    fireEvent.click(recoveryAction);
    fireEvent.click(recoveryAction);

    await waitFor(() => expect(mocks.resolveOccupiedSlot).toHaveBeenCalledTimes(1));
    await act(async () => completeMove());
    await waitFor(() => expect(mocks.guardedAssign).toHaveBeenCalledTimes(1));
  });

  it('waits for the replacement assignment before refreshing the week', async () => {
    renderPlanner(0, '2026-05-17', 0, '2026-05-11');
    await waitFor(() => expect(mocks.weekInit).toHaveBeenCalled());
    const initCallsBeforeRecovery = mocks.weekInit.mock.calls.length;

    let completeAssignment!: () => void;
    mocks.guardedAssign.mockImplementation(
      () => new Promise<void>((resolve) => (completeAssignment = resolve))
    );

    fireEvent.click(screen.getByTestId('change-recipe-button'));
    fireEvent.click(screen.getByTestId('mock-pivot-quick-find'));
    await screen.findByTestId('mock-quick-find-select');
    fireEvent.click(screen.getByTestId('mock-quick-find-select'));
    fireEvent.click(await screen.findByTestId('mock-recovery-tomorrow'));

    await waitFor(() => expect(mocks.guardedAssign).toHaveBeenCalledTimes(1));
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

describe('Planner presentation composition', () => {
  it('preserves the grocery tab and week through loading and resize', () => {
    const doc = document; // Production declaration and coordinator use the same document.
    vi.spyOn(doc, 'visibilityState', 'get').mockReturnValue('visible');
    const view = renderPlanner(0, '2026-05-17', 1);

    fireEvent.click(screen.getByTestId('grocery-tab'));
    expect(mocks.setActiveTab).toHaveBeenCalledWith('grocery');

    // click alone is not presentation
    mocks.setPlannerState({ ...mocks.getPlannerState(), activeTab: 'grocery' });
    mocks.setWeekState({ ...mocks.getWeekState(), isLoading: true, schedule: [] });
    view.rerender(<PlannerPage />);

    expect(screen.queryByTestId('mock-grocery')).toBeNull();
    // still the loading shell
    mocks.setWide(true);
    view.rerender(<PlannerPage />);

    expect(screen.getAllByTestId('mock-grocery')).toHaveLength(1);
    expect(screen.getByTestId('mock-grocery')).toHaveAttribute('data-embedded', 'true');

    mocks.setWide(false);
    view.rerender(<PlannerPage />);

    mocks.setWeekState({ ...mocks.getWeekState(), isLoading: false });
    view.rerender(<PlannerPage />);

    expect(screen.getAllByTestId('mock-grocery')).toHaveLength(1);

    mocks.setWide(true);
    view.rerender(<PlannerPage />);

    expect(screen.getAllByTestId('mock-grocery')).toHaveLength(1);
    expect(screen.getByTestId('mock-grocery')).toHaveAttribute('data-embedded', 'true');

    mocks.setWide(false);
    view.rerender(<PlannerPage />);

    expect(screen.getByTestId('mock-grocery')).toHaveAttribute('data-embedded', 'false');
    expect(screen.getByTestId('mock-grocery')).toHaveAttribute('data-week', '1');
    expect(mocks.getPlannerState().activeTab).toBe('grocery');
  });
});
