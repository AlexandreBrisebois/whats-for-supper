'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLibraryStore } from '@/store/libraryStore';
import { getImageUrl } from '@/lib/imageUtils';

const TOAST_DURATION_MS = 5000;

/**
 * LibraryToast — auto-dismissing success notification for recipe_ready events.
 *
 * Shows ONE toast at a time (most recent). If >1 pending: shows "+N more" count badge.
 * Tapping the notification opens the completed recipe. The explicit X dismisses without navigation.
 *
 * Mounted at layout level (pwa/src/app/(app)/layout.tsx).
 */
export function LibraryToast() {
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
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex flex-col items-stretch gap-1.5 w-full max-w-sm pointer-events-auto"
          role="status"
          aria-live="polite"
          aria-label={`${current.name} is ready`}
        >
          <div className="relative w-full overflow-hidden rounded-2xl border border-sage/30 border-l-4 border-l-sage bg-white/95 shadow-glass backdrop-blur-md">
            <button
              type="button"
              onClick={handleViewRecipe}
              aria-label={`View ${current.name}`}
              className="flex w-full items-center gap-3 pr-12 text-left active:scale-[0.98] transition-transform"
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
                  <div className="h-10 w-10 rounded-xl bg-sage/20 flex items-center justify-center text-sage">
                    <Utensils size={20} />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 py-3">
                <p className="text-sm text-charcoal leading-snug">
                  <span className="text-sage mr-1">✓</span>
                  <span className="font-bold">{current.name}</span>
                  {' is ready!'}
                </p>
                <p className="text-[10px] text-charcoal/50 font-medium mt-0.5">
                  Tap to view recipe
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss notification"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-charcoal/40 transition-colors hover:bg-charcoal/5 hover:text-charcoal/70"
            >
              <X size={14} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage/10">
              <motion.div
                className="h-full bg-sage/60 transition-none"
                animate={{ scaleX: progress / 100 }}
                style={{ transformOrigin: 'left center' }}
              />
            </div>
          </div>

          {/* "+N more" badge */}
          {extraCount > 0 && (
            <div className="self-center">
              <span className="text-[10px] font-bold text-sage/70 bg-sage/10 border border-sage/20 px-3 py-1 rounded-full">
                +{extraCount} more
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
