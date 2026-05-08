'use client';

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { getCaptureFailures, retryCaptureFailure, type CaptureFailure } from '@/lib/api/captures';
import { t } from '@/locales';

export function FailedCapturesSection() {
  const [failures, setFailures] = useState<CaptureFailure[]>([]);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
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
                  className="self-start rounded-xl bg-indigo px-4 py-2 text-xs font-bold text-lavender transition-all active:scale-95 hover:bg-indigo/90"
                >
                  {t('settings.retry', 'Retry')}
                </button>
              )}

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
