import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  let weekState: any;
  let plannerState: any;
  let searchParams = '';

  return {
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
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Reorder: {
    Group: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    Item: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  useDragControls: () => ({}),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string) => fallback,
}));

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
  usePlannerStore: () => mocks.getPlannerState(),
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

vi.mock('@/store/todayStore', () => ({
  useTodayStore: {
    getState: () => ({ assignRecipe: vi.fn() }),
  },
}));

vi.mock('@/lib/api/planner', () => ({
  lockSchedule: vi.fn().mockResolvedValue(undefined),
  assignRecipeToDay: vi.fn().mockResolvedValue(undefined),
  openVoting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      schedule: {
        day: {
          byDate: () => ({
            validate: { post: vi.fn().mockResolvedValue(undefined) },
          }),
        },
      },
    },
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
  PlanningPivotSheet: () => null,
}));

vi.mock('@/components/planner/QuickFindModal', () => ({
  QuickFindModal: () => null,
}));

vi.mock('@/components/ui/SolarLoader', () => ({
  SolarLoader: () => null,
}));

vi.mock('@/components/planner/CooksMode', () => ({
  CooksMode: () => null,
}));

vi.mock('@/components/planner/GroceryList', () => ({
  GroceryList: () => null,
}));

vi.mock('@/components/planner/BalanceIndicator', () => ({
  BalanceIndicator: () => null,
}));

vi.mock('@/components/home/SkipRecoveryDialog', () => ({
  SkipRecoveryDialog: () => null,
}));

import PlannerPage from './page';

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

function renderPlanner(status: 0 | 1 | 2, sundayDate = '2026-05-17') {
  mocks.setPlannerState({
    currentWeekOffset: 0,
    activeTab: 'planner',
    setWeekOffset: mocks.setWeekOffset,
    setActiveTab: mocks.setActiveTab,
    setGroceryState: mocks.setGroceryState,
  });
  mocks.setWeekState({
    balanceSummary: null,
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
  });

  return render(<PlannerPage />);
}

describe('PlannerPage voting action row', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setSearchParams('');
    mocks.getVotingLink.mockResolvedValue('http://example.com/discovery');

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

  it('shows Ask the Family for a draft non-past week', () => {
    renderPlanner(0);

    expect(screen.getByTestId('ask-family-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('nudge-family-cta')).not.toBeInTheDocument();
  });

  it('shows Ask the Family for a locked non-past week', () => {
    renderPlanner(2);

    expect(screen.getByTestId('ask-family-cta')).toBeInTheDocument();
  });

  it('shows live voting controls for a voting-open week', () => {
    renderPlanner(1);

    expect(screen.queryByTestId('ask-family-cta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('voting-status-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('close-voting-btn')).toBeInTheDocument();
    expect(screen.getByTestId('nudge-family-cta')).toBeInTheDocument();
    expect(screen.getByTestId('planned-count-badge')).toBeInTheDocument();

    const actionRow = screen.getByTestId('planner-action-row');
    expect(within(actionRow).getAllByRole('button')[0]).toBe(
      screen.getByTestId('nudge-family-cta')
    );
  });

  it('hides Ask the Family for past draft and locked weeks', () => {
    const { unmount } = renderPlanner(0, '2026-05-03');
    expect(screen.queryByTestId('ask-family-cta')).not.toBeInTheDocument();

    unmount();
    renderPlanner(2, '2026-05-03');
    expect(screen.queryByTestId('ask-family-cta')).not.toBeInTheDocument();
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
});
