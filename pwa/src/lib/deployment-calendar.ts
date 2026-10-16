import type { DeploymentCalendarContext } from './api/generated/models';

export interface CalendarContext {
  timeZone: string;
  capturedAtUtc: string;
  today: string;
  currentWeekStartDate: string;
  referenceWeekStartDate: string;
  nextDayAtUtc: string;
}

export interface CalendarTime {
  instant: () => number;
  elapsed: () => number;
}

// Browser composition boundary. Meal dates always come from the server.
export const calendarTime: CalendarTime = {
  instant: () => Date.now(),
  elapsed: () => performance.now(),
};

export const CALENDAR_ERROR = "Could not confirm today's date. Try again.";
export class CalendarUnavailableError extends Error {
  constructor(cause?: unknown) {
    super(CALENDAR_ERROR, { cause });
    this.name = 'CalendarUnavailableError';
  }
}

export interface CalendarAnchor {
  receivedAtElapsed: number;
  expiresAfterMs: number;
}

export function anchorCalendar(
  calendar: CalendarContext,
  requestStarted: number,
  received = calendarTime.elapsed()
): CalendarAnchor {
  return {
    receivedAtElapsed: received,
    expiresAfterMs: Math.max(
      0,
      Date.parse(calendar.nextDayAtUtc) -
        Date.parse(calendar.capturedAtUtc) -
        Math.max(0, received - requestStarted)
    ),
  };
}

export function calendarAnchorIsFresh(
  anchor: CalendarAnchor | null,
  now = calendarTime.elapsed()
): boolean {
  return (
    anchor !== null &&
    now >= anchor.receivedAtElapsed &&
    now - anchor.receivedAtElapsed < anchor.expiresAfterMs
  );
}

export function civilDate(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const instant = Date.parse(`${text}T00:00:00Z`);
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === text
    ? text
    : null;
}

export function absoluteMonday(value: unknown): string | null {
  const date = civilDate(value);
  return date && new Date(`${date}T00:00:00Z`).getUTCDay() === 1 ? date : null;
}

export function weekOffsetFor(monday: unknown, reference: unknown): number | null {
  const target = absoluteMonday(monday);
  const base = absoluteMonday(reference);
  return target && base ? (Date.parse(target) - Date.parse(base)) / (7 * 86400000) : null;
}

export function calendarIdentity(calendar: CalendarContext): string {
  return [
    calendar.timeZone,
    calendar.today,
    calendar.currentWeekStartDate,
    calendar.referenceWeekStartDate,
    calendar.nextDayAtUtc,
  ].join('|');
}

export function readCalendar(
  value: DeploymentCalendarContext | CalendarContext | null | undefined
): CalendarContext | null {
  if (!value) return null;
  const date = (v: unknown) => (v == null ? '' : String(v));
  const instant = (v: unknown) => (v instanceof Date ? v.toISOString() : date(v));
  const result: CalendarContext = {
    timeZone: value.timeZone ?? '',
    today: date(value.today),
    currentWeekStartDate: date(value.currentWeekStartDate),
    referenceWeekStartDate: date(value.referenceWeekStartDate),
    capturedAtUtc: instant(value.capturedAtUtc),
    nextDayAtUtc: instant(value.nextDayAtUtc),
  };
  if (
    !result.timeZone ||
    ![result.today, result.currentWeekStartDate, result.referenceWeekStartDate].every(
      (v) => civilDate(v) !== null
    ) ||
    !absoluteMonday(result.currentWeekStartDate) ||
    !absoluteMonday(result.referenceWeekStartDate) ||
    !Number.isFinite(Date.parse(result.capturedAtUtc)) ||
    !Number.isFinite(Date.parse(result.nextDayAtUtc))
  )
    return null;
  return result;
}

export function calendarDayIndex(calendar: CalendarContext): number {
  return (
    (Date.parse(`${calendar.today}T00:00:00Z`) -
      Date.parse(`${calendar.currentWeekStartDate}T00:00:00Z`)) /
    86_400_000
  );
}

export async function loadCalendarSnapshot(time: CalendarTime = calendarTime) {
  const started = time.elapsed();
  try {
    const { getSchedule } = await import('./api/planner');
    const schedule = await getSchedule(0);
    const calendar = readCalendar(schedule?.calendar);
    if (!calendar) throw new CalendarUnavailableError();
    return { calendar, anchor: anchorCalendar(calendar, started, time.elapsed()), schedule };
  } catch (error) {
    throw error instanceof CalendarUnavailableError ? error : new CalendarUnavailableError(error);
  }
}

export async function loadDeploymentCalendar(): Promise<CalendarContext> {
  return (await loadCalendarSnapshot()).calendar;
}
