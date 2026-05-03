/**
 * Converts an ISO 8601 duration (e.g. "PT45M", "PT1H30M") to a display string
 * (e.g. "45 mins", "1h 30m"). Returns null if input is null/empty.
 */
export function formatTotalTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const hours = iso.match(/(\d+)H/)?.[1];
  const mins = iso.match(/(\d+)M/)?.[1];
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  if (mins) return `${mins} mins`;
  return null;
}
