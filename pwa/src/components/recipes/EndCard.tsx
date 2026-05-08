'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Compass, Search, Plus, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';

interface EndCardProps {
  isEmpty?: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onAddRecipe?: () => void;
}

export const EndCard: React.FC<EndCardProps> = ({
  isEmpty = false,
  onSwipeRight,
  onSwipeLeft,
  onAddRecipe,
}) => {
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
    if (onAddRecipe) {
      onAddRecipe();
    } else {
      router.push(ROUTES.CAPTURE);
    }
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
      data-testid={isEmpty ? 'browse-all-empty-state' : 'browse-all-end-card'}
      whileTap={{ scale: 0.98 }}
    >
      <div className="h-full w-full overflow-hidden rounded-[2.5rem] bg-cream shadow-card border border-ochre/10 flex flex-col items-center justify-center px-8 py-12 gap-6">
        {/* Icon container */}
        <div
          className={`flex items-center justify-center w-20 h-20 rounded-full border-2 ${isEmpty ? 'bg-ochre/10 border-ochre/20' : 'bg-sage/10 border-sage/20'}`}
        >
          {isEmpty ? (
            <Search size={40} className="text-ochre" />
          ) : (
            <Compass size={40} className="text-ochre" />
          )}
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-black tracking-tighter font-heading text-center text-charcoal leading-none">
          {isEmpty ? 'Your Library is Empty' : "What's for Supper?"}
        </h2>

        {/* Supporting message */}
        <p className="text-base text-charcoal/60 text-center leading-snug max-w-xs font-medium">
          {isEmpty
            ? 'Start your collection by adding a favorite family recipe or capturing one from the web.'
            : "You've flipped through your whole library. Did you find what you were looking for tonight?"}
        </p>

        {/* CTA button */}
        <button
          data-testid={isEmpty ? 'browse-all-empty-capture-cta' : 'end-card-capture-cta'}
          onClick={handleCaptureCta}
          className="group mt-2 flex items-center gap-3 rounded-full bg-charcoal px-8 py-4 text-white shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span className="font-black text-sm uppercase tracking-widest">
            {isEmpty ? 'Add New Recipe' : 'Capture a Recipe'}
          </span>
        </button>

        {!isEmpty && (
          <Link
            href={ROUTES.HOME}
            className="text-xs font-black uppercase tracking-widest text-ochre hover:text-ochre/80 transition-colors"
          >
            Back to Planner
          </Link>
        )}
      </div>
    </motion.div>
  );
};
