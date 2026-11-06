/** Only the mounted portions editor owns this temporary continuation boundary. */
let owner: ((continueNavigation: () => void) => void) | undefined;
export function registerPortionsDeparture(request: (continueNavigation: () => void) => void) {
  owner = request;
  return () => {
    if (owner === request) owner = undefined;
  };
}
export function requestPortionsDeparture(continueNavigation: () => void): boolean {
  if (!owner) return false;
  owner(continueNavigation);
  return true;
}

export function portionsEditorUrl(
  date: string,
  weekOffset: number,
  reference: string,
  returnTo: string
): string {
  return `/planner?${new URLSearchParams({ planDate: date, weekOffset: String(weekOffset), referenceWeekStartDate: reference, portions: 'true', returnTo })}`;
}

export function portionsReturnPath(value: string | null): string | undefined {
  return value && /^\/(recipes|planner)\?/.test(value) ? value : undefined;
}
