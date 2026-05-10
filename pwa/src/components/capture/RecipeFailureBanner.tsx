'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { retryCaptureFailure } from '@/lib/api/captures';
import { useLibraryStore } from '@/store/libraryStore';

const MAX_VISIBLE_BANNERS = 2;

/**
 * RecipeFailureBanner — persistent recovery banner for recipe_failed events.
 *
 * - Does NOT auto-dismiss. Toasts from the top so it does not fight bottom navigation.
 * - Max 2 banners visible simultaneously (oldest dismissed first if 3+ failures).
 * - Retry → resumes the failed workflow instance.
 * - Dismiss → hides without retry.
 *
 * Mounted at layout level (pwa/src/app/(app)/layout.tsx).
 */
export function RecipeFailureBanner() {
  const notifications = useLibraryStore((s) => s.notifications);
  const dismissNotification = useLibraryStore((s) => s.dismissNotification);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  // Only show 'failed' notifications
  const failedNotifications = notifications.filter((n) => n.type === 'failed');

  // Cap at MAX_VISIBLE_BANNERS — show the most recent ones (last in array = newest)
  // If there are more than the cap, the oldest are not shown (they were dismissed first)
  const visible = failedNotifications.slice(-MAX_VISIBLE_BANNERS);

  if (visible.length === 0) return null;

  return (
    <div
      className="fixed left-4 right-4 top-[calc(1rem+env(safe-area-inset-top))] z-50 flex flex-col gap-2"
      role="alert"
      aria-live="assertive"
    >
      <AnimatePresence initial={false}>
        {visible.map((notification) => {
          const recipeName =
            (notification.partialData as { name?: string } | undefined)?.name ||
            notification.name ||
            'your recipe';

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
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div
                data-testid={`recipe-failure-banner-${notification.recipeId}`}
                className="w-full overflow-hidden rounded-2xl border border-terracotta/30 border-l-4 border-l-terracotta bg-white/95 shadow-glass backdrop-blur-md"
              >
                <div className="flex items-start gap-3 p-3">
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-terracotta/15 flex items-center justify-center text-terracotta/70">
                      <AlertCircle size={16} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-charcoal leading-snug">
                      Recipe couldn&apos;t be saved —{' '}
                      <span className="font-bold">{recipeName}</span>.{' '}
                      <span className="text-terracotta/80 font-medium">Tap to try again.</span>
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={!retryId || isRetrying}
                        data-testid={`recipe-failure-retry-${notification.recipeId}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-terracotta px-3 py-1.5 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                      >
                        <RotateCcw size={13} />
                        {isRetrying ? 'Retrying...' : 'Retry'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDismiss}
                        data-testid={`recipe-failure-dismiss-${notification.recipeId}`}
                        className="rounded-xl px-3 py-1.5 text-xs font-bold text-charcoal/60 transition-colors hover:bg-charcoal/5"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss failure notification"
                    data-testid={`recipe-failure-dismiss-icon-${notification.recipeId}`}
                    className="rounded-full p-1.5 text-charcoal/40 transition-colors hover:bg-charcoal/5 hover:text-charcoal/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
