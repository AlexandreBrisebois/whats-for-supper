import { afterEach, expect, it, vi } from 'vitest';

const retired = vi.hoisted(() => ({
  initialize: vi.fn(),
  report: vi.fn(),
  listen: vi.fn(),
}));
vi.mock('./lib/telemetry/server', () => ({ initializeTelemetry: retired.initialize }));
vi.mock('./lib/telemetry/server-errors', () => ({ reportNextError: retired.report }));
vi.mock('./lib/telemetry/errors', () => ({ registerNativeErrors: retired.listen }));

// Next automatically discovers these entrypoints before normal request/hydration
// work. A stale enabled deployment environment must not reactivate their effects.
const serverEntries = import.meta.glob('./instrumentation.ts');
const browserEntries = import.meta.glob('./instrumentation-client.ts');
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it('has no application startup or error-reporting hook under legacy enabled configuration', async () => {
  vi.stubEnv('NEXT_RUNTIME', 'nodejs');
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', 'http://127.0.0.1:4318');
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'synthetic-browser');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'synthetic-server');
  for (const load of Object.values(serverEntries)) {
    const hooks = (await load()) as {
      register?: () => Promise<void>;
      onRequestError?: (...args: unknown[]) => Promise<void>;
    };
    await hooks.register?.();
    await hooks.onRequestError?.(new Error('synthetic failure'), {}, { routeType: 'render' });
  }
  for (const load of Object.values(browserEntries)) await load();
  expect(retired.initialize).not.toHaveBeenCalled();
  expect(retired.report).not.toHaveBeenCalled();
  expect(retired.listen).not.toHaveBeenCalled();
  expect(Object.keys(serverEntries)).toEqual([]);
  expect(Object.keys(browserEntries)).toEqual([]);
});
