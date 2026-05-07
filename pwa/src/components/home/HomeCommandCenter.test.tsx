import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  markOrderedIn: vi.fn(),
  applySlotUpdate: vi.fn(),
  weekInit: vi.fn().mockResolvedValue(undefined),
  loadSetting: vi.fn(),
  push: vi.fn(),
  assignRecipe: vi.fn(),
  sync: vi.fn(),
  movePost: vi.fn().mockResolvedValue(undefined),
  currentRecipe: null as any,
  todayStatus: 0 as 0 | 2 | 3,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

vi.mock('@/lib/imageUtils', () => ({
  getTodayString: () => '2026-05-07',
}));

vi.mock('@/components/home/HomeSections', () => ({
  QuickCaptureTrigger: () => null,
  CookedSuccessCard: () => null,
  VotingNudgeCard: () => null,
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
  SkipRecoveryDialog: ({ step, onAction }: { step: 1 | 2; onAction: (action: any) => void }) => (
    <div>
      {step === 1 ? (
        <button data-testid="recovery-action-order-in" onClick={() => onAction('order_in')}>
          Order In
        </button>
      ) : (
        <button data-testid="recovery-action-tomorrow" onClick={() => onAction('tomorrow')}>
          Tomorrow
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/planner/QuickFindModal', () => ({
  QuickFindModal: () => null,
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
  useTodayStore: () => ({
    currentRecipe: mocks.currentRecipe,
    status: mocks.todayStatus,
    isLoading: false,
    assignRecipe: mocks.assignRecipe,
    markCooked: vi.fn(),
    markOrderedIn: mocks.markOrderedIn,
    sync: mocks.sync,
  }),
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
    await act(async () => {
      fireEvent.click(screen.getByTestId('recovery-action-tomorrow'));
    });

    expect(mocks.markOrderedIn).toHaveBeenCalledTimes(1);
    expect(mocks.applySlotUpdate).toHaveBeenCalledWith({
      date: '2026-05-07',
      recipe: null,
      status: 3,
    });
    expect(mocks.movePost).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mocks.weekInit).toHaveBeenCalledWith(0);
      expect(mocks.sync).toHaveBeenCalled();
    });
  });
});