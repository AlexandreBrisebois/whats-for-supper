'use client';

import { useEffect } from 'react';
import { getTodayString } from '@/lib/imageUtils';
import { useTodayStore } from '@/store/todayStore';
import { normalizeScheduleRecipe } from '@/lib/api/planner';
import type { NonCookingPlanDto, ScheduleRecipeDto } from '@/lib/api/generated/models';

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
  todayDate,
  nonCooking,
}: {
  todaysRecipe: any;
  todayStatus: 0 | 2 | 3;
  todayDate?: string;
  nonCooking?: NonCookingPlanDto | null;
}) {
  useEffect(() => {
    // SSR uses the server's calendar date, which can differ from the browser's.
    // Client sync resolves the actual local day; never seed a different day's plan.
    if (todayDate && todayDate !== getTodayString()) return;

    // Resolve the SSR recipe to a plain ScheduleRecipeDto (or null)
    const ssrRecipe: ScheduleRecipeDto | null = normalizeScheduleRecipe(todaysRecipe);

    useTodayStore.getState().init(ssrRecipe, todayStatus, nonCooking);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only init; SSE keeps the store current after that
  }, []);

  return null;
}
