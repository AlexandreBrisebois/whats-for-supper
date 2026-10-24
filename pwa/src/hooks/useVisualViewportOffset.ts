'use client';

import { useEffect, useState } from 'react';

// Fixed overlays use layout-viewport coordinates. A mobile keyboard can pan the
// visible viewport without scrolling that layout; keep notifications in sight.
export function useVisualViewportOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setOffset(viewport.offsetTop);
    update();
    viewport.addEventListener('scroll', update);
    viewport.addEventListener('resize', update);
    return () => {
      viewport.removeEventListener('scroll', update);
      viewport.removeEventListener('resize', update);
    };
  }, []);
  return offset;
}
