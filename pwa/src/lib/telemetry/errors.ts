import { isOpeningScreen, snapshotDocumentError, withDocumentErrorReporting } from './opening';
import type { PresentationScreen } from './navigation';

export interface BrowserErrorObservation {
  reason: 'browser.script' | 'browser.rejection' | 'browser.render';
  eventId: string;
  occurrenceId: string;
  timestamp: number;
  sessionId?: string;
  tabId?: string;
  sequence?: number;
  screen?: PresentationScreen;
}
const required = ['reason', 'eventId', 'occurrenceId', 'timestamp'];
const allowed = new Set([...required, 'sessionId', 'tabId', 'sequence', 'screen']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseBrowserError(
  input: unknown,
  observedAt: number
): BrowserErrorObservation | null {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const values: Record<string, unknown> = {};
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key !== 'string' || !allowed.has(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) return null;
      values[key] = descriptor.value;
    }
    if (!required.every((key) => Object.hasOwn(values, key))) return null;
    if (
      values.reason !== 'browser.script' &&
      values.reason !== 'browser.rejection' &&
      values.reason !== 'browser.render'
    )
      return null;
    const hasContext = ['sessionId', 'tabId', 'sequence'].some((key) => Object.hasOwn(values, key));
    for (const key of ['eventId', 'occurrenceId', ...(hasContext ? ['sessionId', 'tabId'] : [])])
      if (typeof values[key] !== 'string' || !uuid.test(values[key])) return null;
    for (const key of ['timestamp', ...(hasContext ? ['sequence'] : [])])
      if (typeof values[key] !== 'number' || !Number.isSafeInteger(values[key]) || values[key] <= 0)
        return null;
    if (
      Object.hasOwn(values, 'screen') &&
      (!hasContext || (!isOpeningScreen(values.screen) && values.screen !== 'planner.grocery'))
    )
      return null;
    const timestamp = values.timestamp as number;
    if (timestamp < observedAt - 86400000 || timestamp > observedAt + 300000) return null;
    if (new TextEncoder().encode(JSON.stringify(values)).byteLength > 2048) return null;
    return values as unknown as BrowserErrorObservation;
  } catch {
    return null;
  }
}

export function observeBrowserError(
  owner: Document,
  reason: BrowserErrorObservation['reason'],
  submit: (input: BrowserErrorObservation) => Promise<void>,
  timestamp = Date.now(),
  standalone = false
): void {
  try {
    const context = snapshotDocumentError(owner, !standalone);
    if (!context) return;
    const snapshot: BrowserErrorObservation = {
      reason,
      timestamp,
      eventId: crypto.randomUUID(),
      occurrenceId: crypto.randomUUID(),
      ...context,
    };
    withDocumentErrorReporting(owner, () => {
      try {
        void submit(snapshot).catch(() => {});
      } catch {
        /* No telemetry exception escapes. */
      }
    });
  } catch {
    /* Randomness/inspection failure never changes application handling. */
  }
}

// One registration owns each native dispatch episode. No Error/value is inspected
// or retained: reusing the same thrown object in a later dispatch is independent.
const registrations = new WeakMap<
  Window,
  {
    references: number;
    submit?: (input: BrowserErrorObservation) => Promise<void>;
    dispose: () => void;
  }
>();
export function registerNativeErrors(
  target: Window,
  submit?: (input: BrowserErrorObservation) => Promise<void>
): () => void {
  let registration = registrations.get(target);
  if (!registration) {
    const script = (event: Event) => {
      // Resource failures and unavailable cross-origin script detail are not coverage.
      if (
        !(event instanceof ErrorEvent) ||
        (event.error == null && event.message === 'Script error.')
      )
        return;
      const object = objectValue(event.error);
      if (object && recentBoundary.get(target.document) === object) return;
      if (object) {
        let recent = recentNative.get(target.document);
        if (!recent) {
          recent = new Set();
          recentNative.set(target.document, recent);
        }
        if (recent.size < 10) recent.add(object);
        if (!nativeClearScheduled.has(target.document)) {
          nativeClearScheduled.add(target.document);
          queueMicrotask(() => {
            recentNative.delete(target.document);
            nativeClearScheduled.delete(target.document);
          });
        }
      }
      if (registration?.submit)
        observeBrowserError(target.document, 'browser.script', registration.submit);
    };
    const rejection = () => {
      if (registration?.submit)
        observeBrowserError(target.document, 'browser.rejection', registration.submit);
    };
    target.addEventListener('error', script);
    target.addEventListener('unhandledrejection', rejection);
    registration = {
      references: 0,
      dispose: () => {
        target.removeEventListener('error', script);
        target.removeEventListener('unhandledrejection', rejection);
      },
    };
    registrations.set(target, registration);
  }
  if (submit) registration.submit = submit;
  registration.references++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--registration.references === 0) {
      registration.dispose();
      registrations.delete(target);
    }
  };
}

// Tokens belong to mounted boundary episodes, never to an Error's lifetime.
// At most ten admitted episodes can be held per Document. Cleanup/reset releases
// their object references; native-before-boundary identity lasts one task only.
interface BoundaryEpisode {
  token: object;
  error?: object;
}
const episodes = new WeakMap<Document, BoundaryEpisode[]>();
const claimed = new WeakSet<object>();
const recentNative = new WeakMap<Document, Set<object>>();
const nativeClearScheduled = new WeakSet<Document>();
const recentBoundary = new WeakMap<Document, object>();
function objectValue(value: unknown): object | undefined {
  return value !== null && (typeof value === 'object' || typeof value === 'function')
    ? (value as object)
    : undefined;
}
function serverOwned(value: unknown): boolean {
  const object = objectValue(value);
  if (!object) return false;
  try {
    const marker = Object.getOwnPropertyDescriptor(object, 'digest');
    // Accessors are not evaluated, including on adversarial thrown values.
    return (
      !!marker &&
      (!Object.hasOwn(marker, 'value') ||
        (typeof marker.value === 'string' && marker.value.length > 0))
    );
  } catch {
    return true;
  }
}
export function retireBoundaryError(owner: Document, token: object): void {
  const active = episodes.get(owner);
  if (active) {
    const retired = active.find((e) => e.token === token);
    if (retired?.error && recentBoundary.get(owner) === retired.error) recentBoundary.delete(owner);
    episodes.set(
      owner,
      active.filter((e) => e.token !== token)
    );
  }
}
export function observeBoundaryError(
  owner: Document,
  error: unknown,
  token: object,
  submit: (input: BrowserErrorObservation) => Promise<void>,
  timestamp = Date.now(),
  standalone = false
): void {
  if (claimed.has(token)) return;
  claimed.add(token);
  if (serverOwned(error)) return;
  const object = objectValue(error);
  const active = episodes.get(owner) ?? [];
  if (active.length >= 10) return;
  const overlapping =
    object && (active.some((e) => e.error === object) || recentNative.get(owner)?.has(object));
  active.push({ token, error: object });
  if (object) {
    recentBoundary.set(owner, object);
    queueMicrotask(() => {
      if (recentBoundary.get(owner) === object) recentBoundary.delete(owner);
      // Object identity is only proof during the commit/dispatch turn.
      const episode = active.find((e) => e.token === token);
      if (episode) episode.error = undefined;
    });
  }
  episodes.set(owner, active);
  if (!overlapping) observeBrowserError(owner, 'browser.render', submit, timestamp, standalone);
}
