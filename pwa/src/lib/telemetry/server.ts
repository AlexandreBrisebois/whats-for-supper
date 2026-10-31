import 'server-only';
import { createLogDelivery, type Producer } from './sdk';
import { createNativeDelivery } from './native';
import type { BrowserObservation } from './navigation';
import type { BrowserErrorObservation } from './errors';

interface ServerErrorObservation {
  reason: 'server.render' | 'server.route' | 'server.action' | 'server.proxy' | 'server.unknown';
  timestamp: number;
  eventId: string;
  occurrenceId: string;
  screen?: never;
  sessionId?: never;
  tabId?: never;
  sequence?: never;
}

function configuration() {
  if (process.env.WFS_TELEMETRY_ENABLED !== 'true') return null;
  // The standard SDK merges fallback headers rather than replacing them. Refuse
  // ambient enrichment instead of mutating process-wide SDK environment settings.
  if (
    process.env.OTEL_EXPORTER_OTLP_HEADERS ||
    process.env.OTEL_EXPORTER_OTLP_LOGS_HEADERS ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS
  )
    return null;
  const browser = process.env.SENTRAME_BROWSER_TOKEN?.trim();
  const server = process.env.SENTRAME_SERVER_TOKEN?.trim();
  // Producer credentials must be nonempty visible ASCII header values. Reject
  // control/whitespace and Unicode before exposing an enabled boolean.
  if (!browser || !server || browser === server || !/^[\x21-\x7e]+$/.test(browser + server))
    return null;
  try {
    const url = new URL(process.env.SENTRAME_OTLP_BASE ?? '');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    return {
      base: url.origin,
      browser,
      server,
      version: process.env.WFS_VERSION?.trim() || 'unknown',
    };
  } catch {
    return null;
  }
}

export function telemetryEnabled() {
  return configuration() !== null;
}

// One process-owned pipeline survives module reloads. Configuration changes never
// create fresh exporters to evade occupied transport slots; recreate the process.
type Delivery = ReturnType<typeof createLogDelivery>;
interface State {
  delivery?: Delivery;
  native?: ReturnType<typeof createNativeDelivery>;
}
const processOwner = globalThis as typeof globalThis & {
  __wfsTelemetryState?: State;
  __wfsTelemetryExitHook?: boolean;
};
function state(): State {
  return (processOwner.__wfsTelemetryState ??= {});
}
export function initializeTelemetry(): void {
  const config = configuration();
  if (!config) return;
  state().delivery ??= createLogDelivery(config, configuration);
  state().native ??= createNativeDelivery(config, configuration);
  state().native?.register();
  if (!processOwner.__wfsTelemetryExitHook) {
    processOwner.__wfsTelemetryExitHook = true;
    // Natural Node exit only: Next's explicit signal exit skips beforeExit.
    // Standalone SIGTERM/SIGINT delivery is best effort; queued tail may be lost.
    process.once('beforeExit', () => {
      void flushTelemetry(5000);
    });
  }
}
export async function flushTelemetry(timeoutMillis = 2000): Promise<void> {
  try {
    await Promise.all([
      state().delivery?.flush(timeoutMillis),
      state().native?.flush(timeoutMillis),
    ]);
  } catch {
    /* isolated */
  }
}
// Supported SDK teardown, also used by isolated test composition after closing
// owned receivers. Bounded provider waiting does not promise network cancellation.
export async function shutdownTelemetry(): Promise<void> {
  const current = processOwner.__wfsTelemetryState;
  try {
    await Promise.all([current?.delivery?.shutdown(), current?.native?.shutdown()]);
  } catch {
    /* isolated */
  }
  if (processOwner.__wfsTelemetryState === current) delete processOwner.__wfsTelemetryState;
}

async function exportLog(
  producer: Producer,
  observation?: BrowserObservation | BrowserErrorObservation | ServerErrorObservation,
  observedAt = Date.now()
): Promise<void> {
  try {
    if (!configuration()) return;
    const current = state();
    const now = Date.now();
    const isError = observation !== undefined && 'occurrenceId' in observation;
    initializeTelemetry();
    const attributes: Record<string, string | number> = {};
    if (observation) {
      attributes['event.id'] = observation.eventId;
      if (isError) {
        const error = observation as BrowserErrorObservation | ServerErrorObservation;
        attributes.reason = error.reason;
        attributes['exception.occurrence.id'] = error.occurrenceId;
      }
      if ('reason' in observation && observation.reason) attributes.reason = observation.reason;
      if (observation.screen) attributes['stage.name'] = observation.screen;
      if (observation.sessionId) {
        attributes['session.id'] = observation.sessionId;
        attributes['tab.id'] = observation.tabId!;
        attributes['source.sequence'] = observation.sequence!;
      }
    }
    current.delivery?.emit(producer, {
      timestamp: observation?.timestamp ?? now,
      observedTimestamp: observedAt,
      eventName: isError
        ? `pwa.${producer}.error`
        : observation && 'eventName' in observation
          ? observation.eventName
          : 'pwa.telemetry.check',
      severityNumber: isError ? 17 : 9,
      attributes,
    });
  } catch {
    /* Admission/SDK failure never escapes into business handling. */
  }
}

// Fixed entry points share transport while preserving producer authority.
export async function sendBrowserCheck(): Promise<void> {
  await exportLog('browser');
}
export async function sendServerCheck(): Promise<void> {
  await exportLog('server');
}

export async function sendBrowserObservation(
  observation: BrowserObservation,
  observedAt = Date.now()
): Promise<void> {
  await exportLog('browser', observation, observedAt);
}

export async function sendBrowserError(
  observation: BrowserErrorObservation,
  observedAt = Date.now()
): Promise<void> {
  await exportLog('browser', observation, observedAt);
}

export async function sendServerError(routeType: unknown, timestamp = Date.now()): Promise<void> {
  try {
    const reason: ServerErrorObservation['reason'] =
      routeType === 'render'
        ? 'server.render'
        : routeType === 'route'
          ? 'server.route'
          : routeType === 'action'
            ? 'server.action'
            : routeType === 'proxy'
              ? 'server.proxy'
              : 'server.unknown';
    await exportLog(
      'server',
      {
        reason,
        timestamp,
        eventId: crypto.randomUUID(),
        occurrenceId: crypto.randomUUID(),
      },
      timestamp
    );
    await flushTelemetry();
  } catch {
    /* Reporting cannot escape into the request error hook. */
  }
}
