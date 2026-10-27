'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWeekStore, type UILocalScheduleDay } from '@/store/weekStore';
import { usePlannerStore } from '@/store/plannerStore';

type DragPreview = {
  from: number;
  target: number | null;
  snapshot: UILocalScheduleDay[];
  x: number;
  y: number;
  width: number;
};

// The pointer session outlives content swaps; no reordered row or recipe id owns it.
export function usePlannerDrag(weekOffset: number, activeTab: string) {
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const retire = useRef<(() => void) | null>(null);

  useEffect(() => () => retire.current?.(), [weekOffset, activeTab]);

  const start = useCallback((from: number, event: PointerEvent) => {
    retire.current?.();
    const week = useWeekStore.getState();
    const snapshot = week.schedule;
    if (!snapshot[from]?.recipe?.id) return;
    const offset = week.weekOffset;
    const weekStart = week.weekStartDate;
    const sameWeek = () =>
      usePlannerStore.getState().currentWeekOffset === offset &&
      useWeekStore.getState().weekOffset === offset &&
      useWeekStore.getState().weekStartDate === weekStart;
    const meal = document.querySelector(
      `[data-testid="day-card-${from}"] [data-testid="planner-meal"]`
    );
    const rect = meal?.getBoundingClientRect();
    if (!rect) return;
    let point = { x: event.clientX, y: event.clientY };
    const origin = { ...point };
    let target: number | null = from;
    let ended = false;
    const planner = usePlannerStore.getState();
    planner.setDeferredWeekSnapshot(null);
    planner.setIsDragActive(true);
    const paint = () =>
      setPreview({
        from,
        target,
        snapshot,
        x: rect.left,
        y: rect.top + point.y - origin.y,
        width: rect.width,
      });
    const locate = () => {
      if (!sameWeek()) {
        finish(false);
        return;
      }
      const next = snapshot.findIndex((_, index) => {
        const box = document
          .querySelector(`[data-testid="day-card-${index}"]`)
          ?.getBoundingClientRect();
        return (
          box &&
          point.x >= box.left &&
          point.x <= box.right &&
          point.y >= box.top &&
          point.y <= box.bottom
        );
      });
      const candidate = next < 0 ? null : next;
      if (candidate !== target) {
        target = candidate;
        useWeekStore.getState().reorderLocally(from, target ?? from, snapshot);
      }
      paint();
    };
    const move = (next: PointerEvent) => {
      if (next.pointerId !== event.pointerId) return;
      point = { x: next.clientX, y: next.clientY };
      locate();
    };
    const preventScroll = (touch: TouchEvent) => {
      if (touch.cancelable) touch.preventDefault();
    };
    const up = (next: PointerEvent) => {
      if (next.pointerId !== event.pointerId) return;
      point = { x: next.clientX, y: next.clientY };
      locate();
      finish(true);
    };
    const cancel = () => finish(false);
    const pointerCancel = (next: PointerEvent) => {
      if (next.pointerId === event.pointerId) cancel();
    };
    const key = (next: KeyboardEvent) => {
      if (next.key === 'Escape') {
        next.preventDefault();
        cancel();
      }
    };
    const finish = (commit: boolean) => {
      if (ended) return;
      ended = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', pointerCancel);
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('scroll', locate, true);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', cancel);
      retire.current = null;
      setPreview(null);
      const validWeek = sameWeek();
      if (validWeek) {
        if (commit && target !== null && target !== from) {
          useWeekStore.getState().commitMove(from, target, snapshot);
        } else {
          useWeekStore.getState().reorderLocally(from, from, snapshot);
        }
      }
      usePlannerStore.getState().setIsDragActive(false);
      const current = usePlannerStore.getState();
      if (!validWeek) current.setDeferredWeekSnapshot(null);
      else if (current.deferredWeekSnapshot && current.localMoveSeq === current.confirmedMoveSeq) {
        const deferred = current.deferredWeekSnapshot;
        current.setDeferredWeekSnapshot(null);
        useWeekStore.getState().applySnapshot(deferred);
      }
    };
    retire.current = cancel;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', pointerCancel);
    window.addEventListener('touchmove', preventScroll, { passive: false });
    window.addEventListener('scroll', locate, true);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', cancel);
    paint();
  }, []);

  return { preview, start };
}
