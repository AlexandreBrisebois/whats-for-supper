/**
 * Standardizes recipe duration formatting.
 * - Under 1 hour: "45 MINS"
 * - 1 hour or more: "1H 20 MINS" or "1H"
 *
 * Supports ISO 8601 durations (PT10M, PT1H20M) and simple strings (45 min, 15).
 */
export function formatRecipeTime(duration: string | undefined | null): string {
  if (!duration) return '';

  let totalMinutes = 0;

  if (duration.startsWith('PT')) {
    const hoursMatch = duration.match(/(\d+)H/);
    const minutesMatch = duration.match(/(\d+)M/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
    totalMinutes = hours * 60 + minutes;
  } else {
    // Try to parse "45 min" or just "15"
    const match = duration.match(/(\d+)/);
    if (match) {
      totalMinutes = parseInt(match[1]);
    }
  }

  if (totalMinutes === 0) return '';

  if (totalMinutes < 60) {
    return `${totalMinutes} MINS`;
  } else {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (m === 0) {
      return `${h}H`;
    }
    return `${h}H ${m} MINS`;
  }
}
