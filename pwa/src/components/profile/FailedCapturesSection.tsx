'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import {
  clearCaptureFailure,
  getCaptureFailures,
  retryCaptureFailure,
  type CaptureFailure,
} from '@/lib/api/captures';
import { t } from '@/locales';

export function FailedCapturesSection() {
  const [failures, setFailures] = useState<CaptureFailure[]>([]);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());
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

  async function handleClear(id: string) {
    if (clearingIds.has(id)) return;
    if (!window.confirm(t('settings.clearFailedCaptureConfirm', 'Clear this failed capture?'))) {
      return;
    }

    setClearingIds((prev) => new Set(prev).add(id));
    try {
      await clearCaptureFailure(id);
      setFailures((prev) => prev.filter((failure) => failure.id !== id));
      setErrorIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
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
      className="w-full rounded-3xl bg-white border border-chrome-line p-8 shadow-card"
    >
      <div className="flex items-center gap-3 mb-8">
        <AlertCircle className="h-4 w-4 text-hearth-ink" />
        <h3 className="text-xs font-semibold text-hearth-ink">
          {t('settings.failedCaptures', 'Failed Captures')}
        </h3>
      </div>

      <ul className="flex flex-col gap-4">
        {failures.map((failure) => (
          <li
            key={failure.id}
            data-testid={`failed-capture-${failure.id}`}
            className="flex flex-col gap-4 rounded-2xl bg-cream-100 border border-chrome-line p-5 shadow-sm"
          >
            <div className="flex flex-col gap-1">
              <p
                data-testid={`failed-capture-reason-${failure.id}`}
                className="text-sm font-bold text-ink-body tracking-tight"
              >
                {failure.friendlyReason}
              </p>
              {failure.previewText && (
                <p className="text-xs font-medium text-ink-muted truncate">{failure.previewText}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {retryingIds.has(failure.id) ? (
                <span
                  data-testid={`action-retry-${failure.id}-retrying`}
                  className="text-xs font-semibold text-hearth-ink"
                >
                  {t('settings.retrying', 'Retrying…')}
                </span>
              ) : (
                <button
                  data-testid={`action-retry-${failure.id}`}
                  onClick={() => handleRetry(failure.id)}
                  className="min-h-12 rounded-xl bg-hearth-fill active:bg-hearth-fill-active px-5 text-xs font-semibold text-cream-100 transition-all active:scale-95 hover:bg-hearth-fill-hover shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                >
                  {t('settings.retry', 'Retry')}
                </button>
              )}

              <button
                data-testid={`action-clear-${failure.id}`}
                onClick={() => handleClear(failure.id)}
                disabled={clearingIds.has(failure.id)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-hearth-line bg-terracotta-50 text-hearth-ink transition-transform hover:bg-white hover:border-hearth-ink disabled:opacity-50 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                aria-label={t('settings.clearFailedCapture', 'Clear failed capture')}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {errorIds.has(failure.id) && (
              <p
                data-testid={`action-retry-error-${failure.id}`}
                className="text-xs font-semibold text-hearth-ink"
              >
                {t('settings.retryError', 'Retry failed. Please try again.')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
