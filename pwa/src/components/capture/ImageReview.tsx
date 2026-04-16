'use client';

import { useEffect, useRef, useState } from 'react';

interface ImageReviewProps {
  images: File[];
  onDelete: (index: number) => void;
  finishedDishIndex?: number | null;
}

export function ImageReview({ images, onDelete, finishedDishIndex = null }: ImageReviewProps) {
  const [objectUrls, setObjectUrls] = useState<string[]>([]);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Create object URLs whenever the images array changes
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setObjectUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  const count = images.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Count badge */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-medium text-charcoal">
          {count === 1 ? '1 photo' : `${count} photos`}
        </p>
        {count > 2 && (
          <p className="text-xs text-charcoal-400">Swipe to see more →</p>
        )}
      </div>

      {/* Horizontal scroll gallery */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {objectUrls.map((url, index) => {
          const isHero = finishedDishIndex === index;
          return (
            <div
              key={url}
              className="relative flex-shrink-0"
              style={{ width: 120, height: 120 }}
            >
              {/* Thumbnail */}
              <button
                type="button"
                aria-label={`View photo ${index + 1}${isHero ? ' (finished dish)' : ''}`}
                onClick={() => setFullscreenIndex(index)}
                className={['h-full w-full overflow-hidden rounded-2xl border-2 transition-transform active:scale-95', isHero ? 'border-indigo' : 'border-transparent'].join(' ')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>

              {/* Hero indicator star */}
              {isHero && (
                <div className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo text-lavender shadow text-sm">
                  ★
                </div>
              )}

              {/* Delete button */}
              <button
                type="button"
                aria-label={`Delete photo ${index + 1}`}
                onClick={() => onDelete(index)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-pink text-lavender shadow transition-transform active:scale-90"
                style={{ fontSize: 12 }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Fullscreen lightbox */}
      {fullscreenIndex !== null && objectUrls[fullscreenIndex] && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-charcoal/90 p-4"
          onClick={() => setFullscreenIndex(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={objectUrls[fullscreenIndex]}
            alt={`Photo ${fullscreenIndex + 1}`}
            className="max-h-[80dvh] max-w-full rounded-2xl object-contain shadow-card"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(fullscreenIndex); setFullscreenIndex(null); }}
              className="rounded-2xl bg-pink px-5 py-2.5 text-sm font-semibold text-lavender"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setFullscreenIndex(null)}
              className="rounded-2xl border border-lavender/30 px-5 py-2.5 text-sm font-medium text-lavender"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
