import { DateOnly } from '@microsoft/kiota-abstractions';
import { apiClient } from '@/lib/api/api-client';
import { assignRecipeToDay, getSchedule, normalizeScheduleRecipe } from '@/lib/api/planner';

export type AssignmentRecipe = {
  id: string;
  name: string | null;
  image: string;
};

export type PlannerSlot = {
  weekOffset: number;
  dayIndex: number;
  date: string;
  recipe: ReturnType<typeof normalizeScheduleRecipe>;
};

export async function getPlannerSlot(
  weekOffset: number,
  dayIndex: number
): Promise<PlannerSlot | null> {
  const schedule = await getSchedule(weekOffset);
  const day = schedule?.days?.[dayIndex];
  if (!day?.date) return null;

  return {
    weekOffset,
    dayIndex,
    date: day.date,
    recipe: normalizeScheduleRecipe(day.recipe),
  };
}

export async function assignRecipeToEmptySlot(
  weekOffset: number,
  dayIndex: number,
  recipe: AssignmentRecipe
) {
  await assignRecipeToDay(weekOffset, dayIndex, recipe);
}

export async function findFirstOpenPlannerSlot(
  startWeekOffset = 0,
  startDayIndex = 0,
  maxWeeksToScan = 12
) {
  for (
    let weekOffset = startWeekOffset;
    weekOffset < startWeekOffset + maxWeeksToScan;
    weekOffset++
  ) {
    const schedule = await getSchedule(weekOffset);
    if (!schedule?.days) continue;

    const startIndex = weekOffset === startWeekOffset ? startDayIndex : 0;
    const dayIndex = schedule.days.findIndex(
      (day, index) => index >= startIndex && !normalizeScheduleRecipe(day.recipe)
    );

    if (dayIndex !== undefined && dayIndex >= 0) {
      return { weekOffset, dayIndex };
    }
  }

  return null;
}

export async function resolveOccupiedSlot(
  slot: Pick<PlannerSlot, 'weekOffset' | 'dayIndex' | 'date' | 'recipe'>,
  action: 'tomorrow' | 'next_week' | 'drop'
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
    await apiClient.api.schedule.move.post({
      weekOffset: slot.weekOffset,
      fromIndex: slot.dayIndex,
      toIndex: targetDayIndex <= 6 ? targetDayIndex : 0,
      targetWeekOffset: targetDayIndex <= 6 ? slot.weekOffset : slot.weekOffset + 1,
      intent: 'push',
      recipeId,
    });
    return;
  }

  await apiClient.api.schedule.move.post({
    weekOffset: slot.weekOffset,
    fromIndex: slot.dayIndex,
    toIndex: 0,
    targetWeekOffset: slot.weekOffset + 1,
    intent: 'push',
    recipeId,
  });
}
