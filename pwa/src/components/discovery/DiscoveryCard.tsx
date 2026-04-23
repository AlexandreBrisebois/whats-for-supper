'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  PanInfo,
  useMotionValueEvent,
} from 'framer-motion';
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
  hasFamilyInterest?: boolean;
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
  hasFamilyInterest,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Haptics
  const [hasVibrated, setHasVibrated] = React.useState(false);
  useMotionValueEvent(x, 'change', (latest) => {
    if (Math.abs(latest) > 100 && !hasVibrated) {
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      setHasVibrated(true);
    } else if (Math.abs(latest) < 80 && hasVibrated) {
      setHasVibrated(false);
    }
  });

  // Indicators opacity
  const likeOpacity = useTransform(x, [40, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -40], [1, 0]);

  const likeScale = useTransform(x, [0, 150], [0.5, 1.5]);
  const passScale = useTransform(x, [0, -150], [0.5, 1.5]);

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
        transition: { type: 'spring', stiffness: 100, damping: 15 },
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
        transition: { type: 'spring', stiffness: 100, damping: 15 },
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
      dragElastic={0.2}
      dragMomentum={false}
      animate={controls}
      onDragEnd={handleDragEnd}
      className="absolute inset-x-0 top-0 bottom-12 cursor-grab active:cursor-grabbing"
      whileTap={isFront ? { scale: 0.98 } : {}}
    >
      <div className="h-full w-full overflow-hidden rounded-[2.5rem] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_20px_40px_-1px_rgba(0,0,0,0.05)] border-t border-white/20 flex flex-col">
        <div className="relative h-[62%] w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={name}
            fill
            priority={isFront}
            className="object-cover select-none pointer-events-none"
          />

          {/* Central Ghost Indicators */}
          {isFront && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <motion.div
                style={{
                  opacity: likeOpacity,
                  scale: likeScale,
                }}
                className={`flex flex-col items-center gap-2 rounded-full p-8 text-white backdrop-blur-md shadow-2xl ${
                  hasFamilyInterest ? 'bg-sage/40 ring-4 ring-sage glow-sage' : 'bg-sage/30'
                }`}
              >
                <Heart size={48} fill="currentColor" />
                <span className="text-xl font-black tracking-widest">
                  {hasFamilyInterest ? 'MATCH!' : 'LOVE'}
                </span>
              </motion.div>

              <motion.div
                style={{
                  opacity: passOpacity,
                  scale: passScale,
                }}
                className="flex flex-col items-center gap-2 rounded-full bg-terracotta/30 p-8 text-white backdrop-blur-md shadow-2xl"
              >
                <X size={48} />
                <span className="text-xl font-black tracking-widest">PASS</span>
              </motion.div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        <div className="flex-1 p-8 flex flex-col justify-between">
          <h2 className="text-2xl font-bold tracking-tight font-heading mb-4 leading-tight">
            {name}
          </h2>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.15em] border-t border-charcoal/5 pt-6">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ochre-50/80 text-ochre-700">
              Prep: {formatDuration(totalTime)}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage-50/80 text-sage-700">
              Diff: {difficulty || 'Medium'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
