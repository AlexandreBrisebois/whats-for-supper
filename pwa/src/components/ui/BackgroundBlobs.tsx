'use client';

import React from 'react';

/**
 * BackgroundBlobs renders the animated organic shapes used in premium pages.
 * These are fixed to the viewport and sit behind all content.
 */
export function BackgroundBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      <div className="blob blob-terracotta !absolute !z-0 -top-20 -left-20 animate-[drift_20s_infinite]" />
      <div className="blob blob-ochre !absolute !z-0 top-1/4 -right-10 animate-[drift_25s_infinite]" />
      <div className="blob blob-sage !absolute !z-0 -bottom-20 left-1/4 animate-[drift_30s_infinite]" />
    </div>
  );
}
