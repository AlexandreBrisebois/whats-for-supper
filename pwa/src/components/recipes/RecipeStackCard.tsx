'use client';

import React from 'react';
import { motion, useTransform, useIsPresent, PanInfo, useMotionValueEvent } from 'framer-motion';
import { t, tWithVars } from '@/locales';
import { getImageUrl } from '@/lib/imageUtils';
import { formatRecipeTime } from '@/lib/duration';
import { isCardSurface, useHorizontalCardMotion } from '@/hooks/useHorizontalCardMotion';
import { RecipeImportIssueBadge } from './RecipeImportIssueBadge';
import type { RecipeImportIssueStatus } from '@/lib/api/recipes';

// ---------------------------------------------------------------------------
// RecipeStackCard
// Purpose-built browse card — NO voting logic, NO hasFamilyInterest prop.
// Requirements: 10.1–10.9, 3.1–3.5
// ---------------------------------------------------------------------------

interface RecipeStackCardProps {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  totalTime: string;
  category: string;
  cuisineType?: string | null;
  mealTypes?: string[] | null;
  importIssueStatus?: RecipeImportIssueStatus | null;
  isFront: boolean;
  stackIndex: number;
  onSwipeRight: () => void; // Navigate to previous card
  onSwipeLeft: () => void; // Navigate to next card
  onTap: () => void; // Open Recipe Detail Sheet
}

export const RecipeStackCard: React.FC<RecipeStackCardProps> = ({
  id,
  name,
  description,
  imageUrl,
  totalTime,
  category,
  cuisineType,
  mealTypes,
  importIssueStatus,
  isFront,
  stackIndex,
  onSwipeRight,
  onSwipeLeft,
  onTap,
}) => {
  const { x, controls, startDrag, dragProps, motionStyle } = useHorizontalCardMotion(isFront);

  // Haptic feedback at 60px drag distance
  const [hasVibrated, setHasVibrated] = React.useState(false);
  useMotionValueEvent(x, 'change', (latest) => {
    if (Math.abs(latest) > 60 && !hasVibrated) {
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      setHasVibrated(true);
    } else if (Math.abs(latest) < 50 && hasVibrated) {
      setHasVibrated(false);
    }
  });

  // Swipe indicator opacity & scale — matching DiscoveryCard visual language
  const nextOpacity = useTransform(x, [20, 60], [0, 1]);
  const backOpacity = useTransform(x, [-60, -20], [1, 0]);

  const nextScale = useTransform(x, [0, 100], [0.5, 1.5]);
  const backScale = useTransform(x, [0, -100], [0.5, 1.5]);

  // Stack depth effects
  const scale = 1 - stackIndex * 0.05;
  const yOffset = stackIndex * 15;
  const opacity = 1 - stackIndex * 0.3;

  React.useEffect(() => {
    if (isFront) {
      controls.start({
        x: 0,
        rotate: 0,
        scale: 1,
        y: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 140, damping: 20 },
      });
    } else {
      controls.start({
        x: 0,
        rotate: 0,
        scale: Math.max(0.8, scale),
        y: yOffset,
        opacity: Math.max(0, opacity),
        transition: { duration: 0.25 },
      });
    }
  }, [isFront, stackIndex, controls, scale, yOffset, opacity]);

  // Track whether a drag occurred so we can distinguish tap from swipe
  const didDrag = React.useRef(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();
  const lifecycle = React.useRef(0);
  const departing = React.useRef(false);

  React.useLayoutEffect(() => {
    const version = ++lifecycle.current;
    departing.current = false;
    didDrag.current = false;
    return () => {
      lifecycle.current = version + 1;
      departing.current = false;
      controls.stop();
    };
  }, [id, isFront, isPresent, controls]);

  const handleDragStart = () => {
    didDrag.current = false;
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 5) {
      didDrag.current = true;
    }
  };

  const returnToOrigin = () => {
    controls.start({
      x: 0,
      rotate: 0,
      transition: { type: 'spring', stiffness: 150, damping: 22 },
    });
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isFront || !isPresent || departing.current) return;
    if (event?.type === 'pointercancel') {
      didDrag.current = true;
      returnToOrigin();
      return;
    }

    // Release intent is Browse-owned; it is independent of movement elasticity.
    const threshold = 35;
    const velocityThreshold = 280;
    const direction =
      info.offset.x > threshold || info.velocity.x > velocityThreshold
        ? 1
        : info.offset.x < -threshold || info.velocity.x < -velocityThreshold
          ? -1
          : 0;
    if (!direction) {
      returnToOrigin();
      return;
    }

    departing.current = true;
    const version = lifecycle.current;
    controls
      .start({
        x: direction * 500,
        rotate: direction * 20,
        opacity: 0,
        transition: { duration: 0.24, ease: 'easeOut' },
      })
      .then(() => {
        if (version !== lifecycle.current) return;
        if (direction > 0) onSwipeRight();
        else onSwipeLeft();
      });
  };

  const handleTap = (event?: MouseEvent | TouchEvent | PointerEvent) => {
    if (!isFront || !isPresent || departing.current) return;
    // Explicit keyboard handling below owns Enter/Space, not Motion's synthetic tap.
    if (
      event &&
      (!isCardSurface(event.target, cardRef.current) ||
        ('pointerType' in event && event.pointerType === ''))
    )
      return;
    if (didDrag.current) return;
    onTap();
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      style={{ ...motionStyle, zIndex: 10 - stackIndex }}
      role={isFront ? 'button' : undefined}
      tabIndex={isFront ? 0 : -1}
      aria-label={
        isFront ? `${t('cook.openRecipeDetails', 'Open recipe details')}: ${name}` : undefined
      }
      onKeyDown={(event) => {
        if (
          isFront &&
          isPresent &&
          !departing.current &&
          event.target === event.currentTarget &&
          !event.repeat &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          onTap();
        }
      }}
      {...dragProps}
      animate={controls}
      onPointerDown={(event) => {
        if (!isPresent || departing.current) return;
        if (startDrag(event)) didDrag.current = false;
      }}
      onPointerCancel={(event) => {
        if (event.isPrimary !== false) didDrag.current = true;
      }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onTap={handleTap}
      className="absolute inset-x-0 top-0 bottom-12 cursor-grab active:cursor-grabbing"
      data-testid={isFront ? 'stack-card-front' : 'stack-card-back'}
      data-recipe-id={id}
      {...(isFront ? { 'data-front': 'true' } : {})}
      whileTap={isFront ? { scale: 0.98 } : {}}
    >
      <div
        data-testid={`stack-card-${id}`}
        className="h-full w-full overflow-hidden rounded-[2.5rem] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_20px_40px_-1px_rgba(0,0,0,0.05)] border-t border-white/20 flex flex-col"
      >
        <div className="relative aspect-[16/10] md:aspect-[16/9] w-full overflow-hidden shrink-0 [@media(max-height:740px)]:max-h-[40%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getImageUrl(imageUrl)}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
          />

          {importIssueStatus && (
            <div className="absolute left-5 top-5 z-30">
              <RecipeImportIssueBadge status={importIssueStatus} />
            </div>
          )}

          {/* Swipe direction indicators — Ghost style aligned with Discovery voting */}
          {isFront && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              {/* Back indicator (swipe right) - Terracotta color */}
              <motion.div
                style={{
                  opacity: nextOpacity,
                  scale: nextScale,
                }}
                data-testid="stack-swipe-next-indicator"
                className="flex flex-col items-center rounded-full bg-terracotta/30 p-8 text-white backdrop-blur-md shadow-2xl"
              >
                <span className="text-xl font-black tracking-widest">
                  {t('buttons.back', 'BACK')}
                </span>
              </motion.div>

              {/* Next indicator (swipe left) - Sage color */}
              <motion.div
                style={{
                  opacity: backOpacity,
                  scale: backScale,
                }}
                data-testid="stack-swipe-back-indicator"
                className="flex flex-col items-center rounded-full bg-sage/30 p-8 text-white backdrop-blur-md shadow-2xl"
              >
                <span className="text-xl font-black tracking-widest">
                  {t('buttons.next', 'NEXT')}
                </span>
              </motion.div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        <div className="flex-1 p-8 md:p-10 flex flex-col min-h-0 overflow-y-auto touch-pan-y [@media(max-height:700px)]:p-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-heading mb-3 md:mb-4 leading-tight shrink-0">
            {name}
          </h2>

          <div className="flex-1 relative overflow-hidden min-h-0 mb-4 md:mb-6">
            <p className="text-charcoal/60 text-sm md:text-base leading-relaxed">{description}</p>
            {description && (
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
            )}
          </div>

          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.15em] border-t border-charcoal/5 pt-4 shrink-0">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ochre-50/80 text-ochre-700">
              {tWithVars('common.readyIn', 'READY IN {{time}}', {
                time: formatRecipeTime(totalTime),
              })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
