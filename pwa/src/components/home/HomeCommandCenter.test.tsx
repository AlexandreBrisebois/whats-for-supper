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
  removeDelete: vi.fn().mockResolvedValue(undefined),
  validatePost: vi.fn().mockResolvedValue(undefined),
  currentRecipe: null as any,
  todayStatus: 0 as 0 | 2 | 3,
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
  TonightPivotCard: ({ onOrderIn }: { onOrderIn: () => void }) => (
    <button data-testid="order-in-btn" onClick={onOrderIn}>
      Order In
    </button>
  ),
}));

vi.mock('@/components/home/TonightMenuCard', () => ({
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

vi.mock('@/store/todayStore', () => ({
  useTodayStore: Object.assign(
    () => ({
      currentRecipe: mocks.currentRecipe,
      status: mocks.todayStatus,
      isLoading: false,
      assignRecipe: mocks.assignRecipe,
      markCooked: vi.fn(),
      markOrderedIn: mocks.markOrderedIn,
      sync: mocks.sync,
    }),
    {
      getState: () => ({
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

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: () => ({
    loadSetting: mocks.loadSetting,
    familySettings: {},
  }),
}));

vi.mock('@/store/gotoStore', () => ({
  useGotoStore: () => ({
    readyRecipeId: null,
  }),
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      schedule: {
        move: {
          post: mocks.movePost,
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

vi.mock('@/lib/api/planner', () => ({
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
    mocks.todayString = '2026-05-07';
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

    expect(mocks.applyServerUpdate).toHaveBeenCalledWith({ recipe: null, status: 3 });
    expect(mocks.applySlotUpdate).toHaveBeenCalledWith({
      date: '2026-05-07',
      recipe: null,
      status: 3,
    });
    expect(mocks.validatePost).toHaveBeenCalledWith({ status: 3 });
    expect(mocks.movePost).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mocks.weekInit).toHaveBeenCalledWith(0);
      expect(mocks.sync).toHaveBeenCalled();
      expect(mocks.push).toHaveBeenCalledWith('/planner');
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

    expect(mocks.movePost).toHaveBeenCalledWith({
      weekOffset: 0,
      fromIndex: 6,
      toIndex: 0,
      targetWeekOffset: 1,
      intent: 'push',
      recipeId: 'recipe-1',
    });
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

  it('navigates to planner after saving tonight for next week', async () => {
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
      expect(mocks.movePost).toHaveBeenCalledTimes(1);
      expect(mocks.push).toHaveBeenCalledWith('/planner');
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
      expect.objectContaining({ recipeId: 'planned-recipe' })
    );
    expect(mocks.assignRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'replacement-recipe' })
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
      expect(mocks.push).toHaveBeenCalledWith('/planner');
    });
  });
});
