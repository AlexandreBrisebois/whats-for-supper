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
      className="w-full rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 p-6 shadow-glass"
    >
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="h-4 w-4 text-indigo" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo">
          {t('settings.failedCaptures', 'Failed Captures')}
        </h3>
      </div>

      {failures.length === 0 ? (
        <p
          data-testid="failed-captures-empty"
          className="text-sm text-charcoal-300 text-center py-4"
        >
          {t(
            'settings.noFailedCaptures',
            'No failed captures. All imports completed successfully.'
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {failures.map((failure) => (
            <li
              key={failure.id}
              data-testid={`failed-capture-${failure.id}`}
              className="flex flex-col gap-2 rounded-2xl bg-white/60 border border-white/40 p-4"
            >
              <p
                data-testid={`failed-capture-reason-${failure.id}`}
                className="text-sm font-medium text-charcoal"
              >
                {failure.friendlyReason}
              </p>
              {failure.previewText && (
                <p className="text-xs text-charcoal-300 truncate">{failure.previewText}</p>
              )}

              <div className="flex items-center gap-2">
                {retryingIds.has(failure.id) ? (
                  <span
                    data-testid={`action-retry-${failure.id}-retrying`}
                    className="text-xs font-semibold text-indigo"
                  >
                    {t('settings.retrying', 'Retrying…')}
                  </span>
                ) : (
                  <button
                    data-testid={`action-retry-${failure.id}`}
                    onClick={() => handleRetry(failure.id)}
                    className="rounded-xl bg-indigo px-4 py-2 text-xs font-bold text-lavender transition-all active:scale-95 hover:bg-indigo/90"
                  >
                    {t('settings.retry', 'Retry')}
                  </button>
                )}

                <button
                  data-testid={`action-clear-${failure.id}`}
                  onClick={() => handleClear(failure.id)}
                  disabled={clearingIds.has(failure.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-terracotta/30 text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-50"
                  aria-label={t('settings.clearFailedCapture', 'Clear failed capture')}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {errorIds.has(failure.id) && (
                <p
                  data-testid={`action-retry-error-${failure.id}`}
                  className="text-xs text-red-500"
                >
                  {t('settings.retryError', 'Retry failed. Please try again.')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
