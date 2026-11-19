'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Utensils, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLibraryStore } from '@/store/libraryStore';
import { getImageUrl } from '@/lib/imageUtils';
import { t, tWithVars } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';

const TOAST_DURATION_MS = 5000;

/**
 * LibraryToast — auto-dismissing success notification for recipe_ready events.
 *
 * Shows ONE toast at a time (most recent). If >1 pending: shows "+N more" count badge.
 * Tapping the notification opens the completed recipe. The explicit X dismisses without navigation.
 *
 * Mounted at layout level (`pwa/src/app/(app)/layout.tsx`).
 */
export function LibraryToast() {
  const { locale } = useLocale();
  const reducedMotion = useReducedMotion();
  const notifications = useLibraryStore((s) => s.notifications);
  const dismissNotification = useLibraryStore((s) => s.dismissNotification);
  const router = useRouter();

  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Only show 'ready' notifications
  const readyNotifications = notifications.filter((n) => n.type === 'ready');
  // Most recent is last in the array (pushNotification appends)
  const current = readyNotifications[readyNotifications.length - 1] ?? null;
  const extraCount = readyNotifications.length - 1;

  // Reset and start auto-dismiss timer whenever the current toast changes
  useEffect(() => {
    if (!current) return;

    // Reset progress — intentional synchronous state set to reset the bar
    // before the interval starts. This is not a cascading render issue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(100);
    startTimeRef.current = Date.now();

    // Progress bar interval — updates every 50ms
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION_MS) * 100);
      setProgress(remaining);
    }, 50);

    // Auto-dismiss after 5s
    timerRef.current = setTimeout(() => {
      dismissNotification(current.recipeId);
    }, TOAST_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.recipeId]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (current) dismissNotification(current.recipeId);
  };

  const handleViewRecipe = () => {
    if (!current) return;

    dismissNotification(current.recipeId);
    router.push(`/recipes?open=${current.recipeId}` as any);
  };

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.recipeId}
          initial={reducedMotion ? false : { y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={
            reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }
          }
          className="flex flex-col items-stretch gap-1.5 w-full max-w-sm pointer-events-auto"
          role="status"
          aria-live="polite"
          aria-label={tWithVars(
            'capture.toast.readyAria',
            '{{name}} is ready',
            { name: current.name },
            locale
          )}
        >
          <div
            data-testid="library-toast-card"
            className="glass-toast relative w-full overflow-hidden rounded-2xl border border-garden-line border-l-4 border-l-garden-fill"
          >
            <button
              type="button"
              onClick={handleViewRecipe}
              aria-label={tWithVars(
                'capture.toast.viewAria',
                'View {{name}}',
                { name: current.name },
                locale
              )}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl pr-12 text-left active:scale-[0.98] transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0 ml-3 my-3">
                {current.imageUrl ? (
                  <div className="relative h-10 w-10 rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(current.imageUrl)}
                      alt={current.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-sage-50 flex items-center justify-center text-garden-ink">
                    <Utensils size={20} aria-hidden="true" />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 py-3">
                <p className="text-sm text-ink-body leading-snug">
                  <span className="text-garden-ink mr-1 font-semibold" aria-hidden="true">
                    ✓
                  </span>
                  <span className="font-bold">{current.name}</span>
                  {t('capture.toast.readySuffix', ' is ready!', locale)}
                </p>
                <p className="text-xs text-ink-muted font-medium mt-0.5">
                  {t('capture.toast.tapToView', 'Tap to view recipe', locale)}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t('capture.toast.dismissAria', 'Dismiss notification', locale)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-charcoal-100 hover:text-ink-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
            >
              <X size={16} aria-hidden="true" />
            </button>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage-100">
              <motion.div
                className="h-full bg-garden-fill transition-none"
                animate={{ scaleX: progress / 100 }}
                transition={reducedMotion ? { duration: 0 } : undefined}
                style={{ transformOrigin: 'left center' }}
              />
            </div>
          </div>

          {/* "+N more" badge */}
          {extraCount > 0 && (
            <div className="self-center">
              <span className="text-xs font-semibold text-garden-ink bg-sage-50 border border-garden-line px-3 py-1 rounded-full">
                {tWithVars(
                  'capture.toast.moreCount',
                  '+{{count}} more',
                  { count: extraCount },
                  locale
                )}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
