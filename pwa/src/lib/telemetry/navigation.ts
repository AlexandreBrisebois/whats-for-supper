import { isOpeningScreen, type OpeningScreen } from './opening';

// Closed browser vocabulary. Surface identities are added only with their adopted owner.
export interface BrowserObservation {
  eventName: 'pwa.app.opened' | 'pwa.screen.presented';
  screen: OpeningScreen;
  sessionId: string;
  tabId: string;
  eventId: string;
  sequence: number;
  timestamp: number;
}
const fields = [
  'eventName',
  'screen',
  'sessionId',
  'tabId',
  'eventId',
  'sequence',
  'timestamp',
] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseBrowserObservation(
  input: unknown,
  observedAt: number
): BrowserObservation | null {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Reflect.ownKeys(input).length !== fields.length) return null;
    const values: Record<string, unknown> = {};
    for (const key of fields) {
      const field = Object.getOwnPropertyDescriptor(input, key);
      if (!field || !Object.hasOwn(field, 'value')) return null;
      values[key] = field.value;
    }
    if (values.eventName !== 'pwa.app.opened' && values.eventName !== 'pwa.screen.presented')
      return null;
    if (!isOpeningScreen(values.screen)) return null;
    for (const key of ['sessionId', 'tabId', 'eventId'])
      if (typeof values[key] !== 'string' || !uuid.test(values[key])) return null;
    for (const key of ['sequence', 'timestamp'])
      if (typeof values[key] !== 'number' || !Number.isSafeInteger(values[key]) || values[key] <= 0)
        return null;
    const timestamp = values.timestamp as number;
    if (timestamp < observedAt - 86_400_000 || timestamp > observedAt + 300_000) return null;
    if (new TextEncoder().encode(JSON.stringify(values)).byteLength > 2048) return null;
    return values as unknown as BrowserObservation;
  } catch {
    // No getters, malformed values or inspection errors escape into application behavior.
    return null;
  }
}
