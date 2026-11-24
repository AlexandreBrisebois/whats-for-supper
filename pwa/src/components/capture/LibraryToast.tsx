'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Utensils, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLibraryStore } from '@/store/libraryStore';
import { getImageUrl } from '@/lib/imageUtils';
import { t, tWithVars } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';

const TOAST_DURATION_MS = 5000;

/**
 * LibraryToast auto-dismissing completion notification for recipe_ready events.
 * Shows the most recent ready notification in an opaque white Garden-bordered card.
 * Tapping opens the recipe (or paired duplicate review when flagged as a suspected duplicate).
 */
export function LibraryToast() {
  const { locale } = useLocale();
  const reducedMotion = useReducedMotion();
  const notifications = useLibraryStore((s) => s.notifications);
  const dismissNotification = useLibraryStore((s) => s.dismissNotification);
  const router = useRouter();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readyNotifications = notifications.filter((n) => n.type === 'ready');
  const current = readyNotifications[readyNotifications.length - 1] ?? null;

  useEffect(() => {
    if (!current) return;

    timerRef.current = setTimeout(() => {
      dismissNotification(current.recipeId);
    }, TOAST_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
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
    const target = current.isSuspectedDuplicate
      ? `/recipes?open=${current.recipeId}&reviewDuplicate=1`
      : `/recipes?open=${current.recipeId}`;
    router.push(target as any);
  };

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.recipeId}
          initial={reducedMotion ? false : { y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }
          }
          className="flex flex-col items-stretch w-full max-w-sm pointer-events-auto"
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
            className="relative w-full overflow-hidden rounded-2xl border border-garden-line bg-white shadow-sm"
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
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl pr-14 text-left active:scale-[0.98] transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
            >
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

              <div className="flex-1 min-w-0 py-3">
                <p className="text-sm text-ink-body leading-snug">
                  <span className="text-garden-ink mr-1 font-semibold" aria-hidden="true">
                    ✓
                  </span>
                  <span className="font-bold">{current.name}</span>
                  {t('capture.toast.readySuffix', ' is ready!', locale)}
                </p>
                <p
                  className={
                    current.isSuspectedDuplicate
                      ? 'text-xs text-sunlight-ink font-semibold mt-0.5'
                      : 'text-xs text-ink-muted font-medium mt-0.5'
                  }
                >
                  {current.isSuspectedDuplicate
                    ? t(
                        'capture.toast.possibleDuplicate',
                        'Possible duplicate · Tap to review',
                        locale
                      )
                    : t('capture.toast.tapToView', 'Tap to view recipe', locale)}
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
