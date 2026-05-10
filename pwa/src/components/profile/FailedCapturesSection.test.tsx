/**
 * Unit tests — FailedCapturesSection component
 * Task 18: Settings > Failed Captures queue with retry
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockGetCaptureFailures = vi.fn();
const mockRetryCaptureFailure = vi.fn();
const mockClearCaptureFailure = vi.fn();

vi.mock('@/lib/api/captures', () => ({
  getCaptureFailures: (...args: unknown[]) => mockGetCaptureFailures(...args),
  retryCaptureFailure: (...args: unknown[]) => mockRetryCaptureFailure(...args),
  clearCaptureFailure: (...args: unknown[]) => mockClearCaptureFailure(...args),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, defaultValue: string) => defaultValue,
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
import { FailedCapturesSection } from './FailedCapturesSection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildFailure(overrides: Record<string, unknown> = {}) {
  return {
    id: '880e8400-e29b-41d4-a716-446655440040',
    workflowInstanceId: '880e8400-e29b-41d4-a716-446655440040',
    recipeId: '990e8400-e29b-41d4-a716-446655440041',
    sourceWorkflowId: 'url-import',
    sourceType: 'url',
    previewText: 'https://example.com/recipe',
    friendlyReason: "We couldn't read the recipe page. The site may be blocking import right now.",
    failureCode: 'url_unreadable',
    status: 'failed',
    retryCount: 0,
    createdAt: new Date().toISOString(),
    lastFailedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('FailedCapturesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCaptureFailures.mockResolvedValue([]);
    mockRetryCaptureFailure.mockResolvedValue({ queued: true });
    mockClearCaptureFailure.mockResolvedValue({
      cleared: true,
      cleanupCommandId: '770e8400-e29b-41d4-a716-446655440042',
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  // Unit test 1: Settings page renders failed-captures-section
  it('renders failed-captures-section', async () => {
    await act(async () => {
      render(<FailedCapturesSection />);
    });
    expect(screen.getByTestId('failed-captures-section')).toBeInTheDocument();
  });

  // Unit test 2: Each failure row renders failed-capture-<id> with friendly reason visible
  it('renders each failure row with data-testid and friendly reason', async () => {
    const failure = buildFailure();
    mockGetCaptureFailures.mockResolvedValue([failure]);

    await act(async () => {
      render(<FailedCapturesSection />);
    });

    await waitFor(() => {
      expect(screen.getByTestId(`failed-capture-${failure.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`failed-capture-reason-${failure.id}`)).toBeInTheDocument();
    });
  });

  // Unit test 3: action-retry-<id> tap calls retryCaptureFailure
  it('action-retry-<id> tap calls retryCaptureFailure with the failure id', async () => {
    const failure = buildFailure();
    mockGetCaptureFailures.mockResolvedValue([failure]);

    await act(async () => {
      render(<FailedCapturesSection />);
    });

    await waitFor(() => {
      expect(screen.getByTestId(`action-retry-${failure.id}`)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId(`action-retry-${failure.id}`));
    });

    expect(mockRetryCaptureFailure).toHaveBeenCalledWith(failure.id);
  });

  // Unit test 4: After successful retry dispatch, button shows in-progress state
  it('shows action-retry-<id>-retrying after successful retry tap', async () => {
    const failure = buildFailure();
    mockGetCaptureFailures.mockResolvedValue([failure]);
    mockRetryCaptureFailure.mockResolvedValue({ queued: true });

    await act(async () => {
      render(<FailedCapturesSection />);
    });

    await waitFor(() => {
      expect(screen.getByTestId(`action-retry-${failure.id}`)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId(`action-retry-${failure.id}`));
    });

    await waitFor(() => {
      expect(screen.getByTestId(`action-retry-${failure.id}-retrying`)).toBeInTheDocument();
    });
  });

  // Unit test 5: Empty state renders failed-captures-empty
  it('renders failed-captures-empty when items array is empty', async () => {
    mockGetCaptureFailures.mockResolvedValue([]);

    await act(async () => {
      render(<FailedCapturesSection />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('failed-captures-empty')).toBeInTheDocument();
    });
  });

  it('action-clear-<id> tap calls clearCaptureFailure and removes the row', async () => {
    const failure = buildFailure();
    mockGetCaptureFailures.mockResolvedValue([failure]);

    await act(async () => {
      render(<FailedCapturesSection />);
    });

    await waitFor(() => {
      expect(screen.getByTestId(`failed-capture-${failure.id}`)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId(`action-clear-${failure.id}`));
    });

    expect(mockClearCaptureFailure).toHaveBeenCalledWith(failure.id);
    await waitFor(() => {
      expect(screen.queryByTestId(`failed-capture-${failure.id}`)).not.toBeInTheDocument();
    });
  });
});
