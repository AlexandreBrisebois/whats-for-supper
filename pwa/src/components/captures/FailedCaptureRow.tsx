'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/common/LocaleProvider';
import { getCaptureFailureDetails } from '@/lib/api/captures';
import { t } from '@/locales';

export interface FailedCaptureRowProps {
  id: string;
  title?: string | null;
  friendlyReason: string;
  previewText?: string | null;
  isReady?: boolean;
  retrying?: boolean;
  clearing?: boolean;
  confirmingClear?: boolean;
  errorMessage?: string | null;
  onRetry: (id: string) => void;
  onRequestClear: (id: string) => void;
  onCancelClear: () => void;
  onConfirmClear: (id: string) => void;
}

export function FailedCaptureRow({
  id,
  title,
  friendlyReason,
  previewText,
  isReady = false,
  retrying = false,
  clearing = false,
  confirmingClear = false,
  errorMessage = null,
  onRetry,
  onRequestClear,
  onCancelClear,
  onConfirmClear,
}: FailedCaptureRowProps) {
  const { locale } = useLocale();
  const [copiedState, setCopiedState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [copyPending, setCopyPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopyDetails() {
    if (copyPending) return;
    setCopyPending(true);
    try {
      const details = await getCaptureFailureDetails(id);
      const formatted = [
        `Workflow: ${details.workflowInstanceId}`,
        `Recipe: ${details.recipeId ?? 'none'}`,
        `Step: ${details.failedStep ?? 'unknown'}`,
        `Retries: ${details.retryCount}`,
        details.errorMessage ? `Error: ${details.errorMessage}` : null,
        details.stackTrace ? `Stack:\n${details.stackTrace}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(formatted);
      }
      setCopiedState('copied');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopiedState('idle'), 1500);
    } catch {
      setCopiedState('error');
    } finally {
      setCopyPending(false);
    }
  }

  const displayTitle = title?.trim() || null;

  return (
    <li
      data-testid={`failed-capture-${id}`}
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-chrome-line bg-cream-100 p-4 shadow-sm"
    >
      <div className="flex min-w-0 flex-col gap-1">
        {displayTitle && (
          <p className="break-words [overflow-wrap:anywhere] font-heading text-sm font-bold leading-snug text-ink-body">
            {displayTitle}
          </p>
        )}
        <p
          data-testid={`failed-capture-reason-${id}`}
          className={
            displayTitle
              ? 'break-words [overflow-wrap:anywhere] text-xs font-medium leading-relaxed text-ink-muted'
              : 'break-words [overflow-wrap:anywhere] text-sm font-bold tracking-tight text-ink-body'
          }
        >
          {friendlyReason}
        </p>
        {previewText && previewText !== displayTitle && (
          <p className="min-w-0 break-all text-xs font-medium text-ink-muted line-clamp-2">
            {previewText}
          </p>
        )}
      </div>

      {confirmingClear ? (
        <div
          data-testid={`clear-confirm-${id}`}
          className="flex flex-col gap-3 rounded-xl border border-hearth-line bg-white p-3.5"
        >
          <p className="text-xs font-medium leading-relaxed text-ink-body">
            {isReady
              ? t(
                  'settings.dismissCaptureConsequence',
                  'Dismiss this failed re-import notice? Your saved recipe stays in your cookbook.',
                  locale
                )
              : t(
                  'settings.deleteCaptureConsequence',
                  'Delete this failed capture and its unfinished files?',
                  locale
                )}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={clearing}
              data-testid={`action-clear-cancel-${id}`}
              onClick={onCancelClear}
              className="min-h-12 w-full justify-center whitespace-normal text-center text-xs leading-tight"
            >
              {t('settings.cancel', 'Cancel', locale)}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={clearing}
              data-testid={`action-clear-confirm-${id}`}
              onClick={() => onConfirmClear(id)}
              className="min-h-12 w-full justify-center gap-1.5 whitespace-normal text-center text-xs leading-tight"
            >
              {!isReady && <Trash2 size={14} aria-hidden="true" className="shrink-0" />}
              <span>
                {isReady
                  ? t('settings.dismissCapture', 'Dismiss', locale)
                  : t('settings.deleteCapture', 'Delete', locale)}
              </span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          {retrying ? (
            <span
              data-testid={`action-retry-${id}-retrying`}
              className="flex min-h-12 flex-1 items-center text-xs font-semibold text-hearth-ink"
            >
              {t('settings.retrying', 'Retrying...', locale)}
            </span>
          ) : (
            <button
              type="button"
              data-testid={`action-retry-${id}`}
              onClick={() => onRetry(id)}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-hearth-fill px-4 text-xs font-semibold text-cream-100 shadow-sm transition-colors hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
            >
              <RotateCcw size={15} aria-hidden="true" className="shrink-0" />
              <span>{t('settings.retry', 'Retry', locale)}</span>
            </button>
          )}

          <button
            type="button"
            data-testid={`action-copy-${id}`}
            onClick={() => void handleCopyDetails()}
            disabled={copyPending}
            aria-label={t('settings.copyDetails', 'Copy technical details', locale)}
            className="flex h-12 w-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-chrome-line bg-white text-ink-body transition-colors hover:border-ink-body disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
          >
            <Copy size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            data-testid={`action-clear-${id}`}
            onClick={() => onRequestClear(id)}
            disabled={clearing}
            aria-label={t('settings.clearFailedCapture', 'Clear failed capture', locale)}
            className="flex h-12 w-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-hearth-line bg-terracotta-50 text-hearth-ink transition-colors hover:border-hearth-ink hover:bg-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {copiedState === 'copied' && (
        <p
          role="status"
          data-testid={`failed-capture-copied-${id}`}
          className="text-xs font-medium text-ink-muted"
        >
          {t('settings.detailsCopied', 'Details copied', locale)}
        </p>
      )}

      {copiedState === 'error' && (
        <p role="alert" className="text-xs font-semibold text-hearth-ink">
          {t('settings.copyDetailsError', 'Could not copy details.', locale)}
        </p>
      )}

      {errorMessage && (
        <p
          data-testid={`action-retry-error-${id}`}
          role="alert"
          className="text-xs font-semibold text-hearth-ink"
        >
          {errorMessage}
        </p>
      )}
    </li>
  );
}
