'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import {
  clearCaptureFailure,
  getCaptureFailures,
  retryCaptureFailure,
  type CaptureFailure,
} from '@/lib/api/captures';
import { Button } from '@/components/ui/button';
import { t } from '@/locales';

export function FailedCapturesSection() {
  const [failures, setFailures] = useState<CaptureFailure[]>([]);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());
  const [confirmingClearId, setConfirmingClearId] = useState<string | null>(null);
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getCaptureFailures()
      .then(setFailures)
      .catch(() => {});
  }, []);

  if (failures.length === 0) return null;

  async function handleRetry(id: string) {
    if (retryingIds.has(id)) return;
    try {
      await retryCaptureFailure(id);
      setRetryingIds((prev) => new Set(prev).add(id));
      setErrorIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      setErrorIds((prev) => new Set(prev).add(id));
    }
  }

  async function handleConfirmClear(id: string) {
    if (clearingIds.has(id)) return;

    setClearingIds((prev) => new Set(prev).add(id));
    try {
      await clearCaptureFailure(id);
      setFailures((prev) => prev.filter((failure) => failure.id !== id));
      setConfirmingClearId((prev) => (prev === id ? null : prev));
      setErrorIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      setConfirmingClearId((prev) => (prev === id ? null : prev));
      setErrorIds((prev) => new Set(prev).add(id));
    } finally {
      setClearingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div
      data-testid="failed-captures-section"
      className="w-full rounded-3xl bg-white border border-chrome-line p-6 sm:p-8 shadow-card"
    >
      <div className="flex items-center gap-3 mb-6">
        <AlertCircle className="h-4 w-4 text-hearth-ink" aria-hidden="true" />
        <h3 className="text-xs font-semibold text-hearth-ink">
          {t('settings.failedCaptures', 'Failed captures')}
        </h3>
      </div>

      <ul className="flex flex-col gap-4">
        {failures.map((failure) => {
          const isConfirming = confirmingClearId === failure.id;
          const isClearing = clearingIds.has(failure.id);

          return (
            <li
              key={failure.id}
              data-testid={`failed-capture-${failure.id}`}
              className="flex flex-col gap-4 rounded-2xl bg-cream-100 border border-chrome-line p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <p
                  data-testid={`failed-capture-reason-${failure.id}`}
                  className="text-sm font-bold text-ink-body tracking-tight"
                >
                  {failure.friendlyReason}
                </p>
                {failure.previewText && (
                  <p className="text-xs font-medium text-ink-muted truncate">
                    {failure.previewText}
                  </p>
                )}
              </div>

              {isConfirming ? (
                <div
                  data-testid={`clear-confirm-${failure.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-hearth-line bg-white p-3.5"
                >
                  <p className="text-xs font-medium text-ink-body leading-relaxed">
                    {t(
                      'settings.clearCaptureConsequence',
                      'Remove this failed capture from your queue? You can still add the recipe again later.'
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isClearing}
                      data-testid={`action-clear-keep-${failure.id}`}
                      onClick={() => setConfirmingClearId(null)}
                      className="min-h-12 w-full justify-center text-xs"
                    >
                      {t('settings.keepCapture', 'Keep')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={isClearing}
                      data-testid={`action-clear-confirm-${failure.id}`}
                      onClick={() => void handleConfirmClear(failure.id)}
                      className="min-h-12 w-full justify-center gap-1.5 text-xs"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span>{t('settings.clearCaptureConfirmBtn', 'Clear capture')}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  {retryingIds.has(failure.id) ? (
                    <span
                      data-testid={`action-retry-${failure.id}-retrying`}
                      className="flex-1 text-xs font-semibold text-hearth-ink"
                    >
                      {t('settings.retrying', 'Retrying…')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid={`action-retry-${failure.id}`}
                      onClick={() => void handleRetry(failure.id)}
                      className="min-h-12 flex-1 rounded-xl bg-hearth-fill active:bg-hearth-fill-active px-5 text-xs font-semibold text-cream-100 transition-colors hover:bg-hearth-fill-hover shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                    >
                      {t('settings.retry', 'Retry')}
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid={`action-clear-${failure.id}`}
                    onClick={() => setConfirmingClearId(failure.id)}
                    disabled={isClearing}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-hearth-line bg-terracotta-50 text-hearth-ink transition-colors hover:bg-white hover:border-hearth-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                    aria-label={t('settings.clearFailedCapture', 'Clear failed capture')}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              )}

              {errorIds.has(failure.id) && (
                <p
                  data-testid={`action-retry-error-${failure.id}`}
                  role="alert"
                  className="text-xs font-semibold text-hearth-ink"
                >
                  {t('settings.retryError', 'Retry failed. Please try again.')}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
