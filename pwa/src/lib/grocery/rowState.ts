const maximumVersion = 18446744073709551615n;

export function groceryVersion(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,19}$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed <= maximumVersion ? parsed : null;
}

const pending = new Map<string, { sequence: number; checked: boolean }>();
const queues = new Map<string, Promise<unknown>>();
const versions = new Map<string, string>();
let sequence = 0;
const key = (week: string, row: string) => `${week}\0${row}`;

export function beginGroceryIntent(week: string, row: string, checked: boolean) {
  const token = ++sequence;
  pending.set(key(week, row), { sequence: token, checked });
  return token;
}

export function finishGroceryIntent(week: string, row: string, token: number) {
  const id = key(week, row);
  if (pending.get(id)?.sequence === token) pending.delete(id);
}

export function isLatestGroceryIntent(week: string, row: string, token: number) {
  return pending.get(key(week, row))?.sequence === token;
}

export function overlayGroceryIntents(week: string, checks: Record<string, boolean>) {
  const result = { ...checks };
  for (const [id, intent] of pending) {
    const prefix = `${week}\0`;
    if (id.startsWith(prefix)) result[id.slice(prefix.length)] = intent.checked;
  }
  return result;
}

export function rememberGroceryVersion(week: string, row: string, version: string) {
  const id = key(week, row);
  const next = groceryVersion(version);
  const previous = groceryVersion(versions.get(id));
  if (next !== null && (previous === null || next > previous)) versions.set(id, version);
}

export function currentGroceryVersion(week: string, row: string, fallback: string) {
  rememberGroceryVersion(week, row, fallback);
  return versions.get(key(week, row)) ?? fallback;
}

export function enqueueGroceryIntent<T>(
  week: string,
  row: string,
  operation: () => Promise<T>
): Promise<T> {
  const id = key(week, row);
  const next = (queues.get(id) ?? Promise.resolve()).catch(() => {}).then(operation);
  queues.set(id, next);
  const cleanup = () => {
    if (queues.get(id) === next) {
      queues.delete(id);
      versions.delete(id);
    }
  };
  void next.then(cleanup, cleanup);
  return next;
}

// A freshly authorized recovery generation retires transient intentions and
// version floors for the prior household state. Tokens remain globally unique.
export function retireGroceryIntents() {
  pending.clear();
  queues.clear();
  versions.clear();
}
