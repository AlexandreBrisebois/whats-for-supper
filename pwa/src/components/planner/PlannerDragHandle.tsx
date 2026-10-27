'use client';

import { useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { t } from '@/locales';
import { cn } from '@/lib/utils';

// A deliberate hold with a small allowance for finger jitter.
const HOLD_MS = 250;
const SLOP_PX = 8;

export function PlannerDragHandle({
  start,
  moveBySlot,
}: {
  start: (event: PointerEvent) => void;
  moveBySlot?: (direction: -1 | 1) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [grabbed, setGrabbed] = useState(false);

  useEffect(() => {
    const handle = ref.current;
    if (!handle) return;
    let pending: PointerEvent | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = false;
    const reset = () => {
      clearTimeout(timer);
      pending = null;
      active = false;
      setGrabbed(false);
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || event.isPrimary === false) return;
      reset();
      pending = event;
      timer = setTimeout(() => {
        if (!pending) return;
        active = true;
        setGrabbed(true);
        start(pending);
        navigator.vibrate?.(15);
      }, HOLD_MS);
    };
    const move = (event: PointerEvent) => {
      if (!pending || active || event.pointerId !== pending.pointerId) return;
      if (Math.hypot(event.clientX - pending.clientX, event.clientY - pending.clientY) > SLOP_PX)
        reset();
    };
    const touchMove = (event: TouchEvent) => {
      // Keep native scrolling until activation. Once the browser starts scrolling,
      // pointercancel retires the hold; never change touch-action mid-gesture.
      if (active && event.cancelable) event.preventDefault();
      else if (!active) reset();
    };
    const additionalPointer = (event: PointerEvent) => {
      if (pending && event.pointerId !== pending.pointerId) reset();
    };
    const end = (event: PointerEvent) => {
      if (pending && event.pointerId === pending.pointerId) reset();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') reset();
    };
    const contextMenu = (event: Event) => event.preventDefault();
    handle.addEventListener('pointerdown', down);
    handle.addEventListener('touchmove', touchMove, { passive: false });
    handle.addEventListener('contextmenu', contextMenu);
    window.addEventListener('pointerdown', additionalPointer);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', reset);
    window.addEventListener('keydown', key);
    return () => {
      reset();
      handle.removeEventListener('pointerdown', down);
      handle.removeEventListener('touchmove', touchMove);
      handle.removeEventListener('contextmenu', contextMenu);
      window.removeEventListener('pointerdown', additionalPointer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', reset);
      window.removeEventListener('keydown', key);
    };
  }, [start]);

  const label = t('planner.holdToMove', 'Hold to move');
  const instructions = t(
    'planner.moveInstructions',
    'Hold to move. Use the Up and Down arrow keys to move one day.'
  );
  return (
    <div
      ref={ref}
      data-testid="planner-drag-handle"
      data-grabbed={grabbed}
      className={cn(
        'h-full min-h-[44px] min-w-[44px] justify-center flex items-center px-2.5 cursor-grab active:cursor-grabbing select-none group/handle rounded-r-2xl',
        'touch-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal-600',
        grabbed && 'bg-sage/20 ring-2 ring-sage-700'
      )}
      style={{ WebkitTouchCallout: 'none' }}
      role="button"
      tabIndex={0}
      aria-label={instructions}
      aria-keyshortcuts="ArrowUp ArrowDown"
      title={label}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        moveBySlot?.(event.key === 'ArrowUp' ? -1 : 1);
      }}
    >
      <GripVertical
        className={cn(
          'text-charcoal-600 group-hover/handle:text-sage-700 transition-colors',
          grabbed && 'text-sage-700'
        )}
        size={20}
      />
    </div>
  );
}
