import { RetryHandlerOptions } from '@microsoft/kiota-http-fetchlibrary';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { apiClient } from './api-client';
import { usePlannerStore } from '@/store/plannerStore';
import { useDiscoveryStore } from '@/store/discoveryStore';
import type {
  NonCookingPlanDto,
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

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function normalizeScheduleRecipe(recipe: unknown): ScheduleRecipeDto | null {
  const raw = readRecord(recipe);
  if (!raw) return null;

  const directId = raw.id;
  if (typeof directId === 'string' && directId.length > 0) {
    return raw as ScheduleRecipeDto;
  }

  const nestedData = readRecord(raw.data);
  if (nestedData && typeof nestedData.id === 'string' && nestedData.id.length > 0) {
    return nestedData as ScheduleRecipeDto;
  }

  const additionalData = readRecord(raw.additionalData);
  if (additionalData && typeof additionalData.id === 'string' && additionalData.id.length > 0) {
    return additionalData as ScheduleRecipeDto;
  }

  return null;
}

/** Narrows the oneOf recipe union to the concrete ScheduleRecipeDto, filtering out the null member. */
export function isScheduleRecipe(recipe: any | null | undefined): recipe is ScheduleRecipeDto {
  return normalizeScheduleRecipe(recipe) !== null;
}

export function referenceRequest(referenceWeekStartDate?: string) {
  return referenceWeekStartDate
    ? {
        queryParameters: { referenceWeekStartDate: DateOnly.parse(referenceWeekStartDate)! },
      }
    : undefined;
}

export const getSchedule = async (
  weekOffset: number,
  referenceWeekStartDate?: string,
  noRetry = false
): Promise<ScheduleResponse | undefined> => {
  const result = await apiClient.api.schedule.get({
    ...(noRetry ? { options: [new RetryHandlerOptions({ maxRetries: 0 })] } : {}),
    queryParameters: {
      weekOffset,
      ...(referenceWeekStartDate
        ? { referenceWeekStartDate: DateOnly.parse(referenceWeekStartDate)! }
        : {}),
    },
  });
  const data = result?.data;
  return data?.weekOffset !== undefined ? data : undefined;
};

export const lockSchedule = async (
  weekOffset: number,
  referenceWeekStartDate?: string,
  votingRoundId?: string
) => {
  const result = await apiClient.api.schedule.lock.post({
    queryParameters: {
      weekOffset,
      ...referenceRequest(referenceWeekStartDate)?.queryParameters,
      ...(votingRoundId ? { votingRoundId } : {}),
    },
  });
  void useDiscoveryStore.getState().refreshSession();
  return result?.data || result;
};

export const moveRecipe = async (
  weekOffset: number,
  recipeId: string,
  toIndex: number,
  fromIndex: number,
  referenceWeekStartDate?: string
) => {
  // Increment the move sequence counter before the request so HearthAuthProvider
  // stamps the new value on X-Move-Seq. The server echoes it back in week_updated,
  // letting applySnapshot identify and skip its own echo.
  usePlannerStore.getState().nextMoveSeq();
  const result = await apiClient.api.schedule.move.post(
    {
      weekOffset,
      recipeId,
      toIndex,
      fromIndex,
    },
    referenceRequest(referenceWeekStartDate)
  );
  void useDiscoveryStore.getState().refreshSession();
  return result;
};

export const getFillTheGap = async (weekOffset = 0, referenceWeekStartDate?: string) => {
  const result = await apiClient.api.schedule.fillTheGap.get({
    queryParameters: { weekOffset, ...referenceRequest(referenceWeekStartDate)?.queryParameters },
  });
  const data = result?.data || result;
  return Array.isArray(data) ? data : [];
};

export const assignRecipeToDay = async (
  weekOffset: number,
  dayIndex: number,
  recipe: { id: string; name: string | null; image: string },
  referenceWeekStartDate?: string,
  requireEmpty = false
) => {
  const result = await apiClient.api.schedule.assign.post(
    {
      weekOffset,
      dayIndex,
      recipeId: recipe.id,
      ...(requireEmpty ? { requireEmpty: true } : {}),
    },
    referenceWeekStartDate
      ? {
          queryParameters: { referenceWeekStartDate: DateOnly.parse(referenceWeekStartDate)! },
          ...(requireEmpty ? { options: [new RetryHandlerOptions({ maxRetries: 0 })] } : {}),
        }
      : undefined
  );
  void useDiscoveryStore.getState().refreshSession();
  return result;
};

export const openVoting = async (weekOffset: number, referenceWeekStartDate?: string) => {
  const result = await apiClient.api.schedule.voting.open.post({
    queryParameters: { weekOffset, ...referenceRequest(referenceWeekStartDate)?.queryParameters },
  });
  void useDiscoveryStore.getState().refreshSession();
  return result;
};

export const removeRecipeFromDay = async (date: string) => {
  const result = await apiClient.api.schedule.day.byDate(DateOnly.parse(date)!).remove.delete();
  void useDiscoveryStore.getState().refreshSession();
  return result;
};

export const getSmartDefaults = async (
  weekOffset: number,
  referenceWeekStartDate?: string
): Promise<SmartDefaultsResponse | null> => {
  try {
    const result = await apiClient.api.schedule
      .byWeekOffset(weekOffset)
      .smartDefaults.get(referenceRequest(referenceWeekStartDate));
    const data = result?.data;
    return data?.weekOffset !== undefined ? data : null;
  } catch {
    return null;
  }
};

export async function saveNonCookingDay(date: string, plan: NonCookingPlanDto) {
  const parsed = DateOnly.parse(date);
  if (!parsed) throw new Error('Invalid date');
  const result = await apiClient.api.schedule.day
    .byDate(parsed)
    .validate.post({ status: 3, nonCooking: plan });
  void useDiscoveryStore.getState().refreshSession();
  return result;
}
