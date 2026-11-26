/**
 * Parses ISO 8601 durations (PT10M, PT1H20M) and simple strings ("45 min", "15")
 * into positive total minutes, or returns null when absent/unusable.
 */
export function parseRecipeTimeMinutes(duration: string | undefined | null): number | null {
  if (!duration) return null;

  let totalMinutes = 0;

  if (duration.startsWith('PT')) {
    const hoursMatch = duration.match(/(\d+)H/);
    const minutesMatch = duration.match(/(\d+)M/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    totalMinutes = hours * 60 + minutes;
  } else {
    const match = duration.match(/(\d+)/);
    if (match) {
      totalMinutes = parseInt(match[1], 10);
    }
  }

  return totalMinutes > 0 ? totalMinutes : null;
}

/**
 * Formats a positive integer minute count as an ISO 8601 duration (e.g. 90 -> "PT1H30M").
 */
export function minutesToIsoDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) return `PT${hours}H${remainingMinutes}M`;
  if (hours > 0) return `PT${hours}H`;
  return `PT${remainingMinutes}M`;
}

/**
 * Standardizes recipe duration formatting.
 * - Under 1 hour: "45 MINS"
 * - 1 hour or more: "1H 20 MINS" or "1H"
 *
 * Supports ISO 8601 durations (PT10M, PT1H20M) and simple strings (45 min, 15).
 */
export function formatRecipeTime(duration: string | undefined | null): string {
  const totalMinutes = parseRecipeTimeMinutes(duration);
  if (totalMinutes === null) return '';

  if (totalMinutes < 60) {
    return `${totalMinutes} MINS`;
  }
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) {
    return `${h}H`;
  }
  return `${h}H ${m} MINS`;
}
