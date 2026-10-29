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
  saveRecoveryRecipe: vi.fn().mockResolvedValue(undefined),
  sync: vi.fn(),
  readSchedule: vi.fn(),
  movePost: vi.fn().mockResolvedValue({ data: { moved: true, refreshComplete: true } }),
  deferPost: vi.fn().mockResolvedValue({ data: { message: 'Moved meal to Monday, May 18.' } }),
  addToast: vi.fn(),
  removeDelete: vi.fn().mockResolvedValue(undefined),
  validatePost: vi.fn().mockResolvedValue(undefined),
  loadActiveGoTo: vi.fn().mockResolvedValue(null),
  currentRecipe: null as any,
  todayStatus: 0 as 0 | 2 | 3,
  nonCooking: null as { kind: string; customLabel: string | null } | null,
  todayString: '2026-05-07',
  calendarFailure: false,
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

vi.mock('@/components/home/HomeSections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./HomeSections')>()),
  QuickCaptureTrigger: () => null,
  CookedSuccessCard: () => null,
  BrowseLibraryTrigger: () => null,
}));

vi.mock('@/components/home/TonightPivotCard', () => ({
  TonightPivotCard: ({
    onOrderIn,
    onDiscover,
    onConfirmGoto,
    nonCookingLabel,
    nonCookingKind,
    hasCheckedActive,
  }: {
    hasCheckedActive?: boolean;
    nonCookingLabel?: string;
    nonCookingKind?: string;
    onOrderIn: () => void;
    onDiscover: () => void;
    onConfirmGoto: () => void;
  }) => (
    <div data-testid="tonight-pivot-card">
      <p data-testid="active-read-state">{hasCheckedActive ? 'settled' : 'pending'}</p>
      <p data-testid="pivot-context">
        {nonCookingLabel} {nonCookingKind}
      </p>
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
    replacement,
    onRetryReplacement,
  }: {
    step: 1 | 2;
    onAction: (action: any) => void;
    onClose: () => void;
    replacement?: any;
    onRetryReplacement?: () => void;
  }) => (
    <div>
      {replacement && <p>{replacement.message}</p>}
      {replacement && (
        <button data-testid="retry-replacement" onClick={onRetryReplacement}>
          Retry
        </button>
      )}
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
      calendarError: mocks.calendarFailure ? 'Calendar unavailable' : null,
      currentRecipe: mocks.currentRecipe,
      status: mocks.todayStatus,
      nonCooking: mocks.nonCooking,
      isLoading: false,
      assignRecipe: mocks.assignRecipe,
      saveRecoveryRecipe: mocks.saveRecoveryRecipe,
      markCooked: vi.fn(),
      markOrderedIn: mocks.markOrderedIn,
      sync: mocks.sync,
    }),
    {
      getState: () => ({
        calendar: fixtureCalendar(),
        calendarIsFresh: () => true,
        ensureCalendar: async () => {
          if (mocks.calendarFailure) throw new Error('Calendar unavailable');
          return fixtureCalendar();
        },
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
  getSchedule: mocks.readSchedule,
}));

vi.mock('@/lib/formatTime', () => ({
  formatTotalTime: () => undefined,
}));

import { HomeCommandCenter } from './HomeCommandCenter';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { usePlannerStore } from '@/store/plannerStore';
import type { VotingSessionSnapshot } from '@/lib/api/generated/models';

const votingSession = (
  week = '2026-05-04',
  phase: NonNullable<VotingSessionSnapshot['phase']> = 'collecting'
): VotingSessionSnapshot => ({
  incarnationId: '00000000-0000-4000-8000-000000000001',
  revision: 1,
  roundId: '00000000-0000-4000-8000-000000000002',
  weekStartDate: DateOnly.parse(week),
  phase,
  requiredSlots: 3,
  coveredSlots: phase === 'converged' ? 3 : 1,
  candidateCount: 3,
  smartDefaults: { preSelectedRecipes: [], openSlots: [] },
});

describe('HomeCommandCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDiscoveryStore.setState({
      session: null,
      sessionStatus: 'ready',
      refreshSession: vi.fn().mockResolvedValue(undefined),
    });
    mocks.currentRecipe = null;
    mocks.todayStatus = 0;
    mocks.nonCooking = null;
    mocks.todayString = '2026-05-07';
    mocks.loadActiveGoTo.mockResolvedValue(null);
    mocks.saveRecoveryRecipe.mockReset().mockResolvedValue(undefined);
    mocks.readSchedule.mockReset().mockImplementation(async () => ({
      days: [{ date: mocks.todayString, status: 0, recipe: { id: 'replacement-recipe' } }],
    }));
  });

  it('passes completion of the initial active read to the empty pivot without another request', async () => {
    let finish!: (value: null) => void;
    mocks.loadActiveGoTo.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    render(<HomeCommandCenter todaysRecipe={null} />);
    expect(screen.getByTestId('active-read-state')).toHaveTextContent('pending');
    await act(async () => finish(null));
    expect(screen.getByTestId('active-read-state')).toHaveTextContent('settled');
    expect(mocks.loadActiveGoTo).toHaveBeenCalledOnce();
  });

  it.each(['2026-05-04', '2026-05-11', '2026-06-01'])(
    'offers the active collecting round for %s without dismissal',
    async (week) => {
      useDiscoveryStore.setState({ session: votingSession(week), sessionStatus: 'ready' });
      usePlannerStore.setState({ currentWeekOffset: 8, activeTab: 'grocery' });
      render(<HomeCommandCenter todaysRecipe={null} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Vote Now' }));
      expect(mocks.push).toHaveBeenCalledWith('/discovery');
      expect(screen.queryByTestId('voting-nudge-dismiss')).not.toBeInTheDocument();
      expect(screen.queryByText(/on next week|recipes to vote on/)).not.toBeInTheDocument();
      expect(useDiscoveryStore.getState().refreshSession).toHaveBeenCalled();
    }
  );

  it('updates collecting, converged, closed and reopened state from the shared owner', async () => {
    useDiscoveryStore.setState({ session: votingSession(), sessionStatus: 'ready' });
    render(<HomeCommandCenter todaysRecipe={null} />);
    expect(await screen.findByRole('button', { name: 'Vote Now' })).toBeEnabled();
    act(() => useDiscoveryStore.setState({ session: votingSession('2026-06-01', 'converged') }));
    expect(screen.getByText("Menu's In")).toBeVisible();
    expect(screen.getByText('Your matches are ready to review and save.')).toBeVisible();
    usePlannerStore.setState({ currentWeekOffset: 8, activeTab: 'grocery' });
    mocks.todayString = '2026-06-08';
    fireEvent.click(screen.getByRole('button', { name: 'See your matches' }));
    expect(mocks.push).toHaveBeenCalledWith(
      '/planner?weekOffset=0&referenceWeekStartDate=2026-06-01'
    );
    expect(usePlannerStore.getState().activeTab).toBe('planner');
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
    expect(mocks.validatePost).not.toHaveBeenCalled();
    act(() => useDiscoveryStore.setState({ session: { ...votingSession(), phase: 'unowned' } }));
    expect(screen.queryByTestId('voting-nudge-card')).not.toBeInTheDocument();
    act(() =>
      useDiscoveryStore.setState({
        session: { ...votingSession(), roundId: '00000000-0000-4000-8000-000000000003' },
      })
    );
    expect(screen.getByRole('button', { name: 'Vote Now' })).toBeEnabled();
  });

  it.each(['loading', 'unavailable'] as const)(
    'keeps usable last-confirmed navigation during %s',
    async (sessionStatus) => {
      useDiscoveryStore.setState({
        session: votingSession('2026-05-11', 'converged'),
        sessionStatus,
      });
      render(<HomeCommandCenter todaysRecipe={null} />);
      expect(await screen.findByRole('button', { name: 'See your matches' })).toBeEnabled();
      expect(screen.getByTestId('home-voting-status')).toHaveTextContent(
        sessionStatus === 'loading' ? 'Checking voting' : 'last confirmed'
      );
      fireEvent.click(screen.getByRole('button', { name: 'See your matches' }));
      expect(mocks.push).toHaveBeenCalledWith(
        '/planner?weekOffset=0&referenceWeekStartDate=2026-05-11'
      );
      expect(mocks.assignRecipe).not.toHaveBeenCalled();
      expect(mocks.validatePost).not.toHaveBeenCalled();
      if (sessionStatus === 'unavailable') {
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        expect(useDiscoveryStore.getState().refreshSession).toHaveBeenCalledTimes(2);
      }
    }
  );

  it.each([
    null,
    { ...votingSession(), roundId: null },
    { ...votingSession(), weekStartDate: DateOnly.parse('2026-05-05') },
  ])('withholds navigation without a usable accepted identity and Monday', async (session) => {
    useDiscoveryStore.setState({ session, sessionStatus: 'unavailable' });
    render(<HomeCommandCenter todaysRecipe={null} />);
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Vote Now' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'See your matches' })).not.toBeInTheDocument();
  });

  it('shows checking on initial hydration without claiming voting is closed', async () => {
    useDiscoveryStore.setState({ sessionStatus: 'unknown' });
    render(<HomeCommandCenter todaysRecipe={null} />);
    expect(await screen.findByTestId('home-voting-status')).toHaveTextContent('Checking voting');
    expect(screen.queryByTestId('voting-nudge-vote-now')).not.toBeInTheDocument();
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
    expect(screen.getByTestId('pivot-context')).toHaveTextContent('Mystery night mystery');
    fireEvent.click(screen.getByTestId('discover-btn'));
    expect(await screen.findByTestId('quick-find-select')).toBeInTheDocument();
    expect(mocks.markOrderedIn).not.toHaveBeenCalled();
  });

  it('retries unavailable authoritative calendar before navigating to today Search', async () => {
    mocks.calendarFailure = true;
    render(<HomeCommandCenter todaysRecipe={null} todayStatus={0} />);
    fireEvent.click(screen.getByTestId('discover-btn'));
    await screen.findByRole('button', { name: 'Try again' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.push).not.toHaveBeenCalled();
    mocks.calendarFailure = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        '/recipes?addToDay=3&weekOffset=0&referenceWeekStartDate=2026-05-04'
      )
    );
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
  });

  it('opens the existing planner Search for authoritative today without assignment', async () => {
    render(<HomeCommandCenter todaysRecipe={null} todayStatus={0} />);
    fireEvent.click(screen.getByTestId('discover-btn'));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        '/recipes?addToDay=3&weekOffset=0&referenceWeekStartDate=2026-05-04'
      )
    );
    expect(screen.queryByTestId('quick-find-select')).not.toBeInTheDocument();
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
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
    expect(mocks.validatePost).not.toHaveBeenCalled();
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
        intent: 'tomorrow',
        sourceDisposition: 'order_in',
        recipeId: 'recipe-1',
      },
      {
        queryParameters: { referenceWeekStartDate: DateOnly.parse('2026-05-04') },
        options: [expect.objectContaining({ maxRetries: 0 })],
      }
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
      {
        queryParameters: { referenceWeekStartDate: DateOnly.parse('2026-05-04') },
        options: [expect.objectContaining({ maxRetries: 0 })],
      }
    );
    expect(mocks.saveRecoveryRecipe).toHaveBeenCalledWith(
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
      {
        queryParameters: { referenceWeekStartDate: DateOnly.parse('2026-05-04') },
        options: [expect.objectContaining({ maxRetries: 0 })],
      }
    );
    expect(mocks.saveRecoveryRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'replacement-recipe' }),
      expect.objectContaining({ today: '2026-05-10', referenceWeekStartDate: '2026-05-04' })
    );
  });
});

describe('atomic Tomorrow disposition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('does not validate Order In before a rejected Tomorrow and retains recovery', async () => {
    mocks.currentRecipe = { id: 'recipe-1', name: 'Pasta', image: '/img/pasta' };
    mocks.movePost.mockRejectedValueOnce({
      responseStatusCode: 409,
      message: 'A cooked meal blocks this move.',
    });
    render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);
    fireEvent.click(screen.getByTestId('skip-btn'));
    fireEvent.click(screen.getByTestId('recovery-action-order-in'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
    });
    expect(mocks.validatePost).not.toHaveBeenCalled();
    expect(mocks.applyServerUpdate).not.toHaveBeenCalled();
    expect(mocks.movePost).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'tomorrow', sourceDisposition: 'order_in' }),
      expect.anything()
    );
    expect(mocks.assignRecipe).not.toHaveBeenCalled();
    expect(screen.getByTestId('recovery-action-tomorrow')).toBeVisible();
    expect(mocks.addToast).toHaveBeenCalled();
  });
});

it('keeps recovery open until the replacement save is acknowledged', async () => {
  vi.clearAllMocks();
  mocks.readSchedule.mockResolvedValue({
    days: [{ date: mocks.todayString, status: 0, recipe: { id: 'replacement-recipe' } }],
  });
  mocks.currentRecipe = { id: 'planned-recipe', name: 'Pasta', image: '' };
  let finish!: () => void;
  mocks.saveRecoveryRecipe.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finish = resolve;
    })
  );
  render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);
  fireEvent.click(screen.getByTestId('skip-btn'));
  fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
  fireEvent.click(screen.getByTestId('quick-find-select'));
  await act(async () => {
    fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
  });
  expect(mocks.movePost).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('recovery-action-tomorrow')).toBeInTheDocument();
  expect(mocks.push).not.toHaveBeenCalled();
  await act(async () => finish());
  await waitFor(() =>
    expect(screen.queryByTestId('recovery-action-tomorrow')).not.toBeInTheDocument()
  );
});

describe('Home acknowledged replacement recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentRecipe = { id: 'original', name: 'A', image: '' };
    mocks.todayStatus = 0;
    mocks.nonCooking = null;
    mocks.todayString = '2026-05-07';
    mocks.saveRecoveryRecipe.mockReset().mockResolvedValue(undefined);
    mocks.readSchedule.mockReset().mockImplementation(async () => ({
      days: [{ date: '2026-05-07', recipe: { id: 'replacement-recipe' }, status: 0 }],
    }));
    mocks.deferPost.mockReset().mockResolvedValue({ data: { scheduledDate: '2026-05-11' } });
    mocks.removeDelete.mockReset().mockResolvedValue(undefined);
  });
  const open = async (action = 'tomorrow') => {
    render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);
    fireEvent.click(screen.getByTestId('skip-btn'));
    fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
    fireEvent.click(screen.getByTestId('quick-find-select'));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`recovery-action-${action}`));
    });
  };
  it.each(['next-week', 'drop'])(
    'retries only save after %s and keeps the captured date',
    async (action) => {
      mocks.saveRecoveryRecipe.mockRejectedValueOnce({ responseStatusCode: 400 });
      mocks.readSchedule.mockResolvedValueOnce({
        days: [{ date: '2026-05-07', recipe: null, status: 0 }],
      });
      await open(action);
      mocks.todayString = '2026-05-08';
      await act(async () => {
        fireEvent.click(screen.getByTestId('retry-replacement'));
      });
      expect(action === 'drop' ? mocks.removeDelete : mocks.deferPost).toHaveBeenCalledTimes(1);
      expect(mocks.saveRecoveryRecipe).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'replacement-recipe' }),
        expect.objectContaining({ today: '2026-05-07', referenceWeekStartDate: '2026-05-04' })
      );
    }
  );
  it('recognizes a committed replacement after a lost response without another POST', async () => {
    mocks.saveRecoveryRecipe.mockRejectedValueOnce({ responseStatusCode: 504 });
    await open();
    expect(mocks.readSchedule).toHaveBeenCalledWith(0, '2026-05-04', true);
    expect(screen.queryByTestId('retry-replacement')).not.toBeInTheDocument();
    expect(mocks.saveRecoveryRecipe).toHaveBeenCalledTimes(1);
    expect(mocks.movePost).toHaveBeenCalledTimes(1);
  });
  it('offers Retry check when an uncertain save cannot be read', async () => {
    mocks.saveRecoveryRecipe.mockRejectedValueOnce({ responseStatusCode: 504 });
    mocks.readSchedule.mockRejectedValueOnce(new Error('Offline'));
    await open();
    expect(screen.getByText(/could not be confirmed/i)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('retry-replacement'));
    });
    expect(mocks.saveRecoveryRecipe).toHaveBeenCalledTimes(1);
    expect(mocks.movePost).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('retry-replacement')).not.toBeInTheDocument();
  });
  it('protects remote completed or non-cooking content after uncertain save', async () => {
    mocks.saveRecoveryRecipe.mockRejectedValueOnce({ responseStatusCode: 409 });
    mocks.readSchedule.mockResolvedValue({
      days: [{ date: '2026-05-07', recipe: null, status: 3, nonCooking: { kind: 'order_in' } }],
    });
    await open();
    expect(screen.getByText(/plan changed/i)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('retry-replacement'));
    });
    expect(mocks.saveRecoveryRecipe).toHaveBeenCalledTimes(1);
    expect(mocks.applyServerUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 3, nonCooking: { kind: 'order_in' } })
    );
  });
  it('does not replay an unknown defer even when source is empty', async () => {
    mocks.deferPost.mockRejectedValueOnce({ responseStatusCode: 504 });
    mocks.readSchedule.mockResolvedValue({
      days: [{ date: '2026-05-07', recipe: null, status: 0 }],
    });
    await open('next-week');
    expect(screen.getByText(/original meal could not be confirmed/i)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('retry-replacement'));
    });
    expect(mocks.deferPost).toHaveBeenCalledTimes(1);
    expect(mocks.saveRecoveryRecipe).not.toHaveBeenCalled();
  });
  it('keeps confirmed save after refresh failure and refreshes without another mutation', async () => {
    mocks.readSchedule.mockRejectedValueOnce(new Error('Read failed'));
    await open();
    expect(screen.getByText(/new meal is saved/i)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('retry-replacement'));
    });
    expect(mocks.saveRecoveryRecipe).toHaveBeenCalledTimes(1);
    expect(mocks.movePost).toHaveBeenCalledTimes(1);
  });
});

it('disables transport replay for a Pick Something Else defer', async () => {
  vi.clearAllMocks();
  mocks.currentRecipe = { id: 'original', name: 'A', image: '' };
  mocks.deferPost.mockResolvedValueOnce({ data: {} });
  mocks.saveRecoveryRecipe.mockResolvedValueOnce(undefined);
  mocks.readSchedule.mockResolvedValue({
    days: [{ date: mocks.todayString, status: 0, recipe: { id: 'replacement-recipe' } }],
  });
  render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);
  fireEvent.click(screen.getByTestId('skip-btn'));
  fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
  fireEvent.click(screen.getByTestId('quick-find-select'));
  await act(async () => {
    fireEvent.click(screen.getByTestId('recovery-action-next-week'));
  });
  expect(mocks.deferPost).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ options: [expect.objectContaining({ maxRetries: 0 })] })
  );
});

it('ignores a late replacement reconciliation after Home unmounts', async () => {
  vi.clearAllMocks();
  mocks.currentRecipe = { id: 'original', name: 'A', image: '' };
  mocks.saveRecoveryRecipe.mockRejectedValueOnce({ responseStatusCode: 504 });
  let release!: (data: any) => void;
  mocks.readSchedule.mockReturnValueOnce(
    new Promise((resolve) => {
      release = resolve;
    })
  );
  const view = render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);
  fireEvent.click(screen.getByTestId('skip-btn'));
  fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
  fireEvent.click(screen.getByTestId('quick-find-select'));
  await act(async () => {
    fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
  });
  view.unmount();
  mocks.applyServerUpdate.mockClear();
  await act(async () =>
    release({
      days: [{ date: mocks.todayString, status: 0, recipe: { id: 'replacement-recipe' } }],
    })
  );
  expect(mocks.applyServerUpdate).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
});

it.each([400, 504])(
  'recognizes saved state after error %s when Kiota decodes null nonCooking as an empty object',
  async (status) => {
    vi.clearAllMocks();
    mocks.currentRecipe = { id: 'original', name: 'A', image: '' };
    mocks.saveRecoveryRecipe.mockRejectedValueOnce({ responseStatusCode: status });
    mocks.readSchedule.mockResolvedValue({
      days: [
        {
          date: mocks.todayString,
          status: 0,
          recipe: { id: 'replacement-recipe' },
          nonCooking: {},
        },
      ],
    });
    render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);
    fireEvent.click(screen.getByTestId('skip-btn'));
    fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
    fireEvent.click(screen.getByTestId('quick-find-select'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
    });
    expect(screen.queryByTestId('retry-replacement')).not.toBeInTheDocument();
    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/plan updates could not be confirmed/),
      })
    );
  }
);

it('can leave after a confirmed save and failed refresh without claiming the meal is unsaved', async () => {
  vi.clearAllMocks();
  mocks.currentRecipe = { id: 'original', name: 'A', image: '' };
  mocks.saveRecoveryRecipe.mockResolvedValueOnce(undefined);
  mocks.readSchedule.mockRejectedValueOnce(new Error('Read failed'));
  render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);
  fireEvent.click(screen.getByTestId('skip-btn'));
  fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
  fireEvent.click(screen.getByTestId('quick-find-select'));
  await act(async () => {
    fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
  });
  expect(screen.getByText(/new meal is saved/i)).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('recovery-close'));
  expect(screen.queryByTestId('recovery-close')).not.toBeInTheDocument();
  expect(mocks.saveRecoveryRecipe).toHaveBeenCalledTimes(1);
});

it('retains the server destination toast when Pick Something Else defers the original', async () => {
  vi.clearAllMocks();
  mocks.currentRecipe = { id: 'original', name: 'A', image: '' };
  mocks.deferPost.mockResolvedValueOnce({ data: { message: 'Moved meal to Monday, May 18.' } });
  mocks.saveRecoveryRecipe.mockResolvedValueOnce(undefined);
  mocks.readSchedule.mockResolvedValue({
    days: [{ date: mocks.todayString, status: 0, recipe: { id: 'replacement-recipe' } }],
  });
  render(<HomeCommandCenter todaysRecipe={mocks.currentRecipe} todayStatus={0} />);
  fireEvent.click(screen.getByTestId('skip-btn'));
  fireEvent.click(screen.getByTestId('recovery-action-pick-else'));
  fireEvent.click(screen.getByTestId('quick-find-select'));
  await act(async () => {
    fireEvent.click(screen.getByTestId('recovery-action-next-week'));
  });
  expect(mocks.addToast).toHaveBeenCalledWith('Moved meal to Monday, May 18.');
  expect(mocks.deferPost).toHaveBeenCalledTimes(1);
});
