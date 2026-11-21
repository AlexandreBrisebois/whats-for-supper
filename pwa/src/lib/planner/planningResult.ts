import type { OriginalDisposition } from './replacementSession';
import { absoluteMonday, civilDate } from '@/lib/deployment-calendar';

export type PlanningResult = {
  returnId?: string;
  weekOffset: number;
  dayIndex: number;
  referenceWeekStartDate: string;
  date: string;
  recipeId: string;
  recipeName: string;
  original?: OriginalDisposition;
};

const key = 'wfs.planning-result';

export function rememberPlanningResult(result: PlanningResult) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ...result, returnId: crypto.randomUUID() }));
  } catch {
    /* Storage may be unavailable. */
  }
}

export function readPlanningResult(): PlanningResult | null {
  try {
    const result = JSON.parse(sessionStorage.getItem(key) ?? 'null') as PlanningResult | null;
    return result &&
      Number.isSafeInteger(result.weekOffset) &&
      Number.isInteger(result.dayIndex) &&
      result.dayIndex >= 0 &&
      result.dayIndex <= 6 &&
      absoluteMonday(result.referenceWeekStartDate) &&
      civilDate(result.date) &&
      Date.parse(`${result.date}T00:00:00Z`) ===
        Date.parse(`${result.referenceWeekStartDate}T00:00:00Z`) +
          (result.weekOffset * 7 + result.dayIndex) * 86400000 &&
      typeof result.recipeId === 'string' &&
      typeof result.recipeName === 'string'
      ? result
      : null;
  } catch {
    return null;
  }
}

/** A reconciliation may consume only the return it read, never a newer save. */
export function retirePlanningResult(result: PlanningResult) {
  try {
    if (JSON.stringify(readPlanningResult()) === JSON.stringify(result)) {
      sessionStorage.removeItem(key);
    }
  } catch {
    /* Storage may be unavailable. */
  }
}
