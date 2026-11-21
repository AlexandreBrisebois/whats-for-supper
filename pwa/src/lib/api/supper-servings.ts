import { DateOnly } from '@microsoft/kiota-abstractions';
import { RetryHandlerOptions } from '@microsoft/kiota-http-fetchlibrary';
import { apiClient } from './api-client';
import type { SupperPreparation, SupperServingsSave } from './generated/models';

// Kiota's nullable object reader can produce an empty object for JSON null.
export function normalizeSupperPreparation(
  preparation: SupperPreparation | null | undefined
): SupperPreparation | null {
  return preparation?.preparedOn && preparation.preparedAtUtc ? preparation : null;
}

const noReplay = { options: [new RetryHandlerOptions({ maxRetries: 0 })] };
export async function readSupperServings(weekOffset: number, reference?: string) {
  const result = await apiClient.api.schedule.servings.get({
    ...noReplay,
    queryParameters: {
      weekOffset,
      ...(reference ? { referenceWeekStartDate: DateOnly.parse(reference)! } : {}),
    },
  });
  if (!result?.data?.version || result.data.days?.length !== 7)
    throw new Error('Portions unavailable');
  return result.data;
}
export async function saveSupperServings(body: SupperServingsSave) {
  const result = await apiClient.api.schedule.servings.put(body, noReplay);
  if (!result?.data?.version) throw new Error('Portions acknowledgement unavailable');
  return result.data;
}
export async function refreshSupperGroceries(weekStart: string) {
  await apiClient.api.schedule.servings.refresh.post(
    { weekStartDates: [DateOnly.parse(weekStart)!] },
    noReplay
  );
}

/** A preparation is never automatically replayed after an uncertain HTTP outcome. */
export async function prepareSupper(
  date: string,
  body: import('./generated/models').PrepareSupperRequest
) {
  const result = await apiClient.api.schedule.day
    .byDate(DateOnly.parse(date)!)
    .prepare.post(body, noReplay);
  const outcome = result?.data;
  if (
    !outcome?.preparation ||
    String(outcome.occurrenceId) !== String(body.expectedOccurrenceId) ||
    String(outcome.recipeId) !== String(body.recipeId) ||
    outcome.supperDate?.toString() !== date
  )
    throw new Error('Preparation acknowledgement unavailable');
  return outcome;
}
