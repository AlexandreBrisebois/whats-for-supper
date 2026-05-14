'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';
import { t } from '@/locales';

interface OriginalPhotosViewerProps {
  recipeId: string;
  imageCount: number;
  finishedDishIndex: number;
  onClose: () => void;
}

export function OriginalPhotosViewer({
  recipeId,
  imageCount,
  finishedDishIndex,
  onClose,
}: OriginalPhotosViewerProps) {
  // Logic to order images: finishedDishIndex first, then others.
  const imageIndices = useMemo(() => {
    const indices = Array.from({ length: imageCount }, (_, i) => i);
    // User requested "cooked image" (finished dish) first
    const heroIndex =
      finishedDishIndex >= 0 && finishedDishIndex < imageCount ? finishedDishIndex : -1;

    if (heroIndex === -1) return indices;
    return [heroIndex, ...indices.filter((i) => i !== heroIndex)];
  }, [imageCount, finishedDishIndex]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [direction, setDirection] = useState(0);

  const handleNext = useCallback(() => {
    if (scale > 1) setScale(1);
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % imageIndices.length);
  }, [scale, imageIndices.length]);

  const handlePrev = useCallback(() => {
    if (scale > 1) setScale(1);
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + imageIndices.length) % imageIndices.length);
  }, [scale, imageIndices.length]);

  const toggleZoom = useCallback(() => {
    setScale((prev) => (prev === 1 ? 2.5 : 1));
  }, []);

  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const distance = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );

        if (lastPinchDistance !== null) {
          const delta = distance / lastPinchDistance;
          setScale((prev) => Math.min(Math.max(1, prev * delta), 5));
        }
        setLastPinchDistance(distance);
      }
    },
    [lastPinchDistance]
  );

  const handleTouchEnd = useCallback(() => {
    setLastPinchDistance(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  const currentPhotoIndex = imageIndices[currentIndex];
  // The API endpoint is /api/recipes/{recipeId}/original/{photoIndex}
  const imageUrl = `/api/recipes/${recipeId}/original/${currentPhotoIndex}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-charcoal/95 backdrop-blur-xl">
      {/* Header */}
      <div className="flex h-20 items-center justify-between px-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            {t('recipes.viewOriginal', 'Original Photo')}
          </span>
          <span className="text-sm font-bold text-white/90">
            {currentIndex + 1} / {imageCount}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-testid="action-close-viewer"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Viewer Area */}
      <div
        className="relative flex-1 overflow-hidden touch-none"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                x: dir > 0 ? '100%' : '-100%',
                opacity: 0,
              }),
              center: {
                x: 0,
                opacity: 1,
              },
              exit: (dir: number) => ({
                x: dir > 0 ? '-100%' : '100%',
                opacity: 0,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute inset-0 flex items-center justify-center p-4"
          >
            <motion.div
              drag={scale > 1}
              dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
              dragElastic={0.1}
              dragMomentum={false}
              animate={{ scale }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="relative h-full w-full max-w-4xl flex items-center justify-center"
              style={{ cursor: scale > 1 ? 'move' : 'zoom-in' }}
              onClick={() => {
                if (scale === 1) {
                  toggleZoom();
                } else {
                  setScale(1);
                }
              }}
            >
              {/* Using native img here because we want raw original aspect ratio and easy zoom control */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`Recipe photo ${currentIndex + 1}`}
                className="max-h-full max-w-full object-contain select-none pointer-events-none"
                draggable={false}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Zoom Controls Overlay */}
        <button
          type="button"
          onClick={toggleZoom}
          className="absolute bottom-10 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-white shadow-2xl transition hover:scale-105 active:scale-95"
        >
          {scale > 1 ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
        </button>

        {/* Navigation Arrows (Hidden on mobile touch) */}
        <div className="hidden sm:contents">
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <ChevronRight size={32} />
          </button>
        </div>
      </div>

      {/* Thumb-friendly bottom pager */}
      <div className="flex h-24 items-center justify-center gap-4 px-6 pb-6">
        <button
          type="button"
          onClick={handlePrev}
          className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-white/5 text-white/60 active:bg-white/10 sm:hidden"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-2">
          {imageIndices.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-8 bg-terracotta' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleNext}
          className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-white/5 text-white/60 active:bg-white/10 sm:hidden"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
