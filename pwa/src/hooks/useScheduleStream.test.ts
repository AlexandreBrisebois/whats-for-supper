/**
 * Unit tests for useScheduleStream hook.
 *
 * Strategy: mock EventSource globally, then call the hook inside renderHook.
 * Each test fires a synthetic MessageEvent and asserts the correct store
 * method was called with the correct arguments.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ── Store mock factories ─────────────────────────────────────────────────────
// Define the mock functions at module scope so they are accessible in tests.

const mockClearOptimisticGuard = vi.fn();
const mockApplyServerUpdate = vi.fn();
const mockApplySnapshot = vi.fn();
const mockApplySlotUpdate = vi.fn();
const mockApplyVoteUpdate = vi.fn();
const mockApplySmartDefaultsUpdate = vi.fn();
const mockInvalidateFillTheGap = vi.fn();
const mockDiscoveryApplyVoteUpdate = vi.fn();
const mockSetActiveCategory = vi.fn();
const mockMarkReady = vi.fn();
const mockSetGroceryState = vi.fn();

// weekStore weekOffset — default to 0; tests can override via mockWeekOffset
let mockWeekOffset = 0;

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
      clearOptimisticGuard: mockClearOptimisticGuard,
      applyServerUpdate: mockApplyServerUpdate,
    }),
  },
}));

vi.mock('@/store/weekStore', () => ({
  useWeekStore: {
    getState: () => ({
      weekOffset: mockWeekOffset,
      applySnapshot: mockApplySnapshot,
      applySlotUpdate: mockApplySlotUpdate,
      applyVoteUpdate: mockApplyVoteUpdate,
      applySmartDefaultsUpdate: mockApplySmartDefaultsUpdate,
    }),
  },
}));

vi.mock('@/store/discoveryStore', () => ({
  useDiscoveryStore: {
    getState: () => ({
      invalidateFillTheGap: mockInvalidateFillTheGap,
      applyVoteUpdate: mockDiscoveryApplyVoteUpdate,
      setActiveCategory: mockSetActiveCategory,
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
  mockWeekOffset = 0;
  vi.clearAllMocks();
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
});

// ── slot_updated event ───────────────────────────────────────────────────────

describe('slot_updated event', () => {
  it('calls applyServerUpdate on todayStore when date matches today', () => {
    const { source } = setupHook();

    const recipe = { id: 'r1', name: 'Pasta', image: '' };
    source.emit('slot_updated', { date: '2025-01-15', recipe, status: 0 });

    expect(mockApplyServerUpdate).toHaveBeenCalledWith({ recipe, status: 0 });
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
      days: [
        { date: '2025-01-15', recipe, status: 1 }, // today
        { date: '2025-01-16', recipe: null, status: 0 },
      ],
      status: 0,
    };

    source.emit('week_updated', { schedule });

    expect(mockApplyServerUpdate).toHaveBeenCalledWith({
      recipe,
      status: 1,
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

    const defaults = { weekOffset: 0, preSelectedRecipes: [{ dayIndex: 0, recipeId: 'r1' }] };
    source.emit('smart_defaults_updated', { defaults });

    expect(mockApplySmartDefaultsUpdate).toHaveBeenCalledWith(defaults);
  });

  it('ignores smart defaults for a different weekOffset', () => {
    const { source } = setupHook();
    mockWeekOffset = 0;

    const defaults = { weekOffset: 1, preSelectedRecipes: [{ dayIndex: 0, recipeId: 'r1' }] };
    source.emit('smart_defaults_updated', { defaults });

    expect(mockApplySmartDefaultsUpdate).not.toHaveBeenCalled();
  });
});

// ── fill_the_gap_invalidated event ───────────────────────────────────────────

describe('fill_the_gap_invalidated event', () => {
  it('calls invalidateFillTheGap on discoveryStore with weekOffset', () => {
    const { source } = setupHook();

    source.emit('fill_the_gap_invalidated', { weekOffset: 0 });

    expect(mockInvalidateFillTheGap).toHaveBeenCalledWith(0);
  });

  it('passes the weekOffset value through correctly', () => {
    const { source } = setupHook();

    source.emit('fill_the_gap_invalidated', { weekOffset: 1 });

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
    source.emit('grocery_updated', { weekOffset: 0, groceryState });

    expect(mockSetGroceryState).toHaveBeenCalledWith(groceryState);
  });

  it('grocery_updated for different weekOffset is ignored', () => {
    mockWeekOffset = 0;
    const { source } = setupHook();

    const groceryState = { flour: true };
    source.emit('grocery_updated', { weekOffset: 1, groceryState });

    expect(mockSetGroceryState).not.toHaveBeenCalled();
  });
});

// ── discovery_nudge event ─────────────────────────────────────────────────

describe('discovery_nudge event', () => {
  it('calls setActiveCategory on discoveryStore with nextFoodGroup', () => {
    const { source } = setupHook();

    source.emit('discovery_nudge', { nextFoodGroup: 'WholeGrains', reason: 'Balanced week' });

    expect(mockSetActiveCategory).toHaveBeenCalledWith('WholeGrains');
  });

  it('calls setActiveCategory with null when nextFoodGroup is null', () => {
    const { source } = setupHook();

    source.emit('discovery_nudge', { nextFoodGroup: null, reason: 'Already balanced' });

    expect(mockSetActiveCategory).toHaveBeenCalledWith(null);
  });
});

// ── cleanup ──────────────────────────────────────────────────────────────────

describe('cleanup', () => {
  it('closes the EventSource when the hook unmounts', () => {
    const { result, source } = setupHook();

    result.unmount();

    expect(source.close).toHaveBeenCalledOnce();
  });
});
