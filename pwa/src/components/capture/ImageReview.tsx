'use client';

import { useEffect, useRef, useState } from 'react';
import { Star, X, ZoomIn } from 'lucide-react';

interface ImageReviewProps {
  images: File[];
  onDelete: (index: number) => void;
  finishedDishIndex?: number | null;
  onSetFinishedDish?: (index: number) => void;
}

export function ImageReview({
  images,
  onDelete,
  finishedDishIndex = null,
  onSetFinishedDish,
}: ImageReviewProps) {
  const [objectUrls, setObjectUrls] = useState<string[]>([]);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Create object URLs whenever the images array changes
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setObjectUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  const count = images.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Horizontal scroll gallery */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-2 -mx-2 px-2 mask-linear-fade"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {objectUrls.map((url, index) => {
          const isHero = finishedDishIndex === index;
          return (
            <div
              key={url}
              className="group relative flex-shrink-0 animate-in fade-in zoom-in-95 duration-300"
              style={{ width: 140, height: 140 }}
            >
              {/* Thumbnail Container */}
              <div
                className={`relative h-full w-full overflow-hidden rounded-[1.5rem] border transition-all duration-300 ${
                  isHero
                    ? 'border-terracotta ring-4 ring-terracotta/10 shadow-lg shadow-terracotta/10'
                    : 'border-terracotta/10'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Overlay on hover */}
                <button
                  type="button"
                  onClick={() => setFullscreenIndex(index)}
                  className="absolute inset-0 flex items-center justify-center bg-charcoal/20 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100"
                >
                  <ZoomIn className="text-white" size={24} />
                </button>
              </div>

              {/* Star selector (Finished Dish) */}
              <button
                type="button"
                aria-label={`Mark photo ${index + 1} as finished dish`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetFinishedDish?.(index);
                }}
                className={`absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-90 shadow-md border border-white ${
                  isHero
                    ? 'bg-terracotta text-white scale-110'
                    : 'bg-white/90 text-charcoal/20 hover:bg-white hover:text-terracotta backdrop-blur-md'
                }`}
              >
                <Star
                  size={14}
                  fill={isHero ? 'currentColor' : 'none'}
                  strokeWidth={isHero ? 0 : 2}
                />
              </button>

              {/* Delete button: Only visible on hover or mobile always for accessibility */}
              <button
                type="button"
                aria-label={`Delete photo ${index + 1}`}
                onClick={() => onDelete(index)}
                className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-terracotta shadow-sm border border-terracotta/10 transition-all active:scale-90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          );
        })}

        {/* Empty state hint if needed, but here we just show the images */}
      </div>

      {/* Fullscreen lightbox */}
      {fullscreenIndex !== null && objectUrls[fullscreenIndex] && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-charcoal/95 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onClick={() => setFullscreenIndex(null)}
        >
          <div className="relative max-h-[85dvh] max-w-full group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={objectUrls[fullscreenIndex]}
              alt={`Photo ${fullscreenIndex + 1}`}
              className="max-h-[85dvh] max-w-full rounded-[2.5rem] object-contain shadow-2xl border-4 border-white/10"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Quick Actions in Lightbox */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(fullscreenIndex);
                  setFullscreenIndex(null);
                }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink/20 text-pink hover:bg-pink hover:text-white backdrop-blur-md transition-all shadow-lg border border-pink/30"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFullscreenIndex(null)}
            className="mt-8 rounded-full border border-white/20 bg-white/10 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
          >
            Close Preview
          </button>
        </div>
      )}
    </div>
  );
}
