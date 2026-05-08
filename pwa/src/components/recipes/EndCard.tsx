'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Compass } from 'lucide-react';

interface EndCardProps {
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}

export const EndCard: React.FC<EndCardProps> = ({ onSwipeRight, onSwipeLeft }) => {
  const router = useRouter();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const controls = useAnimation();

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 80;
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

  const handleCaptureCta = () => {
    router.push('/capture');
  };

  return (
    <motion.div
      style={{
        x,
        rotate,
        transformOrigin: 'bottom center',
        touchAction: 'none',
        zIndex: 10,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      dragMomentum={false}
      animate={controls}
      onDragEnd={handleDragEnd}
      className="absolute inset-x-0 top-0 bottom-12 cursor-grab active:cursor-grabbing"
      data-testid="browse-all-end-card"
      whileTap={{ scale: 0.98 }}
    >
      <div className="h-full w-full overflow-hidden rounded-[2.5rem] bg-cream shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_20px_40px_-1px_rgba(0,0,0,0.05)] border border-ochre-100 flex flex-col items-center justify-center px-8 py-12 gap-6">
        {/* Compass / supper icon */}
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-ochre-50 border-2 border-ochre-200">
          <Compass size={40} className="text-ochre-500" />
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold tracking-tight font-heading text-center text-charcoal">
          What&apos;s for Supper?
        </h2>

        {/* Supporting message */}
        <p className="text-base text-charcoal/70 text-center leading-relaxed max-w-xs">
          You&apos;ve browsed your whole library. Did you find what you were looking for?
        </p>

        {/* Secondary message */}
        <p className="text-sm text-ochre-700 text-center leading-relaxed max-w-xs font-medium">
          Have a recipe nearby you&apos;d like to add?
        </p>

        {/* CTA button */}
        <button
          data-testid="end-card-capture-cta"
          onClick={handleCaptureCta}
          className="mt-2 px-8 py-3 rounded-full bg-ochre text-white font-bold text-sm tracking-wide shadow-md hover:bg-ochre-600 active:bg-ochre-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2"
        >
          Capture a Recipe
        </button>
      </div>
    </motion.div>
  );
};
