import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CaptureActivityItem } from '@/lib/api/captures';

const mockHydrate = vi.fn().mockResolvedValue(undefined);
const mockRemoveActivityItem = vi.fn();

let mockState = {
  pendingRecipes: [] as Array<{ recipeId: string; name?: string; submittedAt: number }>,
  activityItems: [] as CaptureActivityItem[],
  activityLoaded: true,
  activityLoading: false,
  activityError: null as string | null,
  hydrate: mockHydrate,
  applyActivityItems: vi.fn(),
  removeActivityItem: mockRemoveActivityItem,
  addPending: vi.fn(),
  removePending: vi.fn(),
  getPending: vi.fn(),
};

vi.mock('@/store/captureStore', () => ({
  useCaptureStore: Object.assign(
    (selector: (state: typeof mockState) => unknown) => selector(mockState),
    { getState: () => mockState }
  ),
}));

vi.mock('@/components/common/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en', setCurrentLocale: vi.fn() }),
}));

vi.mock('@/components/home/CaptureActivitySheet', () => ({
  CaptureActivitySheet: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="capture-activity-sheet-mock">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

import { CaptureActivityBar } from './CaptureActivityBar';

function buildItem(overrides: Partial<CaptureActivityItem> = {}): CaptureActivityItem {
  return {
    id: 'act-1',
    workflowInstanceId: 'wf-1',
    recipeId: 'rec-1',
    stage: 'preparing',
    title: 'Grandma Chili',
    sourceWorkflowId: 'goto-synthesis',
    sourceType: 'description',
    stepName: 'synthesize_recipe',
    stepLabel: 'Writing recipe',
    previewText: 'Grandma slow chili',
    friendlyReason: null,
    retryCount: 0,
    isReady: false,
    isSuspectedDuplicate: false,
    updatedAt: '2026-11-24T12:00:00Z',
    ...overrides,
  };
}

describe('CaptureActivityBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      ...mockState,
      pendingRecipes: [],
      activityItems: [],
    };
  });

  it('hydrates activity on mount and renders nothing when no captures exist', () => {
    const { container } = render(<CaptureActivityBar />);
    expect(mockHydrate).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toBeNull();
  });

  it('renders single preparing item with step label, progress bar, and zero + Add another button', () => {
    mockState.activityItems = [buildItem()];
    const { container } = render(<CaptureActivityBar />);

    const bar = screen.getByTestId('capture-activity-bar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveTextContent('Grandma Chili');
    expect(bar).toHaveTextContent('Writing recipe');
    expect(screen.getByTestId('capture-activity-progress')).toBeInTheDocument();
    expect(screen.getByTestId('capture-activity-progress-fill').className).toContain(
      'motion-reduce:animate-none'
    );
    expect(screen.queryByTestId('capture-in-flight-add-another')).toBeNull();
    expect(container.textContent).not.toMatch(/[✓✔✅]/);
  });

  it('renders parallel summary and progress bar for multiple active items', () => {
    mockState.activityItems = [
      buildItem({ id: 'a1', stage: 'preparing', title: 'Chili' }),
      buildItem({ id: 'a2', stage: 'indexing', title: 'Lemon Pasta', isReady: true }),
      buildItem({ id: 'a3', stage: 'enriching', title: 'Tacos', isReady: true }),
    ];
    render(<CaptureActivityBar />);

    const bar = screen.getByTestId('capture-activity-bar');
    expect(bar).toHaveTextContent(/Preparing 3 recipes/i);
    expect(screen.getByTestId('capture-activity-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('capture-in-flight-add-another')).toBeNull();
  });

  it('prioritizes compact 2-line white-surface Hearth bar without progress bar when failures exist', () => {
    mockState.activityItems = [
      buildItem({
        id: 'fail-1',
        stage: 'failed',
        title: 'Burnt Tart',
        friendlyReason: 'Couldn’t read the page.',
      }),
      buildItem({ id: 'a2', stage: 'preparing', title: 'Soup' }),
    ];
    render(<CaptureActivityBar />);

    const bar = screen.getByTestId('capture-activity-bar');
    expect(bar).toHaveClass('bg-white', 'border-hearth-line');
    expect(bar).toHaveTextContent(/1 needs attention/i);
    expect(screen.queryByTestId('capture-activity-progress')).toBeNull();
  });

  it('renders Garden Searchable · Still enriching bar when only vector enrichment remains', () => {
    mockState.activityItems = [
      buildItem({
        id: 'e1',
        stage: 'enriching',
        title: 'Roasted Cauliflower Tacos',
        isReady: true,
      }),
    ];
    render(<CaptureActivityBar />);

    const bar = screen.getByTestId('capture-activity-bar');
    expect(bar).toHaveClass('bg-sage-50', 'border-garden-line', 'text-garden-ink');
    expect(bar).toHaveTextContent(/Searchable/i);
    expect(bar).toHaveTextContent(/Still enriching/i);
  });

  it('opens CaptureActivitySheet when clicked', () => {
    mockState.activityItems = [buildItem()];
    render(<CaptureActivityBar />);

    expect(screen.queryByTestId('capture-activity-sheet-mock')).toBeNull();
    fireEvent.click(screen.getByTestId('capture-activity-bar'));
    expect(screen.getByTestId('capture-activity-sheet-mock')).toBeInTheDocument();
  });
});
