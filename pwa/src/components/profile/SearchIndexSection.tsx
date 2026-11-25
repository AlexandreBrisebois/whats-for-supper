'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getSearchIndexStatus,
  triggerSearchBackfill,
  type SearchIndexStatus,
} from '@/lib/api/management';
import { t, tWithVars } from '@/locales';

export function SearchIndexSection() {
  const id = useId();
  const [status, setStatus] = useState<SearchIndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [confirmingRebuild, setConfirmingRebuild] = useState(false);
  const [submitting, setSubmitting] = useState<'missing' | 'full' | null>(null);
  const [queuedNotice, setQueuedNotice] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = await getSearchIndexStatus();
      setStatus(next);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getSearchIndexStatus()
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleTriggerBackfill = async (force: boolean) => {
    setSubmitting(force ? 'full' : 'missing');
    setActionError(null);
    setQueuedNotice(false);
    try {
      await triggerSearchBackfill(force);
      setConfirmingRebuild(false);
      setQueuedNotice(true);
      await refreshStatus();
    } catch {
      setActionError(
        t(
          'searchIndex.triggerError',
          'Could not start search reindex. Existing keyword search still works; try again.'
        )
      );
    } finally {
      setSubmitting(null);
    }
  };

  const total = status?.totalReadyRecipes ?? 0;
  const searchable = status?.searchableRecipes ?? 0;
  const enriched = status?.enrichedRecipes ?? 0;
  const keywordOnly = Math.max(0, searchable - enriched);
  const notIndexed = Math.max(0, total - searchable);
  const missingCount = Math.max(0, total - enriched);
  const searchablePct = total > 0 ? Math.min(100, Math.round((searchable / total) * 100)) : 0;
  const enrichedPct = total > 0 ? Math.min(100, Math.round((enriched / total) * 100)) : 0;

  return (
    <section
      data-testid="search-index-section"
      aria-labelledby={`${id}-heading`}
      className="min-w-0 rounded-3xl border border-chrome-line bg-white p-6 shadow-sm"
    >
      <p className="text-xs font-bold text-garden-ink">
        {t('searchIndex.eyebrow', 'Search index')}
      </p>

      {!status && loading && (
        <p role="status" className="mt-2 text-sm text-ink-muted">
          {t('searchIndex.loading', 'Checking search index…')}
        </p>
      )}

      {loadError && !status && (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-sm text-hearth-ink">
          <p role="alert">{t('searchIndex.loadError', 'Unable to check search index health.')}</p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="self-start"
            onClick={() => void refreshStatus()}
          >
            {t('searchIndex.retry', 'Retry search status')}
          </Button>
        </div>
      )}

      {status && (
        <>
          <h2 id={`${id}-heading`} className="mt-1 font-heading text-lg font-bold text-ink-body">
            {tWithVars('searchIndex.heading', '{{searchable}} of {{total}} searchable', {
              searchable,
              total,
            })}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {missingCount > 0
              ? tWithVars(
                  'searchIndex.sublineMissing',
                  '{{enriched}} smart-search enriched · {{missing}} missing or paused',
                  { enriched, missing: missingCount }
                )
              : tWithVars(
                  'searchIndex.sublineComplete',
                  '{{enriched}} of {{total}} smart-search enriched',
                  { enriched, total }
                )}
          </p>

          <div
            aria-hidden="true"
            className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-cream-100"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-garden-line"
              style={{ width: `${searchablePct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-garden-fill"
              style={{ width: `${enrichedPct}%` }}
            />
          </div>

          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {missingCount > 0
              ? tWithVars(
                  'searchIndex.breakdown',
                  '{{enriched}} smart-search · {{keywordOnly}} keyword-only · {{notIndexed}} not indexed',
                  { enriched, keywordOnly, notIndexed }
                )
              : t('searchIndex.allIndexed', 'Everything indexed and enriched')}
          </p>

          {status.demoMode && (
            <p
              data-testid="search-index-demo-note"
              className="mt-3 rounded-2xl border border-sunlight-line bg-ochre-50 px-3.5 py-2.5 text-xs font-medium text-sunlight-ink"
            >
              {t(
                'searchIndex.demoModeNote',
                'Demo Mode keeps keyword indexing active without external AI embeddings.'
              )}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              data-testid="search-index-missing-btn"
              disabled={submitting !== null}
              className="w-full gap-2 px-4 text-sm"
              onClick={() => void handleTriggerBackfill(false)}
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={submitting === 'missing' ? 'animate-spin shrink-0' : 'shrink-0'}
              />
              <span>
                {missingCount > 0
                  ? tWithVars(
                      'searchIndex.indexMissingCount',
                      'Index missing recipes ({{count}})',
                      {
                        count: missingCount,
                      }
                    )
                  : t('searchIndex.indexMissing', 'Index missing recipes')}
              </span>
            </Button>

            {!confirmingRebuild ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                data-testid="search-index-rebuild-btn"
                disabled={submitting !== null}
                className="w-full gap-2 border-hearth-line px-4 text-sm text-hearth-ink"
                onClick={() => {
                  setActionError(null);
                  setConfirmingRebuild(true);
                }}
              >
                <RotateCcw size={16} aria-hidden="true" className="shrink-0" />
                <span>
                  {tWithVars(
                    'searchIndex.rebuildFull',
                    'Rebuild full search index (all {{total}})',
                    {
                      total,
                    }
                  )}
                </span>
              </Button>
            ) : (
              <div
                data-testid="search-index-rebuild-confirm"
                className="rounded-2xl border border-hearth-line bg-terracotta-50 p-4"
              >
                <p className="text-sm font-bold text-hearth-ink">
                  {t('searchIndex.rebuildConfirmTitle', 'Rebuild full search index?')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-body">
                  {tWithVars(
                    'searchIndex.rebuildConfirmBody',
                    'Re-indexes all {{total}} saved recipes in batches of 50. Search stays working.',
                    { total }
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    data-testid="search-index-rebuild-cancel"
                    disabled={submitting !== null}
                    className="flex-1 bg-white px-4 text-sm"
                    onClick={() => setConfirmingRebuild(false)}
                  >
                    {t('buttons.cancel', 'Cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    data-testid="search-index-rebuild-confirm-btn"
                    disabled={submitting !== null}
                    className="flex-1 px-4 text-sm"
                    onClick={() => void handleTriggerBackfill(true)}
                  >
                    {t('searchIndex.rebuildAll', 'Rebuild all')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            {t(
              'searchIndex.backgroundHint',
              'Existing keyword search keeps working while missing or full reindex runs in the background.'
            )}
          </p>

          {queuedNotice && (
            <p
              role="status"
              data-testid="search-index-queued"
              className="mt-3 rounded-2xl border border-garden-line bg-sage-50 px-4 py-3 text-xs font-bold text-garden-ink"
            >
              {t('searchIndex.queued', 'Reindexing in background… (updates live)')}
            </p>
          )}

          {actionError && (
            <p
              role="alert"
              data-testid="search-index-error"
              className="mt-3 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-xs font-medium text-hearth-ink"
            >
              {actionError}
            </p>
          )}
        </>
      )}
    </section>
  );
}
