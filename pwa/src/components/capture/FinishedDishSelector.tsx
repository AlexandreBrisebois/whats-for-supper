'use client';

import { useEffect, useRef, useState } from 'react';

interface FinishedDishSelectorProps {
  images: File[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function FinishedDishSelector({ images, selectedIndex, onSelect }: FinishedDishSelectorProps) {
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setObjectUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  return (
    <div data-hint="dish-photo-select" className="flex flex-col gap-4">
      <div className="flex items-start gap-2">
        <span className="text-2xl" aria-hidden>🍽️</span>
        <p className="text-sm font-medium text-charcoal leading-snug">
          Which photo shows your finished dish?
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {objectUrls.map((url, index) => {
          const isSelected = selectedIndex === index;
          return (
            <button
              key={url}
              type="button"
              aria-label={`Select photo ${index + 1} as dish photo${isSelected ? ' (selected)' : ''}`}
              onClick={() => onSelect(index)}
              className={[
                'relative aspect-square overflow-hidden rounded-2xl border-4 transition-all active:scale-95',
                isSelected
                  ? 'border-sage-green shadow-card'
                  : 'border-transparent opacity-70 hover:opacity-100',
              ].join(' ')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-sage-green/20">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-green text-cream text-lg shadow"
                    aria-hidden
                  >
                    ✓
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedIndex === null && (
        <p className="text-xs text-terracotta">Tap a photo to mark it as the dish photo.</p>
      )}
    </div>
  );
}
