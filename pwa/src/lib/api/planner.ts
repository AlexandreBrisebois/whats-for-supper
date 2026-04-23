import { apiClient } from './client';

export interface ScheduleDay {
  day: string;
  date: string;
  recipe: {
    id: string;
    name: string;
    image: string;
  } | null;
}

export interface ScheduleResponse {
  weekOffset: number;
  locked: boolean;
  days: ScheduleDay[];
}

export const getSchedule = async (weekOffset: number): Promise<ScheduleResponse> => {
  const { data } = await apiClient.get(`/api/schedule?weekOffset=${weekOffset}`);
  return data.data;
};

export const lockSchedule = async (weekOffset: number) => {
  const { data } = await apiClient.post(`/api/schedule/lock?weekOffset=${weekOffset}`);
  return data.data;
};

export const moveRecipe = async (weekOffset: number, fromIndex: number, toIndex: number) => {
  const { data } = await apiClient.post(`/api/schedule/move`, { weekOffset, fromIndex, toIndex });
  return data.data;
};

export const getFillTheGap = async () => {
  const { data } = await apiClient.get(`/api/schedule/fill-the-gap`);
  return data.data;
};
export const assignRecipeToDay = async (
  weekOffset: number,
  dayIndex: number,
  recipe: { id: string; name: string; image: string }
) => {
  const { data } = await apiClient.post(`/api/schedule/assign`, {
    weekOffset,
    dayIndex,
    recipeId: recipe.id,
    recipeName: recipe.name,
    recipeImage: recipe.image,
  });
  return data.data;
};
