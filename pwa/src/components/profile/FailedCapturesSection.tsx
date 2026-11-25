'use client';

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  clearCaptureFailure,
  getCaptureFailures,
  retryCaptureFailure,
  type CaptureFailure,
} from '@/lib/api/captures';
import { FailedCaptureRow } from '@/components/captures/FailedCaptureRow';
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
      className="w-full rounded-3xl border border-chrome-line bg-white p-6 shadow-card sm:p-8"
    >
      <div className="mb-6 flex items-center gap-3">
        <AlertCircle className="h-4 w-4 text-hearth-ink" aria-hidden="true" />
        <h3 className="text-xs font-semibold text-hearth-ink">
          {t('settings.failedCaptures', 'Failed captures')}
        </h3>
      </div>

      <ul className="flex flex-col gap-4">
        {failures.map((failure) => (
          <FailedCaptureRow
            key={failure.id}
            id={failure.id}
            friendlyReason={failure.friendlyReason}
            previewText={failure.previewText}
            isReady={failure.isReady}
            retrying={retryingIds.has(failure.id)}
            clearing={clearingIds.has(failure.id)}
            confirmingClear={confirmingClearId === failure.id}
            errorMessage={
              errorIds.has(failure.id)
                ? t('settings.retryError', 'Retry failed. Please try again.')
                : null
            }
            onRetry={(id) => void handleRetry(id)}
            onRequestClear={(id) => setConfirmingClearId(id)}
            onCancelClear={() => setConfirmingClearId(null)}
            onConfirmClear={(id) => void handleConfirmClear(id)}
          />
        ))}
      </ul>
    </div>
  );
}
