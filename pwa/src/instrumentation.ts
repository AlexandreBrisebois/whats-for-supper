import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = async (_error, _request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const timestamp = Date.now();
  try {
    const { reportNextError } = await import('./lib/telemetry/server-errors');
    // The hook lifecycle requires awaited work. Browser Actions separately use after().
    await reportNextError(context.routeType, timestamp);
  } catch {
    /* Preserve the original exception semantics, including exporter failure. */
  }
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NEXT_PHASE === 'phase-production-build')
    return;
  try {
    const { initializeTelemetry } = await import('./lib/telemetry/server');
    initializeTelemetry();
  } catch {
    /* Startup is independent of optional telemetry. */
  }
}
