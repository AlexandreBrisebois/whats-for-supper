'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { retryCaptureFailure } from '@/lib/api/captures';
import { useLibraryStore } from '@/store/libraryStore';
import { t } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';

const MAX_VISIBLE_BANNERS = 2;

/**
 * RecipeFailureBanner persistent recovery card for recipe_failed events.
 * Uses Era 3 Hearth recovery styling without left-border stripes or duplicate close icons.
 */
export function RecipeFailureBanner() {
  const { locale } = useLocale();
  const reducedMotion = useReducedMotion();
  const notifications = useLibraryStore((s) => s.notifications);
  const dismissNotification = useLibraryStore((s) => s.dismissNotification);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const failedNotifications = notifications.filter((n) => n.type === 'failed');
  const visible = failedNotifications.slice(-MAX_VISIBLE_BANNERS);

  if (visible.length === 0) return null;

  return (
    <div
      className="flex flex-col gap-2 w-full max-w-sm pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <AnimatePresence initial={false}>
        {visible.map((notification) => {
          const recipeName =
            (notification.partialData as { name?: string } | undefined)?.name ||
            notification.name ||
            t('capture.failure.fallbackName', 'your recipe', locale);

          const retryId = notification.workflowInstanceId;
          const isRetrying = retryId ? retryingIds.has(retryId) : false;

          const handleRetry = async () => {
            if (!retryId || isRetrying) return;
            setRetryingIds((prev) => new Set(prev).add(retryId));
            try {
              await retryCaptureFailure(retryId);
              dismissNotification(notification.recipeId);
            } finally {
              setRetryingIds((prev) => {
                const next = new Set(prev);
                next.delete(retryId);
                return next;
              });
            }
          };

          const handleDismiss = () => {
            dismissNotification(notification.recipeId);
          };

          return (
            <motion.div
              key={notification.recipeId}
              initial={reducedMotion ? false : { y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={
                reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }
              }
            >
              <div
                data-testid={`recipe-failure-banner-${notification.recipeId}`}
                className="w-full overflow-hidden rounded-2xl border border-hearth-line bg-terracotta-50 shadow-card"
              >
                <div className="flex items-start gap-3 p-3.5">
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-white border border-hearth-line flex items-center justify-center text-hearth-ink">
                      <AlertCircle size={16} aria-hidden="true" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-body leading-snug">
                      {t('capture.failure.prefix', "Recipe couldn't be saved:", locale)}{' '}
                      <span className="font-bold">{recipeName}</span>.{' '}
                      <span className="text-hearth-ink font-medium">
                        {t('capture.failure.tapRetry', 'Tap to try again.', locale)}
                      </span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={!retryId || isRetrying}
                        data-testid={`recipe-failure-retry-${notification.recipeId}`}
                        className="inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-xl bg-hearth-fill hover:bg-hearth-fill-hover active:bg-hearth-fill-active px-4 py-2 text-xs font-semibold text-cream-100 transition-colors active:scale-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                        {isRetrying
                          ? t('capture.failure.retrying', 'Retrying...', locale)
                          : t('capture.failure.retry', 'Retry', locale)}
                      </button>
                      <button
                        type="button"
                        onClick={handleDismiss}
                        data-testid={`recipe-failure-dismiss-${notification.recipeId}`}
                        className="min-h-12 min-w-12 rounded-xl border border-chrome-line bg-white px-4 py-2 text-xs font-semibold text-ink-body transition-colors hover:bg-charcoal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                      >
                        {t('capture.failure.dismiss', 'Dismiss', locale)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
