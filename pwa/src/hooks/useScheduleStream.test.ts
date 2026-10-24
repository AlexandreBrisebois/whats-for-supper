/**
 * Unit tests for useScheduleStream hook.
 *
 * Strategy: mock EventSource globally, then call the hook inside renderHook.
 * Each test fires a synthetic MessageEvent and asserts the correct store
 * method was called with the correct arguments.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSearchPromotionStore } from '@/store/searchPromotionStore';

// ── Store mock factories ─────────────────────────────────────────────────────
// Define the mock functions at module scope so they are accessible in tests.

const mockClearOptimisticGuard = vi.fn();
const mockApplyServerUpdate = vi.fn();
const mockApplySnapshot = vi.fn();
const mockApplySlotUpdate = vi.fn();
const mockApplyVoteUpdate = vi.fn();
const mockApplySmartDefaultsUpdate = vi.fn();
const mockInvalidateFillTheGap = vi.fn();
const mockInvalidateAllSuggestions = vi.fn();
const mockDiscoveryApplyVoteUpdate = vi.fn();
const mockSetActiveCategory = vi.fn();
const mockApplySession = vi.fn();
const mockRefreshSession = vi.fn().mockResolvedValue(undefined);
const mockMarkReady = vi.fn();
const mockSetGroceryState = vi.fn();
const mockApplyGroceryExtrasUpdate = vi.fn();

// weekStore weekOffset — default to 0; tests can override via mockWeekOffset
let mockSession: { phase: string; weekStartDate: string | null } | null = null;
let mockWeekOffset = 0;
let mockWeekStartDate = '2025-01-13';
let mockCalendar = {
  timeZone: 'UTC',
  capturedAtUtc: '2025-01-15T12:00:00Z',
  today: '2025-01-15',
  currentWeekStartDate: '2025-01-13',
  referenceWeekStartDate: '2025-01-13',
  nextDayAtUtc: '2025-01-16T00:00:00Z',
};
const mockWeekSync = vi.fn().mockResolvedValue(undefined);
const mockInvalidateCalendar = vi.fn();

// captureStore mock — getPending returns undefined by default; tests override as needed
const mockGetPending = vi.fn<
  () => { recipeId: string; name?: string; submittedAt: number } | undefined
>(() => undefined);
const mockRemovePending = vi.fn();

// libraryStore mock
const mockPushNotification = vi.fn();

vi.mock('@/store/todayStore', () => ({
  useTodayStore: {
    getState: () => ({
      sync: mockWeekSync,
      calendar: mockCalendar,
      calendarIsFresh: () => true,
      ensureCalendar: async () => mockCalendar,
      invalidateCalendar: mockInvalidateCalendar,
      clearOptimisticGuard: mockClearOptimisticGuard,
      applyServerUpdate: mockApplyServerUpdate,
    }),
  },
}));

vi.mock('@/store/weekStore', () => ({
  useWeekStore: {
    getState: () => ({
      weekOffset: mockWeekOffset,
      weekStartDate: mockWeekStartDate,
      calendar: mockCalendar,
      sync: mockWeekSync,
      applySnapshot: mockApplySnapshot,
      applySlotUpdate: mockApplySlotUpdate,
      applyVoteUpdate: mockApplyVoteUpdate,
      applySmartDefaultsUpdate: mockApplySmartDefaultsUpdate,
      applyGroceryExtrasUpdate: mockApplyGroceryExtrasUpdate,
    }),
  },
}));

vi.mock('@/store/discoveryStore', () => ({
  useDiscoveryStore: {
    getState: () => ({
      invalidateFillTheGap: mockInvalidateFillTheGap,
      invalidateAllSuggestions: mockInvalidateAllSuggestions,
      applyVoteUpdate: mockDiscoveryApplyVoteUpdate,
      setActiveCategory: mockSetActiveCategory,
      session: mockSession,
      applySession: mockApplySession,
      refreshSession: mockRefreshSession,
    }),
  },
}));

vi.mock('@/store/gotoStore', () => ({
  useGotoStore: {
    getState: () => ({
      markReady: mockMarkReady,
    }),
  },
}));

vi.mock('@/store/captureStore', () => ({
  useCaptureStore: {
    getState: () => ({
      getPending: mockGetPending,
      removePending: mockRemovePending,
    }),
  },
}));

vi.mock('@/store/libraryStore', () => ({
  useLibraryStore: {
    getState: () => ({
      pushNotification: mockPushNotification,
    }),
  },
}));

vi.mock('@/store/plannerStore', () => ({
  usePlannerStore: {
    getState: () => ({
      setGroceryState: mockSetGroceryState,
    }),
  },
}));

// getTodayString returns a fixed date so slot_updated tests are deterministic
vi.mock('@/lib/imageUtils', () => ({
  getTodayString: vi.fn(() => '2025-01-15'),
}));

// Import the hook AFTER mocks are set up
import { useScheduleStream } from './useScheduleStream';

// ── EventSource mock ─────────────────────────────────────────────────────────

type EventHandler = (event: MessageEvent) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  withCredentials: boolean;
  onerror: (() => void) | null = null;

  private listeners: Map<string, EventHandler[]> = new Map();

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: EventHandler) {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(type, [...existing, handler]);
  }

  /** Helper: fire a named event with a JSON payload. */
  emit(type: string, data: unknown) {
    const handlers = this.listeners.get(type) ?? [];
    const event = { data: JSON.stringify(data) } as MessageEvent;
    handlers.forEach((h) => h(event));
  }

  close = vi.fn();
}

// ── Test setup ───────────────────────────────────────────────────────────────

let originalEventSource: typeof EventSource;

beforeEach(() => {
  originalEventSource = global.EventSource;
  // @ts-expect-error — replacing with mock
  global.EventSource = MockEventSource;
  MockEventSource.instances = [];
  mockSession = null;
  mockWeekOffset = 0;
  mockWeekStartDate = '2025-01-13';
  mockCalendar = {
    timeZone: 'UTC',
    capturedAtUtc: '2025-01-15T12:00:00Z',
    today: '2025-01-15',
    currentWeekStartDate: '2025-01-13',
    referenceWeekStartDate: '2025-01-13',
    nextDayAtUtc: '2025-01-16T00:00:00Z',
  };
  vi.clearAllMocks();
  useSearchPromotionStore.getState().reset();
});

afterEach(() => {
  global.EventSource = originalEventSource;
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupHook(baseUrl = 'http://localhost:5000') {
  process.env.NEXT_PUBLIC_API_BASE_URL = baseUrl;
  const result = renderHook(() => useScheduleStream());
  const source = MockEventSource.instances[0];
  return { result, source };
}

// ── URL resolution ───────────────────────────────────────────────────────────
// NEXT_PUBLIC_API_BASE_URL is intentionally empty in production — Traefik
// routes /api/ directly. The hook must connect via a relative path in that
// case, not skip the connection.

describe('URL resolution', () => {
  it('uses relative /api/stream when NEXT_PUBLIC_API_BASE_URL is undefined', () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    renderHook(() => useScheduleStream());

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/stream');
  });

  it('uses relative /api/stream when NEXT_PUBLIC_API_BASE_URL is empty string', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = '';

    renderHook(() => useScheduleStream());

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/stream');
  });

  it('creates EventSource with correct absolute URL when base URL is set', () => {
    const { source } = setupHook('http://localhost:5000');

    expect(source).toBeDefined();
    expect(source.url).toBe('http://localhost:5000/api/stream');
  });

  it('creates EventSource with withCredentials: true', () => {
    const { source } = setupHook('https://api.example.com');

    expect(source.withCredentials).toBe(true);
  });
});

// ── connected event ──────────────────────────────────────────────────────────

describe('connected event', () => {
  it('does NOT call clearOptimisticGuard on todayStore (reconnect suppression)', () => {
    const { source } = setupHook();

    source.emit('connected', { schedule: { days: [] } });

    expect(mockClearOptimisticGuard).not.toHaveBeenCalled();
  });

  it('calls applySnapshot on weekStore with the schedule', () => {
    const { source } = setupHook();

    const schedule = { days: [{ date: '2025-01-15' }] };
    source.emit('connected', { schedule });

    expect(mockApplySnapshot).toHaveBeenCalledWith(schedule);
  });

  it('refreshes the selected week after the document becomes visible', () => {
    setupHook();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });

    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockWeekSync).toHaveBeenCalled();
  });

  it('refreshes the selected next-week view when reconnect only supplies current week', () => {
    mockWeekOffset = 1;
    mockWeekStartDate = '2025-01-20';
    const { source } = setupHook();
    const schedule = { weekStartDate: '2025-01-13', days: [] };

    source.emit('connected', { schedule });

    expect(mockWeekSync).toHaveBeenCalled();
    expect(mockApplySnapshot).not.toHaveBeenCalled();
  });
});

// ── slot_updated event ───────────────────────────────────────────────────────

describe('slot_updated event', () => {
  it('invalidates the Search-only promotion generation', () => {
    const { source } = setupHook();

    source.emit('slot_updated', { date: '2026-09-20', recipe: null, status: 0 });

    expect(useSearchPromotionStore.getState().version).toBe(1);
  });
  it('calls applyServerUpdate on todayStore when date matches today', () => {
    const { source } = setupHook();

    const recipe = { id: 'r1', name: 'Pasta', image: '' };
    source.emit('slot_updated', { date: '2025-01-15', recipe, status: 0 });

    expect(mockApplyServerUpdate).toHaveBeenCalledWith({ date: '2025-01-15', recipe, status: 0 });
  });

  it('does NOT call applyServerUpdate on todayStore when date does not match today', () => {
    const { source } = setupHook();

    source.emit('slot_updated', { date: '2025-01-20', recipe: null, status: 0 });

    expect(mockApplyServerUpdate).not.toHaveBeenCalled();
  });

  it('always calls applySlotUpdate on weekStore', () => {
    const { source } = setupHook();

    const recipe = { id: 'r1', name: 'Pasta', image: '' };
    source.emit('slot_updated', { date: '2025-01-15', recipe, status: 0 });

    expect(mockApplySlotUpdate).toHaveBeenCalledWith({
      date: '2025-01-15',
      recipe,
      status: 0,
    });
  });

  it('calls applySlotUpdate for non-today dates too', () => {
    const { source } = setupHook();

    source.emit('slot_updated', { date: '2025-01-20', recipe: null, status: 3 });

    expect(mockApplySlotUpdate).toHaveBeenCalledWith({
      date: '2025-01-20',
      recipe: null,
      status: 3,
    });
  });
});

// ── week_updated event ───────────────────────────────────────────────────────

describe('week_updated event', () => {
  it('calls applySnapshot on weekStore with schedule and no echoSeq for another member move', () => {
    const { source } = setupHook();

    const schedule = { days: [], status: 2 };
    source.emit('week_updated', { schedule });

    expect(mockApplySnapshot).toHaveBeenCalledWith(schedule, undefined);
  });

  it('calls applySnapshot with echoSeq when server echoes our own move', () => {
    const { source } = setupHook();

    const schedule = { days: [], status: 0 };
    source.emit('week_updated', { schedule, echoSeq: 42 });

    expect(mockApplySnapshot).toHaveBeenCalledWith(schedule, 42);
  });

  it('updates todayStore when week_updated contains today’s date', () => {
    const { source } = setupHook();

    const recipe = { id: 'r-today', name: 'Today’s Pasta', image: '' };
    const schedule = {
      weekStartDate: '2025-01-13',
      days: [
        { date: '2025-01-15', recipe, status: 1 }, // today
        { date: '2025-01-16', recipe: null, status: 0 },
      ],
      status: 0,
    };

    source.emit('week_updated', { schedule });

    expect(mockApplyServerUpdate).toHaveBeenCalledWith({
      date: '2025-01-15',
      recipe,
      status: 1,
      nonCooking: null,
    });
  });
});

// ── vote_updated event ───────────────────────────────────────────────────────

describe('vote_updated event', () => {
  it('calls applyVoteUpdate on weekStore with recipeId and voteCount', () => {
    const { source } = setupHook();

    source.emit('vote_updated', { recipeId: 'recipe-abc', voteCount: 3 });

    expect(mockApplyVoteUpdate).toHaveBeenCalledWith({
      recipeId: 'recipe-abc',
      voteCount: 3,
    });
  });

  it('also calls applyVoteUpdate on discoveryStore with recipeId and voteCount', () => {
    const { source } = setupHook();

    source.emit('vote_updated', { recipeId: 'recipe-abc', voteCount: 3 });

    expect(mockDiscoveryApplyVoteUpdate).toHaveBeenCalledWith({
      recipeId: 'recipe-abc',
      voteCount: 3,
    });
  });
});

// ── smart_defaults_updated event ─────────────────────────────────────────────

describe('smart_defaults_updated event', () => {
  it('calls applySmartDefaultsUpdate on weekStore with defaults for current week', () => {
    const { source } = setupHook();

    const defaults = {
      weekOffset: 0,
      weekStartDate: '2025-01-13',
      preSelectedRecipes: [{ dayIndex: 0, recipeId: 'r1' }],
    };
    source.emit('smart_defaults_updated', { defaults });

    expect(mockApplySmartDefaultsUpdate).toHaveBeenCalledWith(defaults);
  });

  it('ignores smart defaults for a different weekOffset', () => {
    const { source } = setupHook();
    mockWeekOffset = 0;

    const defaults = {
      weekOffset: 1,
      weekStartDate: '2025-01-20',
      preSelectedRecipes: [{ dayIndex: 0, recipeId: 'r1' }],
    };
    source.emit('smart_defaults_updated', { defaults });

    expect(mockApplySmartDefaultsUpdate).not.toHaveBeenCalled();
  });
});

// ── fill_the_gap_invalidated event ───────────────────────────────────────────

describe('fill_the_gap_invalidated event', () => {
  it('refreshes all suggestion weeks for a household rotation or history change', () => {
    const { source } = setupHook();
    source.emit('fill_the_gap_invalidated', { allWeeks: true });
    expect(mockInvalidateAllSuggestions).toHaveBeenCalledOnce();
    expect(mockInvalidateFillTheGap).not.toHaveBeenCalled();
  });
  it('calls invalidateFillTheGap on discoveryStore with weekOffset', () => {
    const { source } = setupHook();

    source.emit('fill_the_gap_invalidated', { weekOffset: 0, weekStartDate: '2025-01-13' });

    expect(mockInvalidateFillTheGap).toHaveBeenCalledWith(0);
  });

  it('passes the weekOffset value through correctly', () => {
    const { source } = setupHook();

    source.emit('fill_the_gap_invalidated', { weekOffset: 1, weekStartDate: '2025-01-20' });

    expect(mockInvalidateFillTheGap).toHaveBeenCalledWith(1);
  });
});

// ── recipe_ready event ───────────────────────────────────────────────────────

describe('recipe_ready event', () => {
  it('always calls markReady on gotoStore with recipeId', () => {
    const { source } = setupHook();

    source.emit('recipe_ready', { recipeId: 'recipe-xyz', name: 'Pasta', imageUrl: null });

    expect(mockMarkReady).toHaveBeenCalledWith('recipe-xyz');
  });

  it('does NOT call removePending or pushNotification when recipe is not in captureStore', () => {
    mockGetPending.mockReturnValueOnce(undefined);
    const { source } = setupHook();

    source.emit('recipe_ready', { recipeId: 'recipe-xyz', name: 'Pasta', imageUrl: null });

    expect(mockRemovePending).not.toHaveBeenCalled();
    expect(mockPushNotification).not.toHaveBeenCalled();
  });

  it('calls removePending and pushNotification when recipe IS in captureStore', () => {
    mockGetPending.mockReturnValueOnce({
      recipeId: 'recipe-xyz',
      name: 'My Recipe',
      submittedAt: Date.now(),
    });
    const { source } = setupHook();

    source.emit('recipe_ready', {
      recipeId: 'recipe-xyz',
      name: 'Pasta Bake',
      imageUrl: 'https://img.example.com/pasta.jpg',
    });

    expect(mockRemovePending).toHaveBeenCalledWith('recipe-xyz');
    expect(mockPushNotification).toHaveBeenCalledWith({
      recipeId: 'recipe-xyz',
      name: 'Pasta Bake',
      imageUrl: 'https://img.example.com/pasta.jpg',
      type: 'ready',
    });
  });

  it('falls back to pending.name when SSE payload name is absent', () => {
    mockGetPending.mockReturnValueOnce({
      recipeId: 'recipe-xyz',
      name: 'Pending Name',
      submittedAt: Date.now(),
    });
    const { source } = setupHook();

    source.emit('recipe_ready', { recipeId: 'recipe-xyz' });

    expect(mockPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Pending Name' })
    );
  });
});

// ── recipe_failed event ──────────────────────────────────────────────────────

describe('recipe_failed event', () => {
  it('does NOT call removePending or pushNotification when recipe is not in captureStore', () => {
    mockGetPending.mockReturnValueOnce(undefined);
    const { source } = setupHook();

    source.emit('recipe_failed', {
      recipeId: 'recipe-fail',
      workflowInstanceId: 'workflow-fail',
      errorMessage: 'Timeout',
      failedStep: 'image_generation',
      partialData: null,
    });

    expect(mockRemovePending).not.toHaveBeenCalled();
    expect(mockPushNotification).not.toHaveBeenCalled();
  });

  it('calls removePending and pushNotification with type failed when recipe IS in captureStore', () => {
    mockGetPending.mockReturnValueOnce({
      recipeId: 'recipe-fail',
      name: 'My Dish',
      submittedAt: Date.now(),
    });
    const { source } = setupHook();

    source.emit('recipe_failed', {
      recipeId: 'recipe-fail',
      workflowInstanceId: 'workflow-fail',
      errorMessage: 'Timeout',
      failedStep: 'image_generation',
      partialData: { name: 'My Dish', imageUrl: undefined },
    });

    expect(mockRemovePending).toHaveBeenCalledWith('recipe-fail');
    expect(mockPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipeId: 'recipe-fail',
        workflowInstanceId: 'workflow-fail',
        type: 'failed',
        errorMessage: 'Timeout',
        failedStep: 'image_generation',
      })
    );
  });

  it('uses partialData.name when available for the notification name', () => {
    mockGetPending.mockReturnValueOnce({
      recipeId: 'recipe-fail',
      name: 'Pending Name',
      submittedAt: Date.now(),
    });
    const { source } = setupHook();

    source.emit('recipe_failed', {
      recipeId: 'recipe-fail',
      workflowInstanceId: 'workflow-fail',
      errorMessage: 'Error',
      failedStep: 'synthesis',
      partialData: { name: 'Partial Name' },
    });

    expect(mockPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Partial Name' })
    );
  });

  it('falls back to pending.name when partialData has no name', () => {
    mockGetPending.mockReturnValueOnce({
      recipeId: 'recipe-fail',
      name: 'Pending Name',
      submittedAt: Date.now(),
    });
    const { source } = setupHook();

    source.emit('recipe_failed', {
      recipeId: 'recipe-fail',
      workflowInstanceId: 'workflow-fail',
      errorMessage: 'Error',
      failedStep: 'synthesis',
      partialData: null,
    });

    expect(mockPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Pending Name' })
    );
  });
});

// ── grocery_updated event ─────────────────────────────────────────────────

describe('grocery_updated event', () => {
  it('grocery_updated event updates plannerStore.groceryState', () => {
    mockWeekOffset = 0;
    const { source } = setupHook();

    const groceryState = { flour: true, eggs: false };
    source.emit('grocery_updated', { weekOffset: 0, weekStartDate: '2025-01-13', groceryState });

    expect(mockSetGroceryState).toHaveBeenCalledWith(groceryState);
  });

  it('grocery_updated for different weekOffset is ignored', () => {
    mockWeekOffset = 0;
    const { source } = setupHook();

    const groceryState = { flour: true };
    source.emit('grocery_updated', { weekOffset: 1, weekStartDate: '2025-01-20', groceryState });

    expect(mockSetGroceryState).not.toHaveBeenCalled();
  });
});

describe('grocery_extras_updated event', () => {
  it('forwards the absolute occurrence week and authoritative collection', () => {
    const { source } = setupHook();
    const extras = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        occurrenceWeekStartDate: '2025-01-13',
        version: 2,
      },
    ];
    source.emit('grocery_extras_updated', { weekStartDate: '2025-01-13', groceryExtras: extras });
    expect(mockApplyGroceryExtrasUpdate).toHaveBeenCalledWith('2025-01-13', extras);
  });

  it('refreshes rather than guessing when absolute week identity is absent', () => {
    const { source } = setupHook();
    source.emit('grocery_extras_updated', { groceryExtras: [] });
    expect(mockWeekSync).toHaveBeenCalled();
    expect(mockApplyGroceryExtrasUpdate).not.toHaveBeenCalled();
  });
});

// discovery_nudge events are intentionally ignored.

// ── cleanup ──────────────────────────────────────────────────────────────────

describe('cleanup', () => {
  it('closes the EventSource when the hook unmounts', () => {
    const { result, source } = setupHook();

    result.unmount();

    expect(source.close).toHaveBeenCalledOnce();
  });
});

it('passes custom non-cooking metadata through slot updates to planner and today', () => {
  const { source } = setupHook();
  const plan = { kind: 'custom', customLabel: 'Birthday supper' };
  source.emit('slot_updated', { date: '2025-01-15', recipe: null, status: 3, nonCooking: plan });
  expect(mockApplyServerUpdate).toHaveBeenCalledWith({
    date: '2025-01-15',
    recipe: null,
    status: 3,
    nonCooking: plan,
  });
  expect(mockApplySlotUpdate).toHaveBeenCalledWith({
    date: '2025-01-15',
    recipe: null,
    status: 3,
    nonCooking: plan,
  });
});

it.each(['connected', 'week_updated'])(
  'reconciles non-cooking metadata from %s snapshots',
  (event) => {
    const { source } = setupHook();
    const plan = { kind: 'eating_out', customLabel: null };
    const schedule = {
      weekOffset: 0,
      weekStartDate: '2025-01-13',
      days: [{ date: '2025-01-15', recipe: null, status: 3, nonCooking: plan }],
    };
    source.emit(event, { schedule });
    expect(mockApplySnapshot.mock.calls.at(-1)?.[0]).toEqual(schedule);
    expect(mockApplyServerUpdate).toHaveBeenCalledWith({
      date: '2025-01-15',
      recipe: null,
      status: 3,
      nonCooking: plan,
    });
  }
);

it('selects Today from deployment context when the browser date differs', async () => {
  mockCalendar = {
    timeZone: 'America/Toronto',
    capturedAtUtc: '2026-10-12T01:30:00Z',
    today: '2026-10-11',
    currentWeekStartDate: '2026-10-05',
    referenceWeekStartDate: '2026-10-05',
    nextDayAtUtc: '2026-10-12T04:00:00Z',
  };
  renderHook(() => useScheduleStream());
  MockEventSource.instances.at(-1)!.emit('slot_updated', {
    date: '2026-10-11',
    recipe: { id: '660e8400-e29b-41d4-a716-446655440011' },
    status: 0,
  });
  await Promise.resolve();
  expect(mockApplyServerUpdate).toHaveBeenCalled();
});

it('does not apply grocery checks from a different absolute Monday with the same offset', () => {
  renderHook(() => useScheduleStream());
  MockEventSource.instances.at(-1)!.emit('grocery_updated', {
    weekOffset: 0,
    weekStartDate: '2025-01-06',
    groceryState: { old: true },
  });
  expect(mockSetGroceryState).not.toHaveBeenCalled();
});

describe('authoritative voting session', () => {
  it('dispatches replacement session state from the existing stream', () => {
    const { source } = setupHook();
    const session = {
      incarnationId: '00000000-0000-4000-8000-000000000001',
      revision: 1,
      phase: 'converged',
    };
    source.emit('voting_session_updated', { session });
    expect(mockApplySession).toHaveBeenCalledWith(session);
  });
  it('reconciles the session on reconnect and foreground return', () => {
    const { source } = setupHook();
    (source as unknown as { onopen: () => void }).onopen();
    window.dispatchEvent(new Event('pageshow'));
    expect(mockRefreshSession).toHaveBeenCalledTimes(2);
  });
});

it('a delayed legacy defaults event cannot repopulate a confirmed unowned session', () => {
  mockSession = { phase: 'unowned', weekStartDate: null };
  const { source } = setupHook();
  source.emit('smart_defaults_updated', {
    defaults: {
      weekStartDate: mockWeekStartDate,
      preSelectedRecipes: [{ dayIndex: 0, recipeId: 'old' }],
    },
  });
  expect(mockApplySmartDefaultsUpdate).not.toHaveBeenCalled();
  expect(mockRefreshSession).toHaveBeenCalledTimes(1);
});
