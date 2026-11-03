'use client';

import React, { useEffect } from 'react';
import { motion, useTransform, PanInfo, useMotionValueEvent } from 'framer-motion';
import { t, tWithVars } from '@/locales';
import { getImageUrl } from '@/lib/imageUtils';
import { formatRecipeTime } from '@/lib/duration';
import { useHorizontalCardMotion } from '@/hooks/useHorizontalCardMotion';
import { Clock, Heart, X } from 'lucide-react';

interface DiscoveryCardProps {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  isFront: boolean;
  stackIndex: number;
  totalTime: string;
  category: string;
  cuisineType?: string | null;
  mealTypes?: string[] | null;
  hasFamilyInterest?: boolean;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  id,
  name,
  imageUrl,
  onSwipeRight,
  onSwipeLeft,
  isFront,
  stackIndex,
  totalTime,
  hasFamilyInterest: _hasFamilyInterest,
}) => {
  const { x, controls, startDrag, dragProps, motionStyle } = useHorizontalCardMotion(isFront);

  // Haptics
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

  // Indicators opacity
  const likeOpacity = useTransform(x, [20, 60], [0, 1]);
  const passOpacity = useTransform(x, [-60, -20], [1, 0]);

  const likeScale = useTransform(x, [0, 100], [0.5, 1.5]);
  const passScale = useTransform(x, [0, -100], [0.5, 1.5]);

  // Calculate stack depth effects
  const scale = 1 - stackIndex * 0.05;
  const yOffset = stackIndex * 15;
  const opacity = 1 - stackIndex * 0.3;

  useEffect(() => {
    if (isFront) {
      controls.start({
        x: 0,
        rotate: 0,
        scale: 1,
        y: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 100, damping: 15 },
      });
    } else {
      controls.start({
        x: 0,
        rotate: 0,
        scale: Math.max(0.8, scale),
        y: yOffset,
        opacity: Math.max(0, opacity),
        transition: { duration: 0.15 },
      });
    }
  }, [isFront, stackIndex, controls, scale, yOffset, opacity]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (!isFront) return;

    const threshold = 80;
    const velocityThreshold = 500;

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      x.set(0);
      controls
        .start({
          x: 500,
          rotate: 20,
          opacity: 0,
          transition: { duration: 0.3, ease: 'easeOut' },
        })
        .then(onSwipeRight);
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      x.set(0);
      controls
        .start({
          x: -500,
          rotate: -20,
          opacity: 0,
          transition: { duration: 0.3, ease: 'easeOut' },
        })
        .then(onSwipeLeft);
    } else {
      controls.start({
        x: 0,
        rotate: 0,
        transition: { type: 'spring', stiffness: 100, damping: 15 },
      });
    }
  };

  const formattedTime = formatRecipeTime(totalTime);

  return (
    <motion.div
      style={{ ...motionStyle, zIndex: 10 - stackIndex }}
      {...dragProps}
      onPointerDown={startDrag}
      animate={controls}
      onDragEnd={handleDragEnd}
      className="absolute inset-x-0 top-0 bottom-12 cursor-grab active:cursor-grabbing"
      data-testid="discovery-card"
      data-recipe-id={id}
      data-front={isFront}
      whileTap={isFront ? { scale: 0.98 } : {}}
    >
      <motion.div className="h-full w-full overflow-hidden rounded-[2.5rem] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_20px_40px_-1px_rgba(0,0,0,0.05)] border-t border-white/20 flex flex-col">
        <div data-testid="discovery-card-image" className="relative h-[62%] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getImageUrl(imageUrl)}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
          />

          {formattedTime && (
            <span
              data-testid="discovery-time-badge"
              className="pointer-events-none absolute bottom-4 left-4 z-10 inline-flex max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-full border border-white bg-terracotta-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-terracotta-700 shadow-md"
            >
              <Clock size={14} aria-hidden="true" className="shrink-0" />
              <span>
                {tWithVars('common.readyIn', 'READY IN {{time}}', { time: formattedTime })}
              </span>
            </span>
          )}

          {/* Central Ghost Indicators */}
          {isFront && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <motion.div
                style={{
                  opacity: likeOpacity,
                  scale: likeScale,
                }}
                className="flex flex-col items-center gap-2 rounded-full p-8 text-white backdrop-blur-md shadow-2xl bg-sage/30"
              >
                <Heart size={48} fill="currentColor" />
                <span className="text-xl font-black tracking-widest">
                  {t('discovery.love', 'LOVE')}
                </span>
              </motion.div>

              <motion.div
                style={{
                  opacity: passOpacity,
                  scale: passScale,
                }}
                className="flex flex-col items-center gap-2 rounded-full bg-terracotta p-8 text-white backdrop-blur-md shadow-2xl"
              >
                <X size={48} />
                <span className="text-xl font-black tracking-widest">
                  {t('discovery.pass', 'PASS')}
                </span>
              </motion.div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        <div className="flex-1 p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-heading mb-4 leading-tight">
              {name}
            </h2>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
