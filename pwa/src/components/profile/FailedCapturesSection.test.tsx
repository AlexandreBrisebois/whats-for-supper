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
  tWithVars: (_key: string, defaultValue: string, vars: Record<string, any>) => {
    let result = defaultValue;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(`{{${k}}}`, String(v));
    }
    return result;
  },
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

  it('hides the section when no failures are available', async () => {
    await act(async () => {
      render(<FailedCapturesSection />);
    });
    await waitFor(() => expect(screen.queryByTestId('failed-captures-section')).toBeNull());
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

  it('does not render an empty recovery card', async () => {
    mockGetCaptureFailures.mockResolvedValue([]);

    await act(async () => {
      render(<FailedCapturesSection />);
    });

    expect(screen.queryByTestId('failed-captures-section')).toBeNull();
  });

  it('uses inline confirmation (never window.confirm) with Keep left and Clear capture right, and resets on rejection', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const failure = buildFailure();
    mockGetCaptureFailures.mockResolvedValue([failure]);

    await act(async () => {
      render(<FailedCapturesSection />);
    });

    await waitFor(() => {
      expect(screen.getByTestId(`failed-capture-${failure.id}`)).toBeInTheDocument();
    });

    // Clicking Clear reveals inline confirm without invoking window.confirm
    fireEvent.click(screen.getByTestId(`action-clear-${failure.id}`));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(mockClearCaptureFailure).not.toHaveBeenCalled();

    const confirmBox = screen.getByTestId(`clear-confirm-${failure.id}`);
    expect(confirmBox).toHaveClass('bg-white', 'border-hearth-line');

    // Keep dismisses confirmation without deleting
    const keepBtn = screen.getByTestId(`action-clear-keep-${failure.id}`);
    const confirmClearBtn = screen.getByTestId(`action-clear-confirm-${failure.id}`);
    expect(
      keepBtn.compareDocumentPosition(confirmClearBtn) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(keepBtn);
    expect(screen.queryByTestId(`clear-confirm-${failure.id}`)).toBeNull();
    expect(mockClearCaptureFailure).not.toHaveBeenCalled();

    // Rejection resets confirmation state
    mockClearCaptureFailure.mockRejectedValueOnce(new Error('network error'));
    fireEvent.click(screen.getByTestId(`action-clear-${failure.id}`));
    fireEvent.click(screen.getByTestId(`action-clear-confirm-${failure.id}`));
    await waitFor(() => {
      expect(screen.queryByTestId(`clear-confirm-${failure.id}`)).toBeNull();
      expect(screen.getByTestId(`action-retry-error-${failure.id}`)).toBeInTheDocument();
    });

    // Confirming Clear capture removes the row
    fireEvent.click(screen.getByTestId(`action-clear-${failure.id}`));
    fireEvent.click(screen.getByTestId(`action-clear-confirm-${failure.id}`));

    await waitFor(() => {
      expect(mockClearCaptureFailure).toHaveBeenCalledWith(failure.id);
      expect(screen.queryByTestId(`failed-capture-${failure.id}`)).not.toBeInTheDocument();
    });
  });

  it('uses Family Cookbook >= 48px controls, flex-1 Retry left, trailing 48x48 Clear right, and >= 12px copy', async () => {
    const failure = buildFailure({ previewText: 'https://example.com/recipe' });
    mockGetCaptureFailures.mockResolvedValue([failure]);

    const { container } = render(<FailedCapturesSection />);
    const retry = await screen.findByTestId(`action-retry-${failure.id}`);
    const clear = screen.getByTestId(`action-clear-${failure.id}`);

    expect(retry).toHaveClass('min-h-12', 'flex-1', 'text-xs');
    expect(retry).not.toHaveClass('text-[10px]', 'h-10');
    expect(clear).toHaveClass(
      'h-12',
      'w-12',
      'border-hearth-line',
      'bg-terracotta-50',
      'text-hearth-ink'
    );
    expect(clear).not.toHaveClass('h-10', 'w-10');
    expect(container.innerHTML).not.toContain('text-[10px]');
    expect(container.innerHTML).not.toContain('text-charcoal/40');
    expect(container.innerHTML).not.toContain('backdrop-blur-xl');
  });
});
