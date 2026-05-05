'use client';

import { useEffect } from 'react';
import { useWeekStore } from '@/store/weekStore';

/**
 * Pre-seeds weekStore with weekOffset=0 on app load (BS-2 fix).
 *
 * Without this, `schedule` starts as `[]` and any SSE `slot_updated` event
 * that arrives before the planner page calls `init()` is silently dropped
 * because `applySlotUpdate`'s `inCurrentWeek` check always returns false
 * against an empty array.
 *
 * Guard: only calls `init(0)` if `weekStore.weekOffset === 0` (the initial
 * value). If the planner page has already called `init(1)` for next week,
 * `weekOffset` will be 1 and we do NOT re-init — the planner page owns
 * non-zero week initialisation.
 *
 * The `connected` SSE event will also seed the store immediately after
 * connection via `applySnapshot`, so this is a belt-and-suspenders guard
 * for the narrow window between app mount and SSE connection.
 */
export function WeekStoreInitializer() {
  useEffect(() => {
    // Only pre-seed for the current week (weekOffset=0).
    // If the user has already navigated to a different week, the planner page
    // owns that init — do not override it.
    if (useWeekStore.getState().weekOffset === 0) {
      useWeekStore.getState().init(0);
    }
  }, []); // run once on mount

  return null;
}
