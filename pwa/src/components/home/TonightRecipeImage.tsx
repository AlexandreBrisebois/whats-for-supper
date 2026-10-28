'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';

/** Key by recipe and source at the call site so a fresh image can load after failure. */
export function TonightRecipeImage({
  imageUrl,
  alt,
  className,
  fallback,
}: {
  imageUrl?: string | null;
  alt: string;
  className: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const imageRef = useCallback((image: HTMLImageElement | null) => {
    // A cached/early error can precede hydration and its React error handler.
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, []);
  if (!imageUrl || failed) {
    return (
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-terracotta-50 text-terracotta-700"
        aria-hidden="true"
      >
        {fallback}
      </div>
    );
  }
  return (
    <div
      className={cn(
        'relative mb-7 w-full shrink-0 overflow-hidden rounded-[2rem] shadow-xl shadow-charcoal/15',
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={getImageUrl(imageUrl)}
        alt={alt}
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
