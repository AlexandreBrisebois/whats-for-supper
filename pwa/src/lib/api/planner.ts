import { DateOnly } from '@microsoft/kiota-abstractions';
import { apiClient } from './api-client';
import type {
  ScheduleDays,
  ScheduleDayDto,
  ScheduleRecipeDto,
  PreSelectedRecipeDto,
  SmartDefaultsDto,
} from './generated/models';

export type ScheduleDay = ScheduleDayDto;
export type ScheduleResponse = ScheduleDays;
export type PreSelectedRecipe = PreSelectedRecipeDto;
export type SmartDefaultsResponse = SmartDefaultsDto;

/** Narrows the oneOf recipe union to the concrete ScheduleRecipeDto, filtering out the null member. */
export function isScheduleRecipe(
  recipe: any | null | undefined
): recipe is { data: ScheduleRecipeDto } | ScheduleRecipeDto {
  if (!recipe) return false;
  // Handle wrapped { data: ScheduleRecipeDto }
  if (recipe.data && (recipe.data.id != null || 'id' in recipe.data)) return true;
  // Handle direct ScheduleRecipeDto
  if (recipe.id != null || 'id' in recipe) return true;
  return false;
}

export const getSchedule = async (weekOffset: number): Promise<ScheduleResponse | undefined> => {
  const result = await apiClient.api.schedule.get({
    queryParameters: { weekOffset },
  });
  const data = result?.data;
  return data?.weekOffset !== undefined ? data : undefined;
};

export const lockSchedule = async (weekOffset: number) => {
  const result = await apiClient.api.schedule.lock.post({
    queryParameters: { weekOffset },
  });
  return result?.data || result;
};

export const moveRecipe = async (weekOffset: number, fromIndex: number, toIndex: number) => {
  const result = await apiClient.api.schedule.move.post({ weekOffset, fromIndex, toIndex });
  return result; // Move usually returns 204 or empty data
};

export const getFillTheGap = async () => {
  const result = await apiClient.api.schedule.fillTheGap.get();
  const data = result?.data || result;
  return Array.isArray(data) ? data : [];
};

export const assignRecipeToDay = async (
  weekOffset: number,
  dayIndex: number,
  recipe: { id: string; name: string | null; image: string }
) => {
  return await apiClient.api.schedule.assign.post({
    weekOffset,
    dayIndex,
    recipeId: recipe.id,
  });
};

export const openVoting = async (weekOffset: number) => {
  return await apiClient.api.schedule.voting.open.post({
    queryParameters: { weekOffset },
  });
};

export const removeRecipeFromDay = async (date: string) => {
  return await apiClient.api.schedule.day.byDate(DateOnly.parse(date)!).remove.delete();
};

export const getSmartDefaults = async (
  weekOffset: number
): Promise<SmartDefaultsResponse | null> => {
  try {
    const result = await apiClient.api.schedule.byWeekOffset(weekOffset).smartDefaults.get();
    const data = result?.data;
    return data?.weekOffset !== undefined ? data : null;
  } catch {
    return null;
  }
};
