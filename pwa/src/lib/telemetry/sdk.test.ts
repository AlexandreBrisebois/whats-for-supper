import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, it, vi } from 'vitest';
import { decodeLogs, logAttributes } from '@/test/otlp';
import { observation } from '@/test/telemetry';
import { createLogDelivery } from './sdk';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { logs, ROOT_CONTEXT, trace } from '@opentelemetry/api';

let receiver: Server | undefined;
let delivery: ReturnType<typeof createLogDelivery> | undefined;
afterEach(async () => {
  receiver?.closeAllConnections();
  if (receiver) await new Promise<void>((resolve) => receiver!.close(() => resolve()));
  const { shutdownTelemetry } = await import('./server');
  await shutdownTelemetry();
  await delivery?.shutdown();
  delivery = undefined;
  receiver = undefined;
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});
function enable(port: number) {
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', `http://127.0.0.1:${port}`);
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'synthetic-browser');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'synthetic-server');
  vi.stubEnv('WFS_VERSION', '  sdk-test  ');
}
it('exports actual protobuf with original clocks, browser authority and no ambient context', async () => {
  const received: { bytes: Buffer; type?: string; auth?: string }[] = [];
  receiver = createServer(async (req, res) => {
    const parts: Buffer[] = [];
    for await (const chunk of req) parts.push(chunk);
    received.push({
      bytes: Buffer.concat(parts),
      type: req.headers['content-type'],
      auth: req.headers.authorization,
    });
    res.end();
  });
  await new Promise<void>((resolve) => receiver!.listen(0, '127.0.0.1', resolve));
  enable((receiver.address() as AddressInfo).port);
  const { sendBrowserObservation } = await import('./server');
  const now = Date.now();
  const input = { ...observation('search'), timestamp: now - 1000 };
  await sendBrowserObservation(input, now);
  await vi.waitFor(() => expect(received).toHaveLength(1), { timeout: 3000 });
  expect(received[0].type).toBe('application/x-protobuf');
  expect(received[0].auth).toBe('Bearer synthetic-browser');
  const resource = decodeLogs(received[0].bytes).resourceLogs[0];
  expect(logAttributes(resource.resource)).toEqual({
    'service.name': 'wfs-pwa-browser',
    'service.version': 'sdk-test',
  });
  const record = resource.scopeLogs[0].logRecords[0];
  expect(record).toMatchObject({
    eventName: input.eventName,
    severityNumber: 9,
    timeUnixNano: String(BigInt(input.timestamp) * 1000000n),
    observedTimeUnixNano: String(BigInt(now) * 1000000n),
  });
  expect(record.traceId).toBeUndefined();
  expect(record.spanId).toBeUndefined();
  expect(logAttributes(record)).toMatchObject({
    'event.id': input.eventId,
    'stage.name': 'search',
    'source.sequence': String(input.sequence),
  });
});
it('returns from ordinary admission while the receiver remains pending', async () => {
  receiver = createServer(async (req, _res) => {
    for await (const _chunk of req) {
      /* synthetic body */
    }
  });
  await new Promise<void>((resolve) => receiver!.listen(0, '127.0.0.1', resolve));
  enable((receiver.address() as AddressInfo).port);
  const { sendServerCheck } = await import('./server');
  let settled = false;
  const sending = sendServerCheck().then(() => {
    settled = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 25));
  expect(settled).toBe(true);
  await sending;
});

it('minimizes names/body/attributes/context before the standard queue, including global logger calls', async () => {
  receiver = createServer(async (req, res) => {
    for await (const _chunk of req) {
      /* drain */
    }
    res.end();
  });
  await new Promise<void>((resolve) => receiver!.listen(0, '127.0.0.1', resolve));
  const config = {
    base: `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`,
    browser: 'synthetic-browser',
    server: 'synthetic-server',
    version: 'sdk-test',
  };
  const queued: string[] = [];
  const original = BatchLogRecordProcessor.prototype.onEmit;
  vi.spyOn(BatchLogRecordProcessor.prototype, 'onEmit').mockImplementation(function (
    this: BatchLogRecordProcessor,
    record
  ) {
    queued.push(
      JSON.stringify({
        body: record.body,
        attributes: record.attributes,
        span: record.spanContext,
        resource: record.resource.attributes,
        scope: record.instrumentationScope,
      })
    );
    return original.call(this, record);
  });
  delivery = createLogDelivery(config, () => config);
  const foreign = trace.setSpanContext(ROOT_CONTEXT, {
    traceId: '1'.repeat(32),
    spanId: '2'.repeat(16),
    traceFlags: 1,
  });
  logs.getLogger('wfs.anonymous').emit({
    eventName: 'pwa.server.error',
    context: foreign,
    body: 'private-message-sentinel',
    attributes: {
      reason: 'server.route',
      'event.id': crypto.randomUUID(),
      'exception.occurrence.id': crypto.randomUUID(),
      url: 'private-url-sentinel',
      nested: { content: 'private-content-sentinel' },
    },
  });
  logs
    .getLogger('wfs.anonymous')
    .emit({ eventName: 'private-dynamic-event', body: 'private-event-sentinel' });
  logs
    .getLogger('wfs.anonymous', 'private-scope-version')
    .emit({ eventName: 'pwa.telemetry.check' });
  expect(queued).toHaveLength(1);
  expect(queued[0]).not.toMatch(/private-|111111|222222|host.name|process.pid/);
  expect(queued[0]).toContain('WFS unexpected error observed');
  await delivery.flush();
});

it('shares pre-batch ordinary/error budgets across adapter and global emissions, with independent producers and minute reset', async () => {
  const received: { auth?: string; bytes: Buffer }[] = [];
  receiver = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    received.push({ auth: req.headers.authorization, bytes: Buffer.concat(chunks) });
    res.end();
  });
  await new Promise<void>((resolve) => receiver!.listen(0, '127.0.0.1', resolve));
  enable((receiver.address() as AddressInfo).port);
  const reporting = await import('./server');
  reporting.initializeTelemetry();
  const started = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(started + 59_000);
  const queued = vi.spyOn(BatchLogRecordProcessor.prototype, 'onEmit');
  const logger = logs.getLogger('wfs.anonymous');
  const error = () => ({
    eventName: 'pwa.server.error',
    attributes: {
      reason: 'server.route',
      'event.id': crypto.randomUUID(),
      'exception.occurrence.id': crypto.randomUUID(),
    },
  });
  // Invalid records do not consume either admission budget.
  for (let i = 0; i < 130; i++) logger.emit({ eventName: 'private-event' });
  for (let i = 0; i < 50; i++) {
    logger.emit({ eventName: 'pwa.telemetry.check' });
    await reporting.sendServerCheck();
  }
  for (let i = 0; i < 30; i++) logger.emit({ eventName: 'pwa.telemetry.check' });
  expect(queued).toHaveBeenCalledTimes(100);
  // Direct standard API calls and the typed owner share the same error budget.
  for (let i = 0; i < 10; i++) logger.emit(error());
  for (let i = 0; i < 15; i++) await reporting.sendServerError('route');
  for (let i = 0; i < 30; i++) logger.emit(error());
  expect(queued).toHaveBeenCalledTimes(120);
  for (let i = 0; i < 130; i++) await reporting.sendBrowserCheck();
  for (let i = 0; i < 30; i++)
    await reporting.sendBrowserError({
      reason: 'browser.script',
      eventId: crypto.randomUUID(),
      occurrenceId: crypto.randomUUID(),
      timestamp: Date.now(),
    });
  expect(queued).toHaveBeenCalledTimes(240);
  await reporting.flushTelemetry();
  const count = (auth: string, name: string) =>
    received
      .filter((batch) => batch.auth === `Bearer synthetic-${auth}`)
      .flatMap((batch) => decodeLogs(batch.bytes).resourceLogs)
      .flatMap((resource) => resource.scopeLogs)
      .flatMap((scope) => scope.logRecords)
      .filter((record) => record.eventName === name).length;
  expect(count('server', 'pwa.telemetry.check')).toBe(100);
  expect(count('server', 'pwa.server.error')).toBe(20);
  expect(count('browser', 'pwa.telemetry.check')).toBe(100);
  expect(count('browser', 'pwa.browser.error')).toBe(20);
  // Startup idle time must not shorten the first admitted burst's window.
  clock.mockReturnValue(started + 60_001);
  logger.emit({ eventName: 'pwa.telemetry.check' });
  logger.emit(error());
  await reporting.sendBrowserCheck();
  expect(queued).toHaveBeenCalledTimes(240);
  clock.mockReturnValue(started + 119_001);
  logger.emit({ eventName: 'pwa.telemetry.check' });
  logger.emit(error());
  await reporting.sendBrowserCheck();
  expect(queued).toHaveBeenCalledTimes(243);
  await reporting.flushTelemetry();
  expect(count('server', 'pwa.telemetry.check')).toBe(101);
  expect(count('server', 'pwa.server.error')).toBe(21);
  expect(count('browser', 'pwa.telemetry.check')).toBe(101);
});

it('keeps at most 256 waiting records plus one 64-record batch under actual SDK backpressure', async () => {
  const received: Buffer[] = [];
  let release: (() => void) | undefined;
  receiver = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    received.push(Buffer.concat(chunks));
    if (received.length === 1) release = () => res.end();
    else res.end();
  });
  await new Promise<void>((resolve) => receiver!.listen(0, '127.0.0.1', resolve));
  const config = {
    base: `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`,
    browser: 'synthetic-browser',
    server: 'synthetic-server',
    version: 'sdk-test',
  };
  delivery = createLogDelivery(config, () => config);
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now');
  for (let i = 0; i < 1000; i++) {
    // Advance admission windows without releasing the actual stalled SDK batch.
    clock.mockReturnValue(now + Math.floor(i / 100) * 60_001);
    delivery.emit('browser', {
      eventName: 'pwa.screen.presented',
      timestamp: Date.now(),
      attributes: { 'event.id': crypto.randomUUID(), 'stage.name': 'search' },
    });
  }
  clock.mockRestore();
  await vi.waitFor(() => expect(received).toHaveLength(1));
  release!();
  await delivery.flush();
  const counts = received.map(
    (bytes) =>
      decodeLogs(bytes).resourceLogs.flatMap((resource) =>
        resource.scopeLogs.flatMap((scope) => scope.logRecords)
      ).length
  );
  expect(counts).toEqual([64, 64, 64, 64, 64]);
});

it('projects four browser issue results before standard batching with fixed body and no server authority', async () => {
  const queued: Array<{
    name?: string;
    body: unknown;
    attributes: unknown;
    spanContext: unknown;
    severity: unknown;
  }> = [];
  vi.spyOn(BatchLogRecordProcessor.prototype, 'onEmit').mockImplementation((record) => {
    queued.push({
      name: record.eventName,
      body: record.body,
      attributes: { ...record.attributes },
      spanContext: record.spanContext,
      severity: record.severityNumber,
    });
  });
  const config = {
    base: 'http://127.0.0.1:1',
    browser: 'synthetic-browser',
    server: 'synthetic-server',
    version: 'sdk-test',
  };
  delivery = createLogDelivery(config, () => config);
  const now = Date.now();
  const eventId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const tabId = crypto.randomUUID();
  const attrs = {
    'event.id': eventId,
    'stage.name': 'search',
    'session.id': sessionId,
    'tab.id': tabId,
    'source.sequence': 9,
    recipeId: 'private-recipe',
    importId: 'private-import',
    note: 'private-note',
    'exception.message': 'private-error',
    'exception.occurrence.id': crypto.randomUUID(),
    reason: 'saved_manual',
  };
  for (const reason of [
    'saved_manual',
    'processing_acknowledged',
    'saved_launch_failed',
    'unconfirmed',
  ]) {
    delivery.emit('browser', {
      eventName: 'pwa.recipe_issue.save_result',
      timestamp: now,
      observedTimestamp: now + 1000,
      body: 'private-body',
      severityNumber: 17,
      attributes: { ...attrs, reason },
    });
  }
  expect(queued).toHaveLength(4);
  expect(queued.map((e) => e.attributes)).toEqual(
    ['saved_manual', 'processing_acknowledged', 'saved_launch_failed', 'unconfirmed'].map(
      (reason) => ({
        'event.id': eventId,
        'stage.name': 'search',
        'session.id': sessionId,
        'tab.id': tabId,
        'source.sequence': 9,
        reason,
      })
    )
  );
  for (const event of queued) {
    expect(event.body).toBe('WFS recipe issue result observed');
    expect(event.severity).toBe(9);
    expect(event.spanContext).toBeUndefined();
  }
  expect(JSON.stringify(queued)).not.toContain('private');
  for (const attributes of [
    { ...attrs, reason: 'completed' },
    { ...attrs, reason: undefined },
    { ...attrs, 'stage.name': 'recipe.issue' },
  ])
    delivery.emit('browser', {
      eventName: 'pwa.recipe_issue.save_result',
      timestamp: now,
      attributes,
    });
  delivery.emit('server', {
    eventName: 'pwa.recipe_issue.save_result',
    timestamp: now,
    attributes: attrs,
  });
  for (const key of ['session.id', 'tab.id', 'source.sequence']) {
    const incomplete: Record<string, string | number> = { ...attrs };
    delete incomplete[key];
    delivery.emit('browser', {
      eventName: 'pwa.recipe_issue.save_result',
      timestamp: now,
      attributes: incomplete,
    });
  }
  expect(queued).toHaveLength(4);
});
