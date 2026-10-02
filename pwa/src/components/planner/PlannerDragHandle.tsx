'use client';

import { useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { useFeatureFlag } from '@/store/featureFlagStore';
import { t } from '@/locales';
import { cn } from '@/lib/utils';

// A deliberate hold with a small allowance for finger jitter.
const HOLD_MS = 400;
const SLOP_PX = 8;

export function PlannerDragHandle({ start }: { start: (event: PointerEvent) => void }) {
  const enabled = useFeatureFlag('planner-hold-to-move');
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
      if (!enabled) {
        start(event);
        return;
      }
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
    const contextMenu = (event: Event) => {
      if (enabled) event.preventDefault();
    };
    handle.addEventListener('pointerdown', down);
    handle.addEventListener('touchmove', touchMove, { passive: false });
    handle.addEventListener('contextmenu', contextMenu);
    window.addEventListener('pointerdown', additionalPointer);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', reset);
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
    };
  }, [enabled, start]);

  const label = enabled ? t('planner.holdToMove', 'Hold to move') : 'Drag to reorder';
  return (
    <div
      ref={ref}
      data-testid="planner-drag-handle"
      data-grabbed={grabbed}
      className={cn(
        'h-full min-h-[44px] flex items-center px-2.5 cursor-grab active:cursor-grabbing select-none group/handle rounded-r-2xl',
        enabled ? 'touch-auto' : 'touch-none',
        grabbed && 'bg-sage/20 ring-2 ring-sage'
      )}
      style={{ WebkitTouchCallout: 'none' }}
      aria-label={label}
      title={label}
    >
      <GripVertical
        className="text-charcoal/20 group-hover/handle:text-sage transition-colors"
        size={20}
      />
    </div>
  );
}
