import { observation } from '@/test/telemetry';
import { decodeLogs, logAttributes, type WireLog } from '@/test/otlp';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

let receiver: Server | undefined;
let reporting: typeof import('./server');
const intervals: ReturnType<typeof setInterval>[] = [];
const bodies: Buffer[] = [];
const requests: IncomingMessage[] = [];
beforeEach(async () => {
  vi.resetModules();
  reporting = await import('./server');
});
afterEach(async () => {
  for (const interval of intervals.splice(0)) clearInterval(interval);
  receiver?.closeAllConnections();
  if (receiver) await new Promise<void>((resolve) => receiver!.close(() => resolve()));
  await reporting.shutdownTelemetry();
  receiver = undefined;
  bodies.length = 0;
  requests.length = 0;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
async function start(handler: (req: IncomingMessage, res: ServerResponse) => void) {
  receiver = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push(req);
    bodies.push(Buffer.concat(chunks));
    handler(req, res);
  });
  await new Promise<void>((resolve) => receiver!.listen(0, '127.0.0.1', resolve));
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`);
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'synthetic-browser');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'synthetic-server');
  vi.stubEnv('WFS_VERSION', '1.4.2-test');
}
const records = (body: Buffer): WireLog[] =>
  decodeLogs(body).resourceLogs.flatMap((r) => r.scopeLogs.flatMap((s) => s.logRecords));
it('batches browser/server records separately through actual SDK protobuf without compression', async () => {
  await start((_req, res) => res.end());
  for (let i = 0; i < 3; i++) {
    await reporting.sendBrowserCheck();
    await reporting.sendServerCheck();
  }
  expect(requests).toHaveLength(0);
  await reporting.flushTelemetry();
  expect(requests).toHaveLength(2);
  expect(new Set(requests.map((r) => r.headers.authorization))).toEqual(
    new Set(['Bearer synthetic-browser', 'Bearer synthetic-server'])
  );
  for (const [index, req] of requests.entries()) {
    expect(req.url).toBe('/v1/logs');
    expect(req.headers['content-type']).toBe('application/x-protobuf');
    expect(req.headers['content-encoding']).toBeUndefined();
    const resource = decodeLogs(bodies[index]).resourceLogs[0];
    expect(logAttributes(resource.resource)).toEqual({
      'service.name': `wfs-pwa-${req.headers.authorization!.endsWith('browser') ? 'browser' : 'server'}`,
      'service.version': '1.4.2-test',
    });
    expect(records(bodies[index])).toHaveLength(3);
    for (const record of records(bodies[index])) {
      expect(record).toMatchObject({
        eventName: 'pwa.telemetry.check',
        severityNumber: 9,
        body: { stringValue: 'Synthetic telemetry integration check' },
      });
      expect(record.traceId).toBeUndefined();
      expect(logAttributes(record)).toEqual({});
    }
  }
});
it('standard transient retry retransmits exactly the original protobuf and record clocks/identity', async () => {
  await start((_req, res) =>
    requests.length === 1 ? res.writeHead(503, { 'Retry-After': '0' }).end() : res.end()
  );
  const observed = Date.now(),
    input = { ...observation('search'), timestamp: observed - 1000 };
  await reporting.sendBrowserObservation(input, observed);
  await reporting.flushTelemetry();
  expect(requests).toHaveLength(2);
  expect(bodies[0].equals(bodies[1])).toBe(true);
  const record = records(bodies[1])[0];
  expect(record.timeUnixNano).toBe(String(BigInt(input.timestamp) * 1000000n));
  expect(record.observedTimeUnixNano).toBe(String(BigInt(observed) * 1000000n));
  expect(logAttributes(record)['event.id']).toBe(input.eventId);
});
it.each(['reject', 'redirect'] as const)(
  'contains terminal %s without a redirect, retry or private response export',
  async (mode) => {
    await start((_req, res) =>
      res
        .writeHead(mode === 'reject' ? 400 : 307, { Location: '/private-redirect' })
        .end('private-receiver-response')
    );
    const input = {
      reason: 'browser.script' as const,
      eventId: crypto.randomUUID(),
      occurrenceId: crypto.randomUUID(),
      timestamp: Date.now() - 1000,
    };
    await reporting.sendBrowserError(input);
    await reporting.flushTelemetry();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('/v1/logs');
    expect(records(bodies[0])[0]).toMatchObject({
      eventName: 'pwa.browser.error',
      severityNumber: 17,
    });
    expect(JSON.stringify(decodeLogs(bodies[0]))).not.toMatch(
      /private|synthetic-browser|synthetic-server/
    );
  }
);
it('rechecks opt-out at export entry, discarding queued records without replay on re-enable', async () => {
  await start((_req, res) => res.end());
  await reporting.sendBrowserObservation(observation());
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'false');
  await reporting.flushTelemetry();
  expect(requests).toHaveLength(0);
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  await reporting.flushTelemetry();
  expect(requests).toHaveLength(0);
});
it('keeps four transport slots occupied under streaming after caller timeout; later batches cannot evade them', async () => {
  await start((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/x-protobuf' });
    res.write(Buffer.from([0]));
    intervals.push(setInterval(() => res.write(Buffer.from([0])), 50));
  });
  const error = {
    eventId: crypto.randomUUID(),
    occurrenceId: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  await reporting.sendBrowserCheck();
  await reporting.sendServerCheck();
  await reporting.sendBrowserError({ ...error, reason: 'browser.script' });
  const hook = reporting.sendServerError('route');
  await vi.waitFor(() => expect(requests).toHaveLength(4), { timeout: 2500 });
  await hook;
  expect(requests).toHaveLength(4);
  for (let i = 0; i < 80; i++) {
    await reporting.sendBrowserCheck();
    await reporting.sendServerCheck();
  }
  await reporting.flushTelemetry();
  expect(requests).toHaveLength(4);
  // Continued activity outlives wait completion under option B; it is not cancellation.
  expect(intervals).toHaveLength(4);
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'false');
  await reporting.sendBrowserCheck();
  expect(requests).toHaveLength(4);
}, 12000);
it('ignores ambient destination/resource settings and never inherits compression', async () => {
  vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://127.0.0.1:1/private');
  vi.stubEnv('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT', 'http://127.0.0.1:1/private');
  vi.stubEnv('OTEL_EXPORTER_OTLP_COMPRESSION', 'gzip');
  vi.stubEnv('OTEL_RESOURCE_ATTRIBUTES', 'host.name=private-sentinel');
  await start((_req, res) => res.end());
  await reporting.sendBrowserCheck();
  await reporting.flushTelemetry();
  expect(requests).toHaveLength(1);
  expect(requests[0].headers['content-encoding']).toBeUndefined();
  expect(JSON.stringify(decodeLogs(bodies[0]))).not.toMatch(/private-sentinel/);
});

it('exports the exact new content names, fixed bodies and original reasons through the standard SDK', async () => {
  await start((_req, res) => res.end());
  const base = { ...observation('search'), screen: 'search' as const };
  for (const input of [
    { ...base, eventName: 'pwa.recipe_detail.presented' as const },
    { ...base, eventName: 'pwa.original.presented' as const, reason: 'image' as const },
    { ...base, eventName: 'pwa.original.requested' as const, reason: 'external' as const },
  ])
    await reporting.sendBrowserObservation(input);
  await reporting.flushTelemetry();
  const logs = bodies.flatMap(records);
  expect(
    logs.map((log) => [log.eventName, log.body?.stringValue, logAttributes(log).reason])
  ).toEqual([
    ['pwa.recipe_detail.presented', 'WFS presentation observed', undefined],
    ['pwa.original.presented', 'WFS original observation', 'image'],
    ['pwa.original.requested', 'WFS original observation', 'external'],
  ]);
  expect(requests.every((req) => req.headers.authorization === 'Bearer synthetic-browser')).toBe(
    true
  );
});
