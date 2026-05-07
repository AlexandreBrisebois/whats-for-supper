'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLibraryStore } from '@/store/libraryStore';

const MAX_VISIBLE_BANNERS = 2;

/**
 * RecipeFailureBanner — persistent recovery banner for recipe_failed events.
 *
 * - Does NOT auto-dismiss. Sits in thumb zone, below page content, above nav bar.
 * - Max 2 banners visible simultaneously (oldest dismissed first if 3+ failures).
 * - Tap → navigate to /capture?recipeId={id}&mode=retry
 * - ✕ → dismiss without retry
 *
 * Mounted at layout level (pwa/src/app/(app)/layout.tsx).
 */
export function RecipeFailureBanner() {
  const notifications = useLibraryStore((s) => s.notifications);
  const dismissNotification = useLibraryStore((s) => s.dismissNotification);
  const router = useRouter();

  // Only show 'failed' notifications
  const failedNotifications = notifications.filter((n) => n.type === 'failed');

  // Cap at MAX_VISIBLE_BANNERS — show the most recent ones (last in array = newest)
  // If there are more than the cap, the oldest are not shown (they were dismissed first)
  const visible = failedNotifications.slice(-MAX_VISIBLE_BANNERS);

  if (visible.length === 0) return null;

  return (
    <div
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 flex flex-col gap-2"
      role="alert"
      aria-live="assertive"
    >
      <AnimatePresence initial={false}>
        {visible.map((notification) => {
          const recipeName =
            (notification.partialData as { name?: string } | undefined)?.name ||
            notification.name ||
            'your recipe';

          const handleTap = () => {
            router.push(
              `/capture?recipeId=${encodeURIComponent(notification.recipeId)}&mode=retry` as any
            );
          };

          const handleDismiss = (e: React.MouseEvent) => {
            e.stopPropagation();
            dismissNotification(notification.recipeId);
          };

          return (
            <motion.div
              key={notification.recipeId}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="relative w-full overflow-hidden rounded-2xl border border-terracotta/30 border-l-4 border-l-terracotta bg-terracotta/10">
                <button
                  type="button"
                  onClick={handleTap}
                  data-testid={`recipe-failure-banner-${notification.recipeId}`}
                  className="flex w-full items-center gap-3 pr-12 text-left active:scale-[0.98] transition-transform"
                  aria-label={`Recipe couldn't be saved — ${recipeName}. Tap to try again.`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 ml-3 my-3">
                    <div className="h-8 w-8 rounded-full bg-terracotta/15 flex items-center justify-center text-terracotta/70">
                      <AlertCircle size={16} />
                    </div>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 py-3">
                    <p className="text-sm text-charcoal leading-snug">
                      Recipe couldn&apos;t be saved —{' '}
                      <span className="font-bold">{recipeName}</span>.{' '}
                      <span className="text-terracotta/80 font-medium">Tap to try again.</span>
                    </p>
                  </div>

                  {/* Dismiss */}
                  <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss failure notification"
                    data-testid={`recipe-failure-dismiss-${notification.recipeId}`}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-charcoal/40 transition-colors hover:bg-charcoal/5 hover:text-charcoal/70"
                  >
                    <X size={14} />
                  </button>
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
