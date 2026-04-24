import { apiClient } from './api-client';
import type {
  ScheduleDays,
  ScheduleDayDto,
  PreSelectedRecipeDto,
  SmartDefaultsDto,
} from './generated/models';

export type ScheduleDay = ScheduleDayDto;
export type ScheduleResponse = ScheduleDays;
export type PreSelectedRecipe = PreSelectedRecipeDto;
export type SmartDefaultsResponse = SmartDefaultsDto;

export const getSchedule = async (weekOffset: number): Promise<ScheduleResponse | undefined> => {
  const result = await apiClient.api.schedule.get({
    queryParameters: { weekOffset },
  });
  // Handle both wrapped and unwrapped responses
  const data = result?.data || result;
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

export const getSmartDefaults = async (
  weekOffset: number
): Promise<SmartDefaultsResponse | null> => {
  try {
    const result = await apiClient.api.schedule.byWeekOffset(weekOffset).smartDefaults.get();
    // Handle both wrapped and unwrapped responses
    const data = result?.data || result;
    return data?.weekOffset !== undefined ? data : null;
  } catch {
    return null;
  }
};
