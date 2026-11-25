import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { CaptureActivityItem } from '@/lib/api/captures';

const mockGetCaptureFailureDetails = vi.fn();
const mockRetryCaptureFailure = vi.fn();
const mockClearCaptureFailure = vi.fn();
const mockReindexRecipe = vi.fn();
const mockHydrate = vi.fn().mockResolvedValue(undefined);
const mockRemoveActivityItem = vi.fn();

vi.mock('@/lib/api/captures', () => ({
  getCaptureFailureDetails: (...args: unknown[]) => mockGetCaptureFailureDetails(...args),
  retryCaptureFailure: (...args: unknown[]) => mockRetryCaptureFailure(...args),
  clearCaptureFailure: (...args: unknown[]) => mockClearCaptureFailure(...args),
}));

vi.mock('@/lib/api/recipes', () => ({
  reindexRecipe: (...args: unknown[]) => mockReindexRecipe(...args),
}));

let mockItems: CaptureActivityItem[] = [];

vi.mock('@/store/captureStore', () => ({
  useCaptureStore: Object.assign(
    (selector: (s: unknown) => unknown) =>
      selector({
        activityItems: mockItems,
        pendingRecipes: [],
        hydrate: mockHydrate,
        removeActivityItem: mockRemoveActivityItem,
        removePending: vi.fn(),
      }),
    {
      getState: () => ({
        activityItems: mockItems,
        pendingRecipes: [],
        hydrate: mockHydrate,
        removeActivityItem: mockRemoveActivityItem,
        removePending: vi.fn(),
      }),
    }
  ),
}));

vi.mock('@/components/common/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en', setCurrentLocale: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { CaptureActivitySheet } from './CaptureActivitySheet';

function item(overrides: Partial<CaptureActivityItem> = {}): CaptureActivityItem {
  return {
    id: 'item-1',
    workflowInstanceId: 'wf-1',
    recipeId: 'rec-1',
    stage: 'failed',
    title: 'Grandma Chili',
    sourceWorkflowId: 'goto-synthesis',
    sourceType: 'description',
    stepName: 'synthesize_recipe',
    stepLabel: 'Writing recipe',
    previewText: 'Grandma slow chili',
    friendlyReason: 'Couldn’t write the recipe — the model timed out.',
    retryCount: 1,
    isReady: false,
    isSuspectedDuplicate: false,
    updatedAt: '2026-11-24T12:00:00Z',
    ...overrides,
  };
}

describe('CaptureActivitySheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockItems = [];
    mockGetCaptureFailureDetails.mockResolvedValue({
      workflowInstanceId: 'wf-1',
      recipeId: 'rec-1',
      sourceWorkflowId: 'goto-synthesis',
      sourceType: 'description',
      failedStep: 'synthesize_recipe',
      friendlyReason: 'Couldn’t write the recipe',
      errorMessage: '504 Gateway Timeout',
      stackTrace: 'at SynthesizeRecipe.cs:42',
      retryCount: 1,
      lastFailedAt: '2026-11-24T12:00:00Z',
    });
    mockRetryCaptureFailure.mockResolvedValue({ queued: true });
    mockClearCaptureFailure.mockResolvedValue({ cleared: true, cleanupCommandId: 'cmd-1' });
    mockReindexRecipe.mockResolvedValue({ queued: true });
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders single [RotateCcw+Retry | 48x48 Copy | 48x48 Trash2] row and copies details neutrally', async () => {
    mockItems = [item()];
    const { container } = render(<CaptureActivitySheet open onClose={vi.fn()} />);

    const retry = screen.getByTestId('action-retry-wf-1');
    const copy = screen.getByTestId('action-copy-wf-1');
    const trash = screen.getByTestId('action-clear-wf-1');

    expect(retry).toHaveClass('min-h-12', 'flex-1');
    expect(copy).toHaveClass('h-12', 'w-12');
    expect(trash).toHaveClass('h-12', 'w-12');
    expect(container.textContent).not.toContain('at SynthesizeRecipe.cs:42');
    expect(container.textContent).not.toMatch(/[✓✔✅]/);

    fireEvent.click(copy);

    await waitFor(() => {
      expect(mockGetCaptureFailureDetails).toHaveBeenCalledWith('wf-1');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('504 Gateway Timeout')
      );
    });
    const status = await screen.findByTestId('failed-capture-copied-wf-1');
    expect(status).toHaveTextContent('Details copied');
    expect(status.className).toContain('text-ink-muted');
    expect(status.className).not.toContain('text-garden-ink');
  });

  it('auto-closes cleanly back to Home when the final failed capture is deleted', async () => {
    mockItems = [item()];
    const onClose = vi.fn();
    render(<CaptureActivitySheet open onClose={onClose} />);

    fireEvent.click(screen.getByTestId('action-clear-wf-1'));
    expect(screen.getByTestId('action-clear-cancel-wf-1')).toHaveTextContent('Cancel');
    expect(screen.getByTestId('action-clear-confirm-wf-1')).toHaveTextContent('Delete');

    fireEvent.click(screen.getByTestId('action-clear-confirm-wf-1'));

    await waitFor(() => {
      expect(mockClearCaptureFailure).toHaveBeenCalledWith('wf-1');
      expect(mockRemoveActivityItem).toHaveBeenCalledWith('wf-1');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows Dismiss for already-ready reimport failures instead of Delete', () => {
    mockItems = [item({ isReady: true })];
    render(<CaptureActivitySheet open onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId('action-clear-wf-1'));
    expect(screen.getByTestId('action-clear-confirm-wf-1')).toHaveTextContent('Dismiss');
  });

  it('renders tappable Searchable cards (with duplicate review query when flagged) and non-destructive Sunlight Retry enrichment', async () => {
    mockItems = [
      item({
        id: 'enr-1',
        workflowInstanceId: null,
        recipeId: 'rec-dup',
        stage: 'enriching',
        title: 'Sunday Pasta',
        isReady: true,
        isSuspectedDuplicate: true,
        friendlyReason: null,
      }),
      item({
        id: 'paused-1',
        workflowInstanceId: null,
        recipeId: 'rec-paused',
        stage: 'enrichment_paused',
        title: 'Roasted Cauliflower Tacos',
        isReady: true,
        isSuspectedDuplicate: false,
        friendlyReason: 'Smart search paused',
      }),
    ];

    render(<CaptureActivitySheet open onClose={vi.fn()} />);

    const duplicateLink = screen.getByTestId('activity-recipe-link-rec-dup');
    expect(duplicateLink).toHaveAttribute('href', '/recipes?open=rec-dup&reviewDuplicate=1');

    const pausedLink = screen.getByTestId('activity-recipe-link-rec-paused');
    expect(pausedLink).toHaveAttribute('href', '/recipes?open=rec-paused');
    expect(screen.getByTestId('activity-enrichment-paused-rec-paused')).toHaveClass(
      'bg-ochre-50',
      'border-sunlight-line',
      'text-sunlight-ink'
    );
    expect(screen.queryByTestId('action-clear-paused-1')).toBeNull();

    const retryEnrich = screen.getByTestId('action-retry-enrichment-rec-paused');
    expect(retryEnrich).toHaveClass('min-h-12');
    fireEvent.click(retryEnrich);
    await waitFor(() => expect(mockReindexRecipe).toHaveBeenCalledWith('rec-paused'));
  });
});
