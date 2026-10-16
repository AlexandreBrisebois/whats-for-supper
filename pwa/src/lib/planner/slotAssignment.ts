import { readCalendar } from '@/lib/deployment-calendar';
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
    const targetDayIndex = slot.dayIndex + 1;
    await apiClient.api.schedule.move.post(
      {
        weekOffset: slot.weekOffset,
        fromIndex: slot.dayIndex,
        toIndex: targetDayIndex <= 6 ? targetDayIndex : 0,
        targetWeekOffset: targetDayIndex <= 6 ? slot.weekOffset : slot.weekOffset + 1,
        intent: 'push',
        recipeId,
      },
      referenceRequest(slot.referenceWeekStartDate)
    );
    return;
  }

  if (useServerDefer) {
    const sourceDate = DateOnly.parse(slot.date);
    if (!sourceDate) return;
    return apiClient.api.schedule.defer.post(
      { sourceDate, recipeId },
      referenceRequest(slot.referenceWeekStartDate)
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
