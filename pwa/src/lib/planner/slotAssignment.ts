import { RetryHandlerOptions } from '@microsoft/kiota-http-fetchlibrary';
import type { OriginalDisposition, ReplacementAction } from './replacementSession';
import { t } from '@/locales';
import { nonCookingLabel } from './nonCooking';
import { useUiStore } from '@/store/uiStore';
import type {
  NonCookingPlanDto,
  DeferScheduleResultDto,
  MoveScheduleResultDto,
} from '@/lib/api/generated/models/index';
import { civilDate, readCalendar, weekOffsetFor } from '@/lib/deployment-calendar';
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
  status?: number;
  nonCooking?: NonCookingPlanDto | null;
  removalToken?: string | null;
};

export async function getPlannerSlot(
  weekOffset: number,
  dayIndex: number,
  referenceWeekStartDate?: string
): Promise<PlannerSlot | null> {
  const schedule = await getSchedule(weekOffset, referenceWeekStartDate);
  const calendar = readCalendar(schedule?.calendar);
  if (!calendar) throw new Error("Could not confirm today's date. Try again.");
  if (referenceWeekStartDate && referenceWeekStartDate !== calendar.referenceWeekStartDate)
    throw new Error(
      t('recipes.selectedWeekInvalid', 'Could not confirm the selected week. Refresh your plan.')
    );
  const day = schedule?.days?.[dayIndex];
  if (!day?.date) return null;
  if (
    Date.parse(`${day.date}T00:00:00Z`) !==
    Date.parse(`${calendar.referenceWeekStartDate}T00:00:00Z`) +
      (weekOffset * 7 + dayIndex) * 86400000
  )
    throw new Error(
      t('recipes.selectedDateInvalid', 'Could not confirm the selected date. Refresh your plan.')
    );

  return {
    referenceWeekStartDate: calendar.referenceWeekStartDate,
    weekOffset,
    dayIndex,
    date: day.date,
    recipe: normalizeScheduleRecipe(day.recipe),
    status: day.status ?? undefined,
    removalToken: day.removalToken,
    nonCooking: day.nonCooking?.kind ? day.nonCooking : null,
  };
}

export async function assignRecipeToEmptySlot(
  weekOffset: number,
  dayIndex: number,
  recipe: AssignmentRecipe,
  referenceWeekStartDate?: string
) {
  if (!referenceWeekStartDate) throw new Error("Could not confirm today's date. Try again.");
  await assignRecipeToDay(weekOffset, dayIndex, recipe, referenceWeekStartDate, true);
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
    if (!schedule?.days?.length)
      throw new Error(
        t('recipes.weekReadFailed', 'Could not read this week. Retry before choosing a day.')
      );
    const calendar = readCalendar(schedule.calendar);
    if (!calendar) throw new Error("Could not confirm today's date. Try again.");
    if (referenceWeekStartDate && referenceWeekStartDate !== calendar.referenceWeekStartDate)
      throw new Error(
        t('recipes.selectedWeekInvalid', 'Could not confirm the selected week. Refresh your plan.')
      );
    referenceWeekStartDate ??= calendar.referenceWeekStartDate;

    if (
      schedule.days.length !== 7 ||
      schedule.days.some(
        (day, index) =>
          day.date !==
          new Date(
            Date.parse(`${referenceWeekStartDate}T00:00:00Z`) + (weekOffset * 7 + index) * 86400000
          )
            .toISOString()
            .slice(0, 10)
      )
    )
      throw new Error(
        t('recipes.weekReadFailed', 'Could not read this week. Retry before choosing a day.')
      );

    const startIndex = weekOffset === startWeekOffset ? startDayIndex : 0;
    const dayIndex = schedule.days.findIndex(
      (day, index) =>
        index >= startIndex &&
        day.status === 0 &&
        !day.removalToken &&
        !day.nonCooking?.kind &&
        !normalizeScheduleRecipe(day.recipe)
    );

    if (dayIndex !== undefined && dayIndex >= 0) {
      const expected = new Date(
        Date.parse(`${referenceWeekStartDate}T00:00:00Z`) + (weekOffset * 7 + dayIndex) * 86400000
      )
        .toISOString()
        .slice(0, 10);
      if (schedule.days[dayIndex].date !== expected)
        throw new Error(
          t(
            'recipes.selectedDateInvalid',
            'Could not confirm the selected date. Refresh your plan.'
          )
        );
      return { weekOffset, dayIndex, referenceWeekStartDate };
    }
  }

  return null;
}

export async function resolveOccupiedSlot(
  slot: Pick<
    PlannerSlot,
    'weekOffset' | 'dayIndex' | 'date' | 'recipe' | 'referenceWeekStartDate' | 'removalToken'
  >,
  action: 'tomorrow' | 'next_week' | 'drop'
) {
  if (action === 'drop') {
    const date = DateOnly.parse(slot.date);
    if (!date || !slot.removalToken)
      throw new Error('Refresh your plan to confirm this supper before removing it.');
    await apiClient.api.schedule.day.byDate(date).remove.delete({
      queryParameters: { expectedPlanToken: slot.removalToken },
      options: [new RetryHandlerOptions({ maxRetries: 0 })],
    });
    return;
  }

  if (action === 'tomorrow') return moveTomorrow(slot);
  return deferToFollowingWeek(slot);
}

type DeferSource = Pick<
  PlannerSlot,
  'weekOffset' | 'dayIndex' | 'date' | 'recipe' | 'referenceWeekStartDate'
>;
type DeferAttempt = {
  result?: { data: DeferScheduleResultDto };
  unknown?: boolean;
  pending?: Promise<{ data: DeferScheduleResultDto }>;
};
const deferAttempts = new WeakMap<DeferSource, DeferAttempt>();

/** Retain the HTTP acknowledgement within the captured source's mounted recovery. */
export async function deferToFollowingWeek(source: DeferSource) {
  const previous = deferAttempts.get(source);
  if (previous?.result) return previous.result;
  if (previous?.pending) return previous.pending;
  if (previous?.unknown) {
    await Promise.allSettled([getSchedule(source.weekOffset, source.referenceWeekStartDate, true)]);
    throw new Error(
      'The original meal could not be confirmed. Review your plan before choosing again.'
    );
  }
  if (!source.recipe?.id || !source.referenceWeekStartDate)
    throw new Error('Refresh your plan before moving this meal.');
  const sourceDate = DateOnly.parse(source.date);
  if (!sourceDate) throw new Error('Refresh your plan before moving this meal.');
  const attempt: DeferAttempt = {};
  deferAttempts.set(source, attempt);
  attempt.pending = (async () => {
    try {
      const response = await apiClient.api.schedule.defer.post(
        { sourceDate, recipeId: source.recipe!.id! },
        {
          queryParameters: {
            ...referenceRequest(source.referenceWeekStartDate)?.queryParameters,
            targetWeekOffset: source.weekOffset + 1,
          },
          options: [new RetryHandlerOptions({ maxRetries: 0 })],
        }
      );
      const data = response?.data;
      const date = civilDate(data?.scheduledDate?.toString());
      const timestamp =
        date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN;
      const offset = Math.floor(
        (timestamp - Date.parse(`${source.referenceWeekStartDate}T00:00:00Z`)) / (7 * 86400000)
      );
      if (
        !data ||
        !Number.isFinite(timestamp) ||
        offset < source.weekOffset + 1 ||
        offset !== data.scheduledWeekOffset
      )
        throw new Error(
          'The original meal could not be confirmed. Review your plan before choosing again.'
        );
      attempt.result = { data };
      return attempt.result;
    } catch (error) {
      const status = (error as { responseStatusCode?: number })?.responseStatusCode;
      if ([400, 401, 403, 404, 409].includes(status ?? 0)) deferAttempts.delete(source);
      else {
        attempt.unknown = true;
        await Promise.allSettled([
          getSchedule(source.weekOffset, source.referenceWeekStartDate, true),
        ]);
      }
      throw error;
    } finally {
      attempt.pending = undefined;
    }
  })();
  return attempt.pending;
}

export async function disposeReplacementOriginal(
  slot: PlannerSlot,
  action: ReplacementAction
): Promise<OriginalDisposition> {
  const base = {
    action,
    recipeName: slot.recipe?.name ?? (slot.nonCooking ? nonCookingLabel(slot.nonCooking) : ''),
    sourceDate: slot.date,
  };
  if (action === 'drop') {
    await resolveOccupiedSlot(slot, action);
    return base;
  }
  if (action === 'tomorrow') {
    const result = await moveTomorrow(slot);
    return { ...base, destinationDate: result.destinationDate?.toString() };
  }
  const result = await deferToFollowingWeek(slot);
  return {
    ...base,
    destinationDate: result.data.scheduledDate?.toString(),
    spillover: (result.data.scheduledWeekOffset ?? 0) > slot.weekOffset + 1,
  };
}

export class TomorrowMoveError extends Error {
  override name = 'TomorrowMoveError';

  constructor(
    message: string,
    readonly responseStatusCode?: number
  ) {
    super(message);
  }
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
            : 'This meal could not be moved. Refresh your plan before trying again.',
          status
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
