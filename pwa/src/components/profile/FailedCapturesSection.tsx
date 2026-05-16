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
      className="w-full rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/60 p-8 shadow-glass"
    >
      <div className="flex items-center gap-3 mb-8">
        <AlertCircle className="h-4 w-4 text-terracotta" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-terracotta">
          {t('settings.failedCaptures', 'Failed Captures')}
        </h3>
      </div>

      {failures.length === 0 ? (
        <p
          data-testid="failed-captures-empty"
          className="text-sm font-medium text-charcoal/40 text-center py-8"
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
              className="flex flex-col gap-4 rounded-2xl bg-white/60 border border-white/40 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <p
                  data-testid={`failed-capture-reason-${failure.id}`}
                  className="text-sm font-bold text-charcoal tracking-tight"
                >
                  {failure.friendlyReason}
                </p>
                {failure.previewText && (
                  <p className="text-[10px] font-medium text-charcoal/40 truncate">
                    {failure.previewText}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {retryingIds.has(failure.id) ? (
                  <span
                    data-testid={`action-retry-${failure.id}-retrying`}
                    className="text-xs font-black uppercase tracking-widest text-terracotta/60"
                  >
                    {t('settings.retrying', 'Retrying…')}
                  </span>
                ) : (
                  <button
                    data-testid={`action-retry-${failure.id}`}
                    onClick={() => handleRetry(failure.id)}
                    className="h-10 rounded-xl bg-terracotta px-5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all active:scale-95 hover:bg-terracotta/90 shadow-sm"
                  >
                    {t('settings.retry', 'Retry')}
                  </button>
                )}

                <button
                  data-testid={`action-clear-${failure.id}`}
                  onClick={() => handleClear(failure.id)}
                  disabled={clearingIds.has(failure.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-terracotta/20 text-terracotta/40 transition-all hover:bg-terracotta/5 hover:text-terracotta disabled:opacity-50 active:scale-90"
                  aria-label={t('settings.clearFailedCapture', 'Clear failed capture')}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {errorIds.has(failure.id) && (
                <p
                  data-testid={`action-retry-error-${failure.id}`}
                  className="text-xs font-bold text-terracotta"
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
