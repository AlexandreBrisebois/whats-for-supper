'use client';

import { useEffect } from 'react';
import { useTodayStore } from '@/store/todayStore';
import { normalizeScheduleRecipe } from '@/lib/api/planner';
import type { ScheduleRecipeDto } from '@/lib/api/generated/models';

/**
 * Initialises todayStore once at the layout/page level from SSR props (BS-1 fix).
 *
 * Previously, `HomeCommandCenter` called `init()` on its own mount. This caused
 * a dual-init problem: if `TodayStoreInitializer` is also mounted at layout level,
 * both would fire. This component is the sole initialiser — `HomeCommandCenter`
 * must NOT call `init()`.
 *
 * After the initial `init()`, the SSE stream (`useScheduleStream`) keeps the store
 * current via `applyServerUpdate` and `applySnapshot`. No further `init()` calls
 * are needed during the session.
 */
export function TodayStoreInitializer({
  todaysRecipe,
  todayStatus,
}: {
  todaysRecipe: any;
  todayStatus: 0 | 2 | 3;
}) {
  useEffect(() => {
    // Resolve the SSR recipe to a plain ScheduleRecipeDto (or null)
    const ssrRecipe: ScheduleRecipeDto | null = normalizeScheduleRecipe(todaysRecipe);

    useTodayStore.getState().init(ssrRecipe, todayStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only init; SSE keeps the store current after that
  }, []);

  return null;
}
