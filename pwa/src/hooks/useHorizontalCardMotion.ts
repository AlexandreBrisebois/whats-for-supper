'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  useAnimation,
  useDragControls,
  useMotionValue,
  useTransform,
  type MotionStyle,
} from 'framer-motion';

// The card surface is draggable; nested controls keep their own pointer behavior.
export function isCardSurface(target: EventTarget | null, card: HTMLElement | null) {
  if (!(target instanceof Element) || !card) return false;
  const control = target.closest(
    'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [contenteditable]:not([contenteditable="false"])'
  );
  return !control || control === card;
}

/** Shared physical movement only. Consumers own release intent and side effects. */
export function useHorizontalCardMotion(isFront: boolean) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const controls = useAnimation();
  const dragControls = useDragControls();

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !isFront ||
      event.isPrimary === false ||
      event.button > 0 ||
      !isCardSurface(event.target, event.currentTarget)
    )
      return false;
    dragControls.start(event);
    return true;
  };

  return {
    x,
    controls,
    // Preserve the policies automatic x dragging applied before manual activation.
    motionStyle: {
      x,
      rotate,
      transformOrigin: 'bottom center',
      touchAction: 'pan-y',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      willChange: 'transform',
    } satisfies MotionStyle,
    startDrag,
    dragProps: {
      drag: isFront ? ('x' as const) : (false as const),
      dragControls,
      // Start from the surface, rather than letting a nested control start a drag.
      dragListener: false,
      dragConstraints: { left: 0, right: 0 },
      dragElastic: 1,
      dragMomentum: false,
    },
  };
}
