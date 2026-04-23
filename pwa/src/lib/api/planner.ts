import { apiClient } from './client';
import { components } from './types';

export type ScheduleDay = components['schemas']['ScheduleDayDto'];
export type ScheduleResponse = components['schemas']['ScheduleDays'];
export type PreSelectedRecipe = components['schemas']['PreSelectedRecipeDto'];
export type SmartDefaultsResponse = components['schemas']['SmartDefaultsDto'];

export const getSchedule = async (weekOffset: number): Promise<ScheduleResponse> => {
  const { data } = await apiClient.get(`/schedule?weekOffset=${weekOffset}`);
  return data.data;
};

export const lockSchedule = async (weekOffset: number) => {
  const { data } = await apiClient.post(`/schedule/lock?weekOffset=${weekOffset}`);
  return data.data;
};

export const moveRecipe = async (weekOffset: number, fromIndex: number, toIndex: number) => {
  const { data } = await apiClient.post(`/schedule/move`, { weekOffset, fromIndex, toIndex });
  return data.data;
};

export const getFillTheGap = async () => {
  const { data } = await apiClient.get(`/schedule/fill-the-gap`);
  return data.data;
};

export const assignRecipeToDay = async (
  weekOffset: number,
  dayIndex: number,
  recipe: { id: string; name: string | null; image: string }
) => {
  const { data } = await apiClient.post(`/schedule/assign`, {
    weekOffset,
    dayIndex,
    recipeId: recipe.id,
    recipeName: recipe.name,
    recipeImage: recipe.image,
  });
  return data.data;
};

export const getSmartDefaults = async (
  weekOffset: number
): Promise<SmartDefaultsResponse | null> => {
  try {
    const { data } = await apiClient.get(`/schedule/${weekOffset}/smart-defaults`);
    return data.data;
  } catch {
    return null;
  }
};
