'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { PivotSheetShell } from '@/components/ui/PivotSheetShell';
import { FailedCaptureRow } from '@/components/captures/FailedCaptureRow';
import { useLocale } from '@/components/common/LocaleProvider';
import {
  clearCaptureFailure,
  retryCaptureFailure,
  type CaptureActivityItem,
} from '@/lib/api/captures';
import { reindexRecipe } from '@/lib/api/recipes';
import { useCaptureStore } from '@/store/captureStore';
import { t } from '@/locales';

interface CaptureActivitySheetProps {
  open: boolean;
  onClose: () => void;
  items?: CaptureActivityItem[];
}

function resolveRecipeHref(item: CaptureActivityItem): string {
  const base = `/recipes?open=${encodeURIComponent(item.recipeId ?? item.id)}`;
  return item.isSuspectedDuplicate ? `${base}&reviewDuplicate=1` : base;
}

export function CaptureActivitySheet({
  open,
  onClose,
  items: itemsProp,
}: CaptureActivitySheetProps) {
  const { locale } = useLocale();
  const storeItems = useCaptureStore((s) => s.activityItems);
  const hydrate = useCaptureStore((s) => s.hydrate);
  const removeActivityItem = useCaptureStore((s) => s.removeActivityItem);
  const removePending = useCaptureStore((s) => s.removePending);

  const items = itemsProp ?? storeItems;

  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());
  const [confirmingClearId, setConfirmingClearId] = useState<string | null>(null);
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const [retryingEnrichIds, setRetryingEnrichIds] = useState<Set<string>>(new Set());
  const [enrichErrorIds, setEnrichErrorIds] = useState<Set<string>>(new Set());

  if (!open) return null;

  const failedItems = items.filter((item) => item.stage === 'failed');
  const activeItems = items.filter(
    (item) => item.stage === 'preparing' || item.stage === 'indexing'
  );
  const searchableItems = items.filter(
    (item) => item.stage === 'enriching' || item.stage === 'enrichment_paused'
  );

  async function handleRetryFailure(id: string) {
    if (retryingIds.has(id)) return;
    try {
      await retryCaptureFailure(id);
      setRetryingIds((prev) => new Set(prev).add(id));
      setErrorIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      void hydrate();
    } catch {
      setErrorIds((prev) => new Set(prev).add(id));
    }
  }

  async function handleConfirmClearFailure(id: string) {
    if (clearingIds.has(id)) return;
    setClearingIds((prev) => new Set(prev).add(id));
    try {
      await clearCaptureFailure(id);
      const clearedItem = items.find(
        (item) => (item.workflowInstanceId ?? item.id) === id || item.id === id
      );
      removeActivityItem(id);
      if (clearedItem?.recipeId) {
        removePending(clearedItem.recipeId);
      }
      setConfirmingClearId((prev) => (prev === id ? null : prev));
      setErrorIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      const remaining = items.filter(
        (item) => (item.workflowInstanceId ?? item.id) !== id && item.id !== id
      );
      if (remaining.length === 0) {
        onClose();
      }
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

  async function handleRetryEnrichment(recipeId: string) {
    if (retryingEnrichIds.has(recipeId)) return;
    setRetryingEnrichIds((prev) => new Set(prev).add(recipeId));
    setEnrichErrorIds((prev) => {
      const next = new Set(prev);
      next.delete(recipeId);
      return next;
    });
    try {
      await reindexRecipe(recipeId);
      void hydrate();
    } catch {
      setRetryingEnrichIds((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
      setEnrichErrorIds((prev) => new Set(prev).add(recipeId));
    }
  }

  return (
    <PivotSheetShell
      eyebrow={t('home.captureActivity.sheetTitle', 'Capture activity', locale)}
      subtitle={t('home.captureActivity.sheetSubtitle', 'Preparation, search & recovery', locale)}
      onClose={onClose}
      panelTestId="capture-activity-sheet"
      closeTestId="capture-activity-sheet-close"
      trapFocus
      restoreFocusSelector="#capture-activity-bar-trigger"
    >
      <div className="mt-4 flex max-h-[68dvh] flex-col gap-5 overflow-y-auto pr-0.5">
        {failedItems.length > 0 && (
          <section
            className="flex flex-col gap-2.5"
            aria-label={t('home.captureActivity.sectionAttention', 'Needs attention', locale)}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-hearth-ink" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-hearth-ink">
                {t('home.captureActivity.sectionAttention', 'Needs attention', locale)}
              </h3>
            </div>
            <ul className="flex flex-col gap-3">
              {failedItems.map((item) => {
                const failureId = item.workflowInstanceId ?? item.id;
                return (
                  <FailedCaptureRow
                    key={item.id}
                    id={failureId}
                    title={item.title || item.previewText}
                    friendlyReason={
                      item.friendlyReason ||
                      t(
                        'settings.retryError',
                        'Something went wrong importing the recipe. Try again or come back later.',
                        locale
                      )
                    }
                    previewText={item.previewText}
                    isReady={item.isReady}
                    retrying={retryingIds.has(failureId)}
                    clearing={clearingIds.has(failureId)}
                    confirmingClear={confirmingClearId === failureId}
                    errorMessage={
                      errorIds.has(failureId)
                        ? t('settings.retryError', 'Retry failed. Please try again.', locale)
                        : null
                    }
                    onRetry={(fid) => void handleRetryFailure(fid)}
                    onRequestClear={(fid) => setConfirmingClearId(fid)}
                    onCancelClear={() => setConfirmingClearId(null)}
                    onConfirmClear={(fid) => void handleConfirmClearFailure(fid)}
                  />
                );
              })}
            </ul>
          </section>
        )}

        {activeItems.length > 0 && (
          <section
            className="flex flex-col gap-2.5"
            aria-label={t('home.captureActivity.sectionPreparing', 'Preparing', locale)}
          >
            <h3 className="text-xs font-semibold text-ink-muted">
              {t('home.captureActivity.sectionPreparing', 'Preparing', locale)}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {activeItems.map((item) => {
                const localizedStep = item.stepName
                  ? t(
                      `home.captureActivity.steps.${item.stepName}`,
                      item.stepLabel ||
                        t('home.captureActivity.stepLabelFallback', 'Preparing recipe', locale),
                      locale
                    )
                  : item.stepLabel ||
                    t('home.captureActivity.stepLabelFallback', 'Preparing recipe', locale);
                const title =
                  item.title?.trim() ||
                  t('home.captureActivity.untitledCapture', 'Untitled recipe', locale);

                return (
                  <li
                    key={item.id}
                    data-testid={`activity-preparing-${item.id}`}
                    className="rounded-2xl border border-chrome-line bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="break-words [overflow-wrap:anywhere] font-heading text-sm font-bold text-ink-body">
                          {title}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-ink-muted">{localizedStep}</p>
                      </div>
                      {item.isReady && item.recipeId && (
                        <Link
                          href={resolveRecipeHref(item)}
                          data-testid={`activity-recipe-link-${item.recipeId}`}
                          className="inline-flex min-h-12 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-garden-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                        >
                          <span>
                            {t('home.captureActivity.sectionSearchable', 'Searchable', locale)}
                          </span>
                          <ChevronRight size={16} aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                    <div
                      aria-hidden="true"
                      className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cream-100"
                    >
                      <div
                        className={`h-full rounded-full bg-hearth-fill animate-pulse motion-reduce:animate-none ${
                          item.isReady ? 'w-4/5' : 'w-1/2'
                        }`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {searchableItems.length > 0 && (
          <section
            className="flex flex-col gap-2.5"
            aria-label={t('home.captureActivity.sectionSearchable', 'Searchable', locale)}
          >
            <h3 className="text-xs font-semibold text-ink-muted">
              {t('home.captureActivity.sectionSearchable', 'Searchable', locale)}
            </h3>
            <ul className="flex flex-col gap-3">
              {searchableItems.map((item) => {
                const recipeId = item.recipeId ?? item.id;
                const href = resolveRecipeHref(item);
                const title =
                  item.title?.trim() ||
                  t('home.captureActivity.untitledCapture', 'Untitled recipe', locale);

                if (item.stage === 'enrichment_paused') {
                  const retrying = retryingEnrichIds.has(recipeId);
                  return (
                    <li
                      key={item.id}
                      data-testid={`activity-enrichment-paused-${recipeId}`}
                      className="flex flex-col gap-3 rounded-2xl border border-sunlight-line bg-ochre-50 p-4 text-sunlight-ink shadow-sm"
                    >
                      <Link
                        href={href}
                        data-testid={`activity-recipe-link-${recipeId}`}
                        className="group flex min-h-12 items-center justify-between gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="inline-block rounded-full border border-sunlight-line bg-white px-2.5 py-0.5 text-xs font-semibold text-sunlight-ink">
                            {t(
                              'home.captureActivity.searchableEnrichmentPaused',
                              'Searchable · Enrichment paused',
                              locale
                            )}
                          </span>
                          <p className="mt-2 break-words [overflow-wrap:anywhere] font-heading text-sm font-bold text-ink-body">
                            {title}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-ink-muted">
                            {item.isSuspectedDuplicate
                              ? t(
                                  'home.captureActivity.duplicateReviewHint',
                                  'Saved · Possible duplicate — tap to review',
                                  locale
                                )
                              : t(
                                  'home.captureActivity.pausedHint',
                                  'Tap card to open · Or retry enrichment below.',
                                  locale
                                )}
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          aria-hidden="true"
                          className="shrink-0 text-sunlight-ink transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>

                      <button
                        type="button"
                        disabled={retrying}
                        data-testid={`action-retry-enrichment-${recipeId}`}
                        onClick={() => void handleRetryEnrichment(recipeId)}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-sunlight-line bg-white px-4 text-xs font-semibold text-sunlight-ink transition-colors hover:bg-cream-100 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                      >
                        <RefreshCw
                          size={15}
                          aria-hidden="true"
                          className={
                            retrying
                              ? 'animate-spin motion-reduce:animate-none shrink-0'
                              : 'shrink-0'
                          }
                        />
                        <span>
                          {retrying
                            ? t(
                                'home.captureActivity.retryingEnrichment',
                                'Retrying enrichment…',
                                locale
                              )
                            : t('home.captureActivity.retryEnrichment', 'Retry enrichment', locale)}
                        </span>
                      </button>

                      {enrichErrorIds.has(recipeId) && (
                        <p role="alert" className="text-xs font-semibold text-hearth-ink">
                          {t(
                            'home.captureActivity.retryEnrichmentError',
                            'Could not retry enrichment. Try again.',
                            locale
                          )}
                        </p>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={item.id}>
                    <Link
                      href={href}
                      data-testid={`activity-recipe-link-${recipeId}`}
                      className="group flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-garden-line bg-sage-50 p-4 text-garden-ink shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-garden-ink">
                          <Sparkles size={14} aria-hidden="true" className="shrink-0" />
                          <span>
                            {t(
                              'home.captureActivity.searchableStillEnriching',
                              'Searchable · Still enriching',
                              locale
                            )}
                          </span>
                        </span>
                        <p className="mt-1 break-words [overflow-wrap:anywhere] font-heading text-sm font-bold text-ink-body">
                          {title}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-ink-muted">
                          {item.isSuspectedDuplicate
                            ? t(
                                'home.captureActivity.duplicateReviewHint',
                                'Saved · Possible duplicate — tap to review',
                                locale
                              )
                            : t(
                                'home.captureActivity.openRecipeHint',
                                'Saved and keyword-searchable',
                                locale
                              )}
                        </p>
                      </div>
                      <ChevronRight
                        size={18}
                        aria-hidden="true"
                        className="shrink-0 text-garden-ink transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </PivotSheetShell>
  );
}
