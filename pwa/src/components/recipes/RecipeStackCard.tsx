'use client';

import React from 'react';
import { Clock } from 'lucide-react';
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
  canSwipeRight?: boolean;
  canSwipeLeft?: boolean;
  onSwipeRight: () => void; // Navigate to previous card
  onSwipeLeft: () => void; // Navigate to next card
  onTap: () => void; // Open Recipe Detail Sheet
}

export const RecipeStackCard: React.FC<RecipeStackCardProps> = ({
  id,
  name,
  imageUrl,
  totalTime,
  importIssueStatus,
  isFront,
  stackIndex,
  canSwipeRight = true,
  canSwipeLeft = true,
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
  const formattedTime = formatRecipeTime(totalTime);

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
    if ((direction > 0 && !canSwipeRight) || (direction < 0 && !canSwipeLeft)) {
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
      className={
        isFront
          ? 'relative w-full cursor-grab active:cursor-grabbing pointer-events-none'
          : 'absolute inset-0 cursor-grab active:cursor-grabbing pointer-events-none'
      }
      data-testid={isFront ? 'stack-card-front' : 'stack-card-back'}
      data-recipe-id={id}
      {...(isFront ? { 'data-front': 'true' } : {})}
      whileTap={isFront ? { scale: 0.98 } : {}}
    >
      <div
        data-testid={`stack-card-${id}`}
        className={`h-full w-full overflow-hidden rounded-[2.5rem] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_20px_40px_-1px_rgba(0,0,0,0.05)] border-t border-white/20 flex flex-col ${isFront ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div
          data-testid="stack-card-image"
          aria-hidden={!isFront}
          className={`relative h-[clamp(192px,35vh,320px)] shrink-0 w-full overflow-hidden ${stackIndex > 1 ? 'invisible' : ''}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getImageUrl(imageUrl)}
            alt={isFront ? name : ''}
            className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
          />

          {formattedTime && (
            <span
              data-testid="stack-time-badge"
              className="absolute bottom-4 left-4 z-30 inline-flex max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-full border border-white bg-terracotta-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-terracotta-700 shadow-md"
            >
              <Clock size={14} aria-hidden="true" className="shrink-0" />
              {tWithVars('common.readyIn', 'READY IN {{time}}', { time: formattedTime })}
            </span>
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
        </div>

        <div
          aria-hidden={!isFront}
          className={`shrink-0 px-6 py-4 md:px-8 ${stackIndex > 1 ? 'invisible' : ''}`}
        >
          <h2
            className={`text-2xl md:text-3xl font-bold tracking-tight font-heading leading-tight break-words ${isFront ? '' : 'line-clamp-1'}`}
          >
            {name}
          </h2>
        </div>
      </div>
      {isFront && importIssueStatus && (
        <div className="absolute -bottom-7 left-4">
          <RecipeImportIssueBadge status={importIssueStatus} variant="compact" />
        </div>
      )}
    </motion.div>
  );
};
