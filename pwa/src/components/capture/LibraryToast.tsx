'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLibraryStore } from '@/store/libraryStore';
import { getImageUrl } from '@/lib/imageUtils';
import { ROUTES } from '@/lib/constants/routes';

const TOAST_DURATION_MS = 5000;

/**
 * LibraryToast — auto-dismissing success notification for recipe_ready events.
 *
 * Shows ONE toast at a time (most recent). If >1 pending: shows "+N more" count badge.
 * Tap opens a bottom drawer with "Add to this week" and "View recipe" CTAs.
 *
 * Mounted at layout level (pwa/src/app/(app)/layout.tsx).
 */
export function LibraryToast() {
  const notifications = useLibraryStore((s) => s.notifications);
  const dismissNotification = useLibraryStore((s) => s.dismissNotification);
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
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
    if (!current || drawerOpen) return;

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
  }, [current?.recipeId, drawerOpen]);

  // Pause timer when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [drawerOpen]);

  const handleToastTap = () => {
    // Pause auto-dismiss and open drawer
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDrawerOpen(true);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (current) dismissNotification(current.recipeId);
  };

  const handleAddToWeek = () => {
    setDrawerOpen(false);
    if (current) dismissNotification(current.recipeId);
    router.push(ROUTES.PLANNER as any);
  };

  const handleViewRecipe = () => {
    setDrawerOpen(false);
    if (current) {
      dismissNotification(current.recipeId);
      router.push(`/recipes/${current.recipeId}` as any);
    }
  };

  const handleDrawerDismiss = () => {
    setDrawerOpen(false);
    if (current) dismissNotification(current.recipeId);
  };

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {current && !drawerOpen && (
          <motion.div
            key={current.recipeId}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 flex flex-col items-stretch gap-1.5"
            role="status"
            aria-live="polite"
            aria-label={`${current.name} is ready`}
          >
            {/* Toast card */}
            <div className="relative w-full overflow-hidden rounded-2xl border border-sage/30 border-l-4 border-l-sage bg-sage/10">
              <button
                type="button"
                onClick={handleToastTap}
                className="flex w-full items-center gap-3 pr-12 text-left active:scale-[0.98] transition-transform"
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0 ml-3 my-3">
                  {current.imageUrl ? (
                    <div className="relative h-10 w-10 rounded-xl overflow-hidden">
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
                    Tap to add to your week
                  </p>
                </div>

                {/* Dismiss */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Dismiss notification"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-charcoal/40 transition-colors hover:bg-charcoal/5 hover:text-charcoal/70"
                >
                  <X size={14} />
                </button>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage/10">
                  <motion.div
                    className="h-full bg-sage/60 transition-none"
                    animate={{ scaleX: progress / 100 }}
                    style={{ transformOrigin: 'left center' }}
                  />
                </div>
              </button>
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

      {/* Bottom drawer — opens on toast tap */}
      <AnimatePresence>
        {drawerOpen && current && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDrawerDismiss}
              className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-sm bg-white rounded-t-[2.5rem] overflow-hidden shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-charcoal/10" />
              </div>

              <div className="px-6 pb-2">
                {/* Recipe info */}
                <div className="flex items-center gap-4 mb-6">
                  {current.imageUrl ? (
                    <div className="relative h-16 w-16 rounded-2xl overflow-hidden flex-shrink-0">
                      <img
                        src={getImageUrl(current.imageUrl)}
                        alt={current.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-sage/10 flex items-center justify-center text-sage flex-shrink-0">
                      <Utensils size={28} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-sage">
                      ✓ Ready
                    </p>
                    <h3 className="font-heading text-xl font-black text-charcoal tracking-tight leading-tight truncate">
                      {current.name}
                    </h3>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleAddToWeek}
                    data-testid="library-toast-add-to-week"
                    className="w-full h-14 rounded-2xl bg-sage text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-sage/20 active:scale-[0.98] transition-transform"
                  >
                    Add to this week
                  </button>
                  <button
                    onClick={handleViewRecipe}
                    data-testid="library-toast-view-recipe"
                    className="w-full h-14 rounded-2xl bg-charcoal/5 text-charcoal font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-transform"
                  >
                    View recipe
                  </button>
                  <button
                    onClick={handleDrawerDismiss}
                    data-testid="library-toast-dismiss"
                    className="w-full h-10 text-charcoal/40 font-bold text-xs uppercase tracking-widest active:scale-[0.98] transition-transform"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
