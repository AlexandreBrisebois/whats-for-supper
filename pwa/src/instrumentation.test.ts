import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { decodeLogs, logAttributes } from '@/test/otlp';
let receiver: Server | undefined;
let instrumentation: typeof import('./instrumentation');
let reporting: typeof import('./lib/telemetry/server');
const request = new Proxy(
  {},
  {
    get() {
      throw Error('request must never be inspected');
    },
  }
) as Parameters<typeof instrumentation.onRequestError>[1];
const context = (routeType: string) =>
  ({ routeType }) as Parameters<typeof instrumentation.onRequestError>[2];
beforeEach(async () => {
  vi.resetModules();
  reporting = await import('./lib/telemetry/server');
  instrumentation = await import('./instrumentation');
});
afterEach(async () => {
  receiver?.closeAllConnections();
  if (receiver) await new Promise<void>((r) => receiver!.close(() => r()));
  await reporting.shutdownTelemetry();
  receiver = undefined;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
async function enable(handler: (res: ServerResponse) => void) {
  const received: { bytes: Buffer; auth?: string }[] = [];
  receiver = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    received.push({ bytes: Buffer.concat(chunks), auth: req.headers.authorization });
    handler(res);
  });
  await new Promise<void>((r) => receiver!.listen(0, '127.0.0.1', r));
  vi.stubEnv('NEXT_RUNTIME', 'nodejs');
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`);
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'synthetic-browser');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'synthetic-server');
  return received;
}
it('awaits SDK completion and preserves five hook categories and independent identities without reading private errors/requests', async () => {
  let finish: (() => void) | undefined;
  const received = await enable((res) => {
    finish = () => res.end();
  });
  const error = new Proxy(new Error('private-sentinel'), {
    get() {
      throw Error('error must never be inspected');
    },
  });
  for (const [index, type] of ['render', 'route', 'action', 'proxy', 'unsupported'].entries()) {
    let settled = false;
    const hook = instrumentation.onRequestError(error, request, context(type));
    void Promise.resolve(hook).then(() => {
      settled = true;
    });
    await vi.waitFor(() => expect(received).toHaveLength(index + 1));
    expect(settled).toBe(false);
    finish!();
    await hook;
  }
  const records = received.flatMap((r) =>
    decodeLogs(r.bytes).resourceLogs.flatMap((l) => l.scopeLogs.flatMap((s) => s.logRecords))
  );
  expect(records.map((r) => logAttributes(r).reason)).toEqual([
    'server.render',
    'server.route',
    'server.action',
    'server.proxy',
    'server.unknown',
  ]);
  expect(new Set(records.map((r) => logAttributes(r)['event.id'])).size).toBe(5);
  expect(new Set(records.map((r) => logAttributes(r)['exception.occurrence.id'])).size).toBe(5);
  for (const r of records) {
    expect(r.eventName).toBe('pwa.server.error');
    expect(r.severityNumber).toBe(17);
    expect(Object.keys(logAttributes(r)).sort()).toEqual([
      'event.id',
      'exception.occurrence.id',
      'reason',
    ]);
  }
  expect(received.every((r) => r.auth === 'Bearer synthetic-server')).toBe(true);
  expect(JSON.stringify(records)).not.toMatch(/private|cookie|digest|session|traceId/);
});
it('bounds hook waiting during outage and leaves original handling intact', async () => {
  const received = await enable(() => {});
  const start = performance.now();
  await expect(
    instrumentation.onRequestError(new Error('private'), request, context('route'))
  ).resolves.toBeUndefined();
  expect(performance.now() - start).toBeLessThan(2600);
  expect(received).toHaveLength(1);
});
it('drops Edge and disabled startup/errors without touching a receiver', async () => {
  const received = await enable((res) => res.end());
  vi.stubEnv('NEXT_RUNTIME', 'edge');
  await instrumentation.register();
  await instrumentation.onRequestError(null, request, context('route'));
  vi.stubEnv('NEXT_RUNTIME', 'nodejs');
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'false');
  await instrumentation.register();
  await instrumentation.onRequestError(null, request, context('route'));
  expect(received).toHaveLength(0);
});
it('registers one sampled native Next provider without replacing the log pipeline', async () => {
  await enable((res) => res.end());
  await instrumentation.register();
  await instrumentation.register();
  const { trace, SpanKind } = await import('@opentelemetry/api');
  const tracer = trace.getTracer('next.js', '16.4.2');
  let recording = 0;
  for (let i = 0; i < 1000; i++) {
    const span = tracer.startSpan('GET private-path', {
      kind: SpanKind.SERVER,
      attributes: { 'next.span_type': 'BaseServer.handleRequest', 'http.method': 'GET' },
    });
    if (span.isRecording()) recording++;
    span.end();
  }
  // A wide deterministic-probability envelope catches absent/always-on providers.
  expect(recording).toBeGreaterThan(20);
  expect(recording).toBeLessThan(200);
});
it('refuses ambient trace exporter headers before constructing any pipeline', async () => {
  const received = await enable((res) => res.end());
  vi.stubEnv('OTEL_EXPORTER_OTLP_TRACES_HEADERS', 'private=sentinel');
  expect(reporting.telemetryEnabled()).toBe(false);
  await instrumentation.register();
  await reporting.sendServerCheck();
  await reporting.flushTelemetry();
  expect(received).toHaveLength(0);
});
