import { DateOnly } from '@microsoft/kiota-abstractions';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  markOrderedIn: vi.fn(),
  applyServerUpdate: vi.fn(),
  applySlotUpdate: vi.fn(),
  weekInit: vi.fn().mockResolvedValue(undefined),
  loadSetting: vi.fn(),
  push: vi.fn(),
  assignRecipe: vi.fn(),
  sync: vi.fn(),
  movePost: vi.fn().mockResolvedValue(undefined),
  deferPost: vi.fn().mockResolvedValue({ data: { message: 'Moved meal to Monday, May 18.' } }),
  addToast: vi.fn(),
  removeDelete: vi.fn().mockResolvedValue(undefined),
  validatePost: vi.fn().mockResolvedValue(undefined),
  loadActiveGoTo: vi.fn().mockResolvedValue(null),
  currentRecipe: null as any,
  todayStatus: 0 as 0 | 2 | 3,
  nonCooking: null as { kind: string; customLabel: string | null } | null,
  todayString: '2026-05-07',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

vi.mock('@/lib/imageUtils', () => ({
  getTodayString: () => mocks.todayString,
}));

vi.mock('@/components/home/HomeSections', () => ({
  QuickCaptureTrigger: () => null,
  CookedSuccessCard: () => null,
  VotingNudgeCard: () => null,
  BrowseLibraryTrigger: () => null,
}));

vi.mock('@/components/home/TonightPivotCard', () => ({
  TonightPivotCard: ({
    onOrderIn,
    onDiscover,
    onConfirmGoto,
  }: {
    onOrderIn: () => void;
    onDiscover: () => void;
    onConfirmGoto: () => void;
  }) => (
    <div data-testid="tonight-pivot-card">
      <button data-testid="order-in-btn" onClick={onOrderIn}>
        Order In
      </button>
      <button data-testid="discover-btn" onClick={onDiscover}>
        Quick Find
      </button>
      <button data-testid="confirm-goto-btn" onClick={onConfirmGoto}>
        Make This Tonight
      </button>
    </div>
  ),
}));

vi.mock('@/components/home/TonightMenuCard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./TonightMenuCard')>()),
  TonightMenuCard: ({ onSkip }: { onSkip: () => void }) => (
    <button data-testid="skip-btn" onClick={onSkip}>
      Skip
    </button>
  ),
}));

vi.mock('@/components/home/SkipRecoveryDialog', () => ({
  SkipRecoveryDialog: ({
    step,
    onAction,
    onClose,
  }: {
    step: 1 | 2;
    onAction: (action: any) => void;
    onClose: () => void;
  }) => (
    <div>
      <button data-testid="recovery-close" onClick={onClose}>
        Close
      </button>
      {step === 1 ? (
        <>
          <button data-testid="recovery-action-order-in" onClick={() => onAction('order_in')}>
            Order In
          </button>
          <button data-testid="recovery-action-pick-else" onClick={() => onAction('pick_else')}>
            Pick Else
          </button>
        </>
      ) : (
        <>
          <button data-testid="recovery-action-tomorrow" onClick={() => onAction('tomorrow')}>
            Tomorrow
          </button>
          <button data-testid="recovery-action-next-week" onClick={() => onAction('next_week')}>
            Next Week
          </button>
          <button data-testid="recovery-action-drop" onClick={() => onAction('drop')}>
            Drop
          </button>
        </>
      )}
    </div>
  ),
}));

vi.mock('@/components/planner/QuickFindModal', () => ({
  QuickFindModal: ({ onSelect }: { onSelect: (recipe: any) => void }) => (
    <button
      data-testid="quick-find-select"
      onClick={() =>
        onSelect({
          id: 'replacement-recipe',
          name: 'Replacement Recipe',
          image: '/img/replacement',
        })
      }
    >
      Select
    </button>
  ),
}));

vi.mock('@/components/planner/CooksMode', () => ({
  CooksMode: () => null,
}));

vi.mock('@/components/ui/SolarLoader', () => ({
  SolarLoader: () => null,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const fixtureCalendar = () => ({
  timeZone: 'UTC',
  today: mocks.todayString,
  capturedAtUtc: '2026-05-07T12:00:00Z',
  currentWeekStartDate: '2026-05-04',
  referenceWeekStartDate: '2026-05-04',
  nextDayAtUtc: '2026-05-08T00:00:00Z',
});

vi.mock('@/store/todayStore', () => ({
  useTodayStore: Object.assign(
    () => ({
      calendar: fixtureCalendar(),
      currentRecipe: mocks.currentRecipe,
      status: mocks.todayStatus,
      nonCooking: mocks.nonCooking,
      isLoading: false,
      assignRecipe: mocks.assignRecipe,
      markCooked: vi.fn(),
      markOrderedIn: mocks.markOrderedIn,
      sync: mocks.sync,
    }),
    {
      getState: () => ({
        calendar: fixtureCalendar(),
        calendarIsFresh: () => true,
        ensureCalendar: async () => fixtureCalendar(),
        currentRecipe: mocks.currentRecipe,
        applyServerUpdate: mocks.applyServerUpdate,
      }),
    }
  ),
}));

vi.mock('@/store/weekStore', () => ({
  useWeekStore: {
    getState: () => ({
      applySlotUpdate: mocks.applySlotUpdate,
      init: mocks.weekInit,
    }),
  },
}));

vi.mock('@/store/uiStore', () => ({
  useUiStore: Object.assign(() => ({}), { getState: () => ({ addToast: mocks.addToast }) }),
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector?: (state: any) => any) => {
    const state = {
      selectedFamilyMemberId: 'member-1',
      loadSetting: mocks.loadSetting,
      loadActiveGoTo: mocks.loadActiveGoTo,
      loadGoTo: vi.fn().mockResolvedValue({ items: [] }),
      saveGoTo: vi.fn().mockResolvedValue(undefined),
      familySettings: {},
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/store/gotoStore', () => ({
  useGotoStore: (selector?: (state: any) => any) => {
    const state = {
      readyRecipeIds: new Set(['goto-recipe']),
      isReady: vi.fn().mockReturnValue(false),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      schedule: {
        move: {
          post: mocks.movePost,
        },
        defer: {
          post: mocks.deferPost,
        },
        day: {
          byDate: () => ({
            validate: { post: mocks.validatePost },
            remove: { delete: mocks.removeDelete },
          }),
        },
      },
      recipes: {
        byId: () => ({
          status: { get: vi.fn() },
          get: vi.fn(),
        }),
      },
    },
  },
}));

vi.mock('@/lib/api/planner', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/planner')>()),
  assignRecipeToDay: vi.fn(),
}));

vi.mock('@/lib/formatTime', () => ({
  formatTotalTime: () => undefined,
}));

import { HomeCommandCenter } from './HomeCommandCenter';

describe('HomeCommandCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentRecipe = null;
    mocks.todayStatus = 0;
    mocks.nonCooking = null;
    mocks.todayString = '2026-05-07';
    mocks.loadActiveGoTo.mockResolvedValue(null);
  });

  it.each(['order_in', 'eating_out'])('shows the saved %s note on Home', async (kind) => {
    mocks.todayStatus = 3;
    mocks.nonCooking = { kind, customLabel: 'Try Luigi’s' };
    render(<HomeCommandCenter todaysRecipe={null} todayStatus={3} />);
    expect(await screen.findByTestId('today-non-cooking-label')).toHaveTextContent(
      kind === 'order_in' ? 'Order In' : 'Eating out'
    );
    expect(screen.getByTestId('today-non-cooking-note')).toHaveTextContent('Try Luigi’s');
    expect(screen.getByTestId('today-non-cooking-plan')).toHaveAccessibleName(
      `Tonight ${kind === 'order_in' ? 'Order In' : 'Eating out'} Try Luigi’s Edit supper plan`
    );
  });

  it.each([
    ['order_in', null, 'Order In'],
    ['eating_out', null, 'Eating out'],
    ['custom', 'Supper at Grandma’s', 'Supper at Grandma’s'],
    ['custom', 'Emma’s birthday supper', 'Emma’s birthday supper'],
  ])(
    'shows the saved %s plan on Home without meal recovery controls',
    async (kind, customLabel, label) => {
      mocks.todayStatus = 3;
      mocks.nonCooking = { kind: kind!, customLabel };

      render(<HomeCommandCenter todaysRecipe={null} todayStatus={3} />);

      expect(await screen.findByTestId('today-non-cooking-label')).toHaveTextContent(label!);
      const iconClass =
        kind === 'custom'
          ? 'lucide-calendar-days'
          : kind === 'eating_out'
            ? 'lucide-utensils-crossed'
            : 'lucide-shopping-bag';
      expect(
        screen.getByTestId('today-non-cooking-plan').querySelector(`.${iconClass}`)
      ).not.toBeNull();
      fireEvent.click(screen.getByRole('button', { name: `Tonight ${label} Edit supper plan` }));
      expect(mocks.push).toHaveBeenCalledWith(
        '/planner?weekOffset=0&referenceWeekStartDate=2026-05-04&planDate=2026-05-07'
      );
      expect(screen.queryByRole('summary')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-in-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tonight-menu-card')).not.toBeInTheDocument();
    }
  );

  it('offers empty-night recipe choices for Mystery night without clearing its saved plan', async () => {
    mocks.todayStatus = 3;
    mocks.nonCooking = { kind: 'mystery', customLabel: null };
    render(<HomeCommandCenter todaysRecipe={null} todayStatus={3} />);
    expect(screen.getByTestId('tonight-pivot-card')).toBeInTheDocument();
    expect(screen.queryByTestId('today-non-cooking-plan')).not.toBeInTheDocument();
    expect(mocks.nonCooking).toEqual({ kind: 'mystery', customLabel: null });
    fireEvent.click(screen.getByTestId('discover-btn'));
    expect(await screen.findByTestId('quick-find-select')).toBeInTheDocument();
    expect(mocks.markOrderedIn).not.toHaveBeenCalled();
  });

  it('keeps the existing empty-day fallback and planned-meal controls', async () => {
    const view = render(<HomeCommandCenter todaysRecipe={null} todayStatus={0} />);
    expect(screen.getByTestId('order-in-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('today-non-cooking-plan')).not.toBeInTheDocument();
    mocks.currentRecipe = { id: '11111111-1111-1111-1111-111111111111', name: 'Pasta' };
    view.rerender(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);
    expect(screen.getByTestId('skip-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('order-in-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('today-non-cooking-plan')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('skip-btn'));
    expect(screen.getByTestId('recovery-action-order-in')).toBeInTheDocument();
  });

  it('re-fetches a pending GOTO when its recipe is already marked ready by SSE', async () => {
    mocks.loadActiveGoTo
      .mockResolvedValueOnce({
        description: 'SSE recipe',
        recipeId: 'goto-recipe',
        imageUrl: null,
        status: 'pending',
      })
      .mockResolvedValueOnce({
        description: 'SSE recipe',
        recipeId: 'goto-recipe',
        imageUrl: null,
        status: 'ready',
      });

    render(<HomeCommandCenter todaysRecipe={null} todayStatus={0} />);

    await waitFor(() => expect(mocks.loadActiveGoTo).toHaveBeenCalledTimes(2));
  });

  it('marks today as ordered in in weekStore when ordering in from an empty home slot', () => {
    render(<HomeCommandCenter todaysRecipe={null} todayStatus={0} />);

    fireEvent.click(screen.getByTestId('order-in-btn'));

    expect(mocks.markOrderedIn).toHaveBeenCalledTimes(1);
    expect(mocks.applySlotUpdate).toHaveBeenCalledWith({
      date: '2026-05-07',
      recipe: null,
      status: 3,
    });
  });

  it('preserves ordered in locally and refreshes week state after moving skipped tonight recipe to tomorrow', async () => {
    mocks.currentRecipe = {
      id: 'recipe-1',
      name: 'Pasta',
      image: '/img/pasta',
    };

    render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);

    fireEvent.click(screen.getByTestId('skip-btn'));
    fireEvent.click(screen.getByTestId('recovery-action-order-in'));

    expect(mocks.markOrderedIn).not.toHaveBeenCalled();
    expect(mocks.applySlotUpdate).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
    });

    expect(mocks.applyServerUpdate).toHaveBeenCalledWith({
      date: mocks.todayString,
      recipe: null,
      status: 3,
    });
    expect(mocks.applySlotUpdate).toHaveBeenCalledWith({
      date: '2026-05-07',
      recipe: null,
      status: 3,
    });
    expect(mocks.validatePost).toHaveBeenCalledWith({ status: 3 });
    expect(mocks.movePost).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mocks.weekInit).toHaveBeenCalledWith(0, '2026-05-04');
      expect(mocks.sync).toHaveBeenCalled();
      expect(mocks.push).toHaveBeenCalledWith(
        '/planner?weekOffset=0&referenceWeekStartDate=2026-05-04'
      );
    });
  });

  it('moves a skipped Sunday recipe to next week Monday when planning it later', async () => {
    mocks.todayString = '2026-05-10';
    mocks.currentRecipe = {
      id: 'recipe-1',
      name: 'Pasta',
      image: '/img/pasta',
    };

    render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);

    fireEvent.click(screen.getByTestId('skip-btn'));
    fireEvent.click(screen.getByTestId('recovery-action-order-in'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
    });

    expect(mocks.movePost).toHaveBeenCalledWith(
      {
        weekOffset: 0,
        fromIndex: 6,
        toIndex: 0,
        targetWeekOffset: 1,
        intent: 'push',
        recipeId: 'recipe-1',
      },
      { queryParameters: { referenceWeekStartDate: DateOnly.parse('2026-05-04') } }
    );
  });

  it('treats closing the order-in recovery flow as an abort', () => {
    mocks.currentRecipe = {
      id: 'recipe-1',
      name: 'Pasta',
      image: '/img/pasta',
    };

    render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);

    fireEvent.click(screen.getByTestId('skip-btn'));
    fireEvent.click(screen.getByTestId('recovery-action-order-in'));
    fireEvent.click(screen.getByTestId('recovery-close'));

    expect(mocks.markOrderedIn).not.toHaveBeenCalled();
    expect(mocks.applySlotUpdate).not.toHaveBeenCalled();
    expect(mocks.movePost).not.toHaveBeenCalled();
    expect(mocks.removeDelete).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('defers tonight to the server-selected next-week date without navigating', async () => {
    mocks.currentRecipe = {
      id: 'recipe-1',
      name: 'Pasta',
      image: '/img/pasta',
    };

    render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);

    fireEvent.click(screen.getByTestId('skip-btn'));
    fireEvent.click(screen.getByTestId('recovery-action-order-in'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('recovery-action-next-week'));
    });

    await waitFor(() => {
      expect(mocks.deferPost).toHaveBeenCalledWith(
        expect.objectContaining({ recipeId: 'recipe-1' }),
        { queryParameters: { referenceWeekStartDate: DateOnly.parse('2026-05-04') } }
      );
      expect(mocks.movePost).not.toHaveBeenCalled();
      expect(mocks.addToast).toHaveBeenCalledWith('Moved meal to Monday, May 18.');
      expect(mocks.push).not.toHaveBeenCalled();
    });
  });

  it('moves the original planned recipe before assigning the pick-else replacement', async () => {
    mocks.currentRecipe = {
      id: 'planned-recipe',
      name: 'Pasta',
      image: '/img/pasta',
    };

    render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);

    fireEvent.click(screen.getByTestId('skip-btn'));
    fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
    fireEvent.click(screen.getByTestId('quick-find-select'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
    });

    expect(mocks.movePost).toHaveBeenCalledWith(
      expect.objectContaining({ recipeId: 'planned-recipe' }),
      { queryParameters: { referenceWeekStartDate: DateOnly.parse('2026-05-04') } }
    );
    expect(mocks.assignRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'replacement-recipe' }),
      fixtureCalendar()
    );
  });

  it('navigates to planner after dropping tonight from the plan', async () => {
    mocks.currentRecipe = {
      id: 'recipe-1',
      name: 'Pasta',
      image: '/img/pasta',
    };

    render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);

    fireEvent.click(screen.getByTestId('skip-btn'));
    fireEvent.click(screen.getByTestId('recovery-action-order-in'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('recovery-action-drop'));
    });

    await waitFor(() => {
      expect(mocks.validatePost).toHaveBeenCalledWith({ status: 3 });
      expect(mocks.removeDelete).not.toHaveBeenCalled();
      expect(mocks.push).toHaveBeenCalledWith(
        '/planner?weekOffset=0&referenceWeekStartDate=2026-05-04'
      );
    });
  });
  it('keeps a started Sunday recovery on its source date after Today changes', async () => {
    mocks.todayString = '2026-05-10';
    mocks.currentRecipe = { id: 'sunday-recipe', name: 'Sunday' };
    const view = render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} />);
    fireEvent.click(screen.getByTestId('skip-btn'));
    fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
    fireEvent.click(screen.getByTestId('quick-find-select'));
    mocks.todayString = '2026-05-11';
    mocks.currentRecipe = { id: 'monday-recipe', name: 'Monday' };
    view.rerender(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
    });
    expect(mocks.movePost).toHaveBeenCalledWith(
      expect.objectContaining({
        weekOffset: 0,
        fromIndex: 6,
        toIndex: 0,
        targetWeekOffset: 1,
        recipeId: 'sunday-recipe',
      }),
      { queryParameters: { referenceWeekStartDate: DateOnly.parse('2026-05-04') } }
    );
    expect(mocks.assignRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'replacement-recipe' }),
      expect.objectContaining({ today: '2026-05-10', referenceWeekStartDate: '2026-05-04' })
    );
  });
});
