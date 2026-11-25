'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import { CaptureActivitySheet } from './CaptureActivitySheet';
import { useCaptureStore } from '@/store/captureStore';
import { useLocale } from '@/components/common/LocaleProvider';
import { t, tWithVars } from '@/locales';
import type { CaptureActivityItem } from '@/lib/api/captures';

export function CaptureActivityBar() {
  const { locale } = useLocale();
  const activityItems = useCaptureStore((s) => s.activityItems);
  const pendingRecipes = useCaptureStore((s) => s.pendingRecipes);
  const hydrate = useCaptureStore((s) => s.hydrate);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const items = useMemo<CaptureActivityItem[]>(() => {
    const serverRecipeIds = new Set(
      activityItems.map((item) => item.recipeId).filter((id): id is string => Boolean(id))
    );
    const optimistic: CaptureActivityItem[] = pendingRecipes
      .filter((pending) => !serverRecipeIds.has(pending.recipeId))
      .map((pending) => ({
        id: pending.recipeId,
        workflowInstanceId: null,
        recipeId: pending.recipeId,
        stage: 'preparing',
        title: pending.name?.trim() || '',
        sourceWorkflowId: null,
        sourceType: null,
        stepName: null,
        stepLabel: null,
        previewText: pending.name ?? null,
        friendlyReason: null,
        retryCount: 0,
        isReady: false,
        isSuspectedDuplicate: false,
        updatedAt: new Date(pending.submittedAt).toISOString(),
      }));
    return [...activityItems, ...optimistic];
  }, [activityItems, pendingRecipes]);

  if (items.length === 0) return null;

  const failedItems = items.filter((i) => i.stage === 'failed');
  const preparingItems = items.filter((i) => i.stage === 'preparing');
  const indexedOrEnrichingItems = items.filter(
    (i) => i.stage === 'indexing' || i.stage === 'enriching'
  );
  const pausedEnrichItems = items.filter((i) => i.stage === 'enrichment_paused');

  const activeCount = preparingItems.length + indexedOrEnrichingItems.length;

  let heading = '';
  let subline = '';
  let variant: 'failed' | 'active' | 'paused' | 'enriching' = 'active';

  if (failedItems.length > 0) {
    variant = 'failed';
    const attention =
      failedItems.length === 1
        ? t('home.captureActivity.needsAttentionOne', '1 needs attention', locale)
        : tWithVars(
            'home.captureActivity.needsAttentionMany',
            '{{count}} need attention',
            { count: failedItems.length },
            locale
          );
    heading =
      activeCount > 0
        ? tWithVars(
            'home.captureActivity.attentionWithPreparing',
            '{{attention}} · {{preparing}} preparing',
            { attention, preparing: activeCount },
            locale
          )
        : attention;
    const firstFailed = failedItems[0];
    subline =
      firstFailed.title?.trim() ||
      firstFailed.previewText?.trim() ||
      firstFailed.friendlyReason ||
      '';
  } else if (preparingItems.length > 0 || items.some((i) => i.stage === 'indexing')) {
    variant = 'active';
    if (items.length === 1) {
      const only = items[0];
      const title = only.title?.trim();
      heading = title
        ? tWithVars('home.captureActivity.preparingOne', 'Preparing {{title}}', { title }, locale)
        : t('home.captureActivity.preparingOneUntitled', 'Preparing 1 recipe', locale);
      subline = only.stepName
        ? t(
            `home.captureActivity.steps.${only.stepName}`,
            only.stepLabel ||
              t('home.captureActivity.stepLabelFallback', 'Preparing recipe', locale),
            locale
          )
        : only.stepLabel || t('home.captureActivity.stepLabelFallback', 'Preparing recipe', locale);
    } else {
      heading = tWithVars(
        'home.captureActivity.preparingMany',
        'Preparing {{count}} recipes',
        { count: items.length },
        locale
      );
      subline = tWithVars(
        'home.captureActivity.breakdownActive',
        '{{preparing}} preparing · {{indexed}} indexed',
        { preparing: preparingItems.length, indexed: indexedOrEnrichingItems.length },
        locale
      );
    }
  } else if (pausedEnrichItems.length > 0) {
    variant = 'paused';
    heading = t(
      'home.captureActivity.searchableEnrichmentPaused',
      'Searchable · Enrichment paused',
      locale
    );
    subline = pausedEnrichItems[0].title?.trim() || '';
  } else {
    variant = 'enriching';
    heading = t(
      'home.captureActivity.searchableStillEnriching',
      'Searchable · Still enriching',
      locale
    );
    subline = items[0].title?.trim() || '';
  }

  const barClasses =
    variant === 'failed'
      ? 'border-hearth-line bg-white text-ink-body hover:border-hearth-ink'
      : variant === 'paused'
        ? 'border-sunlight-line bg-ochre-50 text-sunlight-ink hover:border-ink-body'
        : variant === 'enriching'
          ? 'border-garden-line bg-sage-50 text-garden-ink hover:border-ink-body'
          : 'border-chrome-line bg-white text-ink-body hover:border-hearth-line';

  const progressRatio =
    items.length > 0
      ? Math.max(
          22,
          Math.min(
            90,
            Math.round(((items.length - preparingItems.length * 0.65) / items.length) * 100)
          )
        )
      : 45;

  return (
    <>
      <button
        type="button"
        id="capture-activity-bar-trigger"
        data-testid="capture-activity-bar"
        onClick={() => setSheetOpen(true)}
        className={`flex min-h-12 w-full flex-col gap-2.5 rounded-2xl border px-4 py-3 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body ${barClasses}`}
      >
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {variant === 'failed' ? (
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hearth-line bg-terracotta-50 text-hearth-ink"
              >
                <AlertCircle size={16} />
              </span>
            ) : variant === 'paused' ? (
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sunlight-line bg-white text-sunlight-ink"
              >
                <AlertCircle size={16} />
              </span>
            ) : variant === 'enriching' ? (
              <Sparkles size={18} aria-hidden="true" className="shrink-0 text-garden-ink" />
            ) : (
              <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping motion-reduce:animate-none rounded-full bg-hearth-fill opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-hearth-fill" />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p
                className={`break-words [overflow-wrap:anywhere] text-sm font-bold leading-snug ${
                  variant === 'failed'
                    ? 'text-hearth-ink'
                    : variant === 'paused'
                      ? 'text-sunlight-ink'
                      : variant === 'enriching'
                        ? 'text-garden-ink'
                        : 'text-ink-body'
                }`}
              >
                {heading}
              </p>
              {subline && (
                <p
                  className={`truncate text-xs font-medium ${
                    variant === 'paused'
                      ? 'text-sunlight-ink'
                      : variant === 'enriching'
                        ? 'text-garden-ink'
                        : 'text-ink-muted'
                  }`}
                >
                  {subline}
                </p>
              )}
            </div>
          </div>

          <ChevronRight
            size={18}
            aria-hidden="true"
            className={`shrink-0 ${
              variant === 'failed'
                ? 'text-hearth-ink'
                : variant === 'paused'
                  ? 'text-sunlight-ink'
                  : variant === 'enriching'
                    ? 'text-garden-ink'
                    : 'text-icon-affordance'
            }`}
          />
        </div>

        {variant === 'active' && (
          <div
            data-testid="capture-activity-progress"
            aria-hidden="true"
            className="h-1.5 w-full overflow-hidden rounded-full bg-cream-100"
          >
            <div
              data-testid="capture-activity-progress-fill"
              className="h-full rounded-full bg-hearth-fill animate-pulse motion-reduce:animate-none transition-all duration-300"
              style={{ width: `${progressRatio}%` }}
            />
          </div>
        )}
      </button>

      <CaptureActivitySheet open={sheetOpen} onClose={() => setSheetOpen(false)} items={items} />
    </>
  );
}
