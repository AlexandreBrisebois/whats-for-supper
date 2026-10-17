import { RetryHandlerOptions } from '@microsoft/kiota-http-fetchlibrary';
import { useUiStore } from '@/store/uiStore';
import type { MoveScheduleResultDto } from '@/lib/api/generated/models/index';
import { readCalendar, weekOffsetFor } from '@/lib/deployment-calendar';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { apiClient } from '@/lib/api/api-client';
import {
  assignRecipeToDay,
  getSchedule,
  normalizeScheduleRecipe,
  referenceRequest,
} from '@/lib/api/planner';

export type AssignmentRecipe = {
  id: string;
  name: string | null;
  image: string;
};

export type PlannerSlot = {
  referenceWeekStartDate?: string;
  weekOffset: number;
  dayIndex: number;
  date: string;
  recipe: ReturnType<typeof normalizeScheduleRecipe>;
};

export async function getPlannerSlot(
  weekOffset: number,
  dayIndex: number,
  referenceWeekStartDate?: string
): Promise<PlannerSlot | null> {
  const schedule = await getSchedule(weekOffset, referenceWeekStartDate);
  const calendar = readCalendar(schedule?.calendar);
  if (!calendar) throw new Error("Could not confirm today's date. Try again.");
  const day = schedule?.days?.[dayIndex];
  if (!day?.date) return null;

  return {
    referenceWeekStartDate: calendar.referenceWeekStartDate,
    weekOffset,
    dayIndex,
    date: day.date,
    recipe: normalizeScheduleRecipe(day.recipe),
  };
}

export async function assignRecipeToEmptySlot(
  weekOffset: number,
  dayIndex: number,
  recipe: AssignmentRecipe,
  referenceWeekStartDate?: string
) {
  if (!referenceWeekStartDate) throw new Error("Could not confirm today's date. Try again.");
  await assignRecipeToDay(weekOffset, dayIndex, recipe, referenceWeekStartDate);
}

export async function findFirstOpenPlannerSlot(
  startWeekOffset = 0,
  startDayIndex = 0,
  maxWeeksToScan = 520,
  referenceWeekStartDate?: string
) {
  for (
    let weekOffset = startWeekOffset;
    weekOffset < startWeekOffset + maxWeeksToScan;
    weekOffset++
  ) {
    const schedule = await getSchedule(weekOffset, referenceWeekStartDate);
    if (!schedule?.days) continue;
    const calendar = readCalendar(schedule.calendar);
    if (!calendar) throw new Error("Could not confirm today's date. Try again.");
    referenceWeekStartDate ??= calendar.referenceWeekStartDate;

    const startIndex = weekOffset === startWeekOffset ? startDayIndex : 0;
    const dayIndex = schedule.days.findIndex(
      (day, index) =>
        index >= startIndex && day.status !== 3 && !normalizeScheduleRecipe(day.recipe)
    );

    if (dayIndex !== undefined && dayIndex >= 0) {
      return { weekOffset, dayIndex, referenceWeekStartDate };
    }
  }

  return null;
}

export async function resolveOccupiedSlot(
  slot: Pick<PlannerSlot, 'weekOffset' | 'dayIndex' | 'date' | 'recipe' | 'referenceWeekStartDate'>,
  action: 'tomorrow' | 'next_week' | 'drop',
  useServerDefer = false
) {
  if (action === 'drop') {
    const date = DateOnly.parse(slot.date);
    if (!date) return;
    await apiClient.api.schedule.day.byDate(date).remove.delete();
    return;
  }

  const recipeId = slot.recipe?.id;
  if (!recipeId) return;

  if (action === 'tomorrow') {
    await moveTomorrow(slot);
    return;
  }

  if (useServerDefer) {
    const sourceDate = DateOnly.parse(slot.date);
    if (!sourceDate) return;
    return apiClient.api.schedule.defer.post(
      { sourceDate, recipeId },
      {
        queryParameters: {
          ...referenceRequest(slot.referenceWeekStartDate)?.queryParameters,
          targetWeekOffset: slot.weekOffset + 1,
        },
      }
    );
  }

  await apiClient.api.schedule.move.post(
    {
      weekOffset: slot.weekOffset,
      fromIndex: slot.dayIndex,
      toIndex: 0,
      targetWeekOffset: slot.weekOffset + 1,
      intent: 'push',
      recipeId,
    },
    referenceRequest(slot.referenceWeekStartDate)
  );
}

export class TomorrowMoveError extends Error {
  override name = 'TomorrowMoveError';
}

type TomorrowSource = Pick<
  PlannerSlot,
  'weekOffset' | 'dayIndex' | 'date' | 'recipe' | 'referenceWeekStartDate'
>;
type TomorrowAttempt = {
  result?: MoveScheduleResultDto;
  unknown?: boolean;
  pending?: Promise<MoveScheduleResultDto>;
};
const tomorrowAttempts = new WeakMap<TomorrowSource, TomorrowAttempt>();

async function rereadTomorrow(
  source: TomorrowSource,
  affected?: MoveScheduleResultDto['affectedWeekStartDates']
) {
  const offsets = new Set([
    source.weekOffset,
    source.dayIndex === 6 ? source.weekOffset + 1 : source.weekOffset,
  ]);
  for (const monday of affected ?? []) {
    const offset = weekOffsetFor(monday, source.referenceWeekStartDate);
    if (offset !== null) offsets.add(offset);
  }
  await Promise.allSettled(
    [...offsets].map((offset) => getSchedule(offset, source.referenceWeekStartDate))
  );
}

/** One recovery session retains its known outcome; a lost reply must never cause blind replay. */
export async function moveTomorrow(
  source: TomorrowSource,
  sourceDisposition?: 'order_in'
): Promise<MoveScheduleResultDto> {
  const previous = tomorrowAttempts.get(source);
  if (previous?.result) return previous.result;
  if (previous?.pending) return previous.pending;
  if (previous?.unknown) {
    await rereadTomorrow(source);
    throw new TomorrowMoveError(
      'The move could not be confirmed. Review the refreshed plan before choosing again.'
    );
  }
  if (!source.recipe?.id || !source.referenceWeekStartDate)
    throw new TomorrowMoveError('Refresh your plan before moving this meal.');
  const attempt: TomorrowAttempt = {};
  tomorrowAttempts.set(source, attempt);
  attempt.pending = (async () => {
    try {
      const target = source.dayIndex + 1;
      const response = await apiClient.api.schedule.move.post(
        {
          weekOffset: source.weekOffset,
          fromIndex: source.dayIndex,
          toIndex: target <= 6 ? target : 0,
          targetWeekOffset: target <= 6 ? source.weekOffset : source.weekOffset + 1,
          recipeId: source.recipe!.id!,
          intent: 'tomorrow',
          ...(sourceDisposition ? { sourceDisposition } : {}),
        },
        {
          ...referenceRequest(source.referenceWeekStartDate),
          options: [new RetryHandlerOptions({ maxRetries: 0 })],
        }
      );
      if (response?.data?.moved !== true)
        throw new TomorrowMoveError('Movement was not confirmed.');
      attempt.result = response.data;
      if (response.data.refreshComplete !== true) {
        await rereadTomorrow(source, response.data.affectedWeekStartDates);
        useUiStore.getState().addToast({
          type: 'error',
          message:
            'Your meal was moved, but some plan updates could not refresh. Please refresh your plan.',
        });
      }
      return response.data;
    } catch (error) {
      if (attempt.result) return attempt.result;
      const status = (error as { responseStatusCode?: number })?.responseStatusCode;
      if (status === 400 || status === 409 || status === 401 || status === 403) {
        tomorrowAttempts.delete(source);
        throw new TomorrowMoveError(
          status === 409
            ? 'A completed meal or changed plan blocks this move. Refresh your plan before trying again.'
            : 'This meal could not be moved. Refresh your plan before trying again.'
        );
      }
      attempt.unknown = true;
      await rereadTomorrow(source);
      throw new TomorrowMoveError(
        'The move could not be confirmed. Review the refreshed plan before choosing again.'
      );
    } finally {
      attempt.pending = undefined;
    }
  })();
  return attempt.pending;
}
