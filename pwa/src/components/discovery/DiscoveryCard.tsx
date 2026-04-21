'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Heart, X } from 'lucide-react';

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
  difficulty: string;
  category: string;
}

const formatDuration = (duration: string) => {
  if (!duration) return 'N/A';
  if (!duration.startsWith('PT')) return duration;

  try {
    const hoursMatch = duration.match(/(\d+)H/);
    const minutesMatch = duration.match(/(\d+)M/);

    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return '0m';
  } catch {
    return duration;
  }
};

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  name,
  description,
  imageUrl,
  onSwipeRight,
  onSwipeLeft,
  isFront,
  stackIndex,
  totalTime,
  difficulty,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Indicators opacity
  const likeOpacity = useTransform(x, [40, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -40], [1, 0]);

  const controls = useAnimation();

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
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      });
    } else {
      controls.start({
        x: 0,
        rotate: 0,
        scale: Math.max(0.8, scale),
        y: yOffset,
        opacity: Math.max(0, opacity),
        transition: { duration: 0.3 },
      });
    }
  }, [isFront, stackIndex, controls, scale, yOffset, opacity]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (!isFront) return;

    const threshold = 100;
    const velocityThreshold = 500;

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      controls
        .start({
          x: 500,
          rotate: 20,
          opacity: 0,
          transition: { duration: 0.3, ease: 'easeOut' },
        })
        .then(onSwipeRight);
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
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
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      });
    }
  };

  return (
    <motion.div
      style={{
        x,
        rotate,
        transformOrigin: 'bottom center',
        touchAction: 'none',
        zIndex: 10 - stackIndex,
      }}
      drag={isFront ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      dragMomentum={false}
      animate={controls}
      onDragEnd={handleDragEnd}
      className="absolute inset-x-0 top-0 bottom-12 cursor-grab active:cursor-grabbing"
      whileTap={isFront ? { scale: 0.98 } : {}}
    >
      <div className="h-full w-full overflow-hidden rounded-[2.5rem] bg-white shadow-[0_20px_50px_rgba(31,41,55,0.1)] border border-terracotta/5 flex flex-col">
        <div className="relative h-[70%] w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={name}
            fill
            priority={isFront}
            className="object-cover select-none pointer-events-none"
          />

          {/* Indicators */}
          {isFront && (
            <>
              <motion.div
                style={{ opacity: likeOpacity }}
                className="absolute top-8 left-8 z-20 flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md"
              >
                <Heart size={16} fill="currentColor" />
                LOVE
              </motion.div>

              <motion.div
                style={{ opacity: passOpacity }}
                className="absolute top-8 right-8 z-20 flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md"
              >
                <X size={16} />
                PASS
              </motion.div>
            </>
          )}

          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        <div className="flex-1 p-8 flex flex-col justify-between">
          <h2 className="text-2xl font-bold tracking-tight font-heading mb-4">{name}</h2>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.15em] text-charcoal/40 border-t border-charcoal/5 pt-6">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-charcoal/5">
              Prep: {formatDuration(totalTime)}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-charcoal/5">
              Diff: {difficulty || 'Medium'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
