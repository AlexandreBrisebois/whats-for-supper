import { observation } from '@/test/telemetry';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeOpening } from './opening';
import { reportBrowserObservation } from './actions';
import {
  telemetryEnabled,
  sendBrowserCheck,
  sendBrowserError,
  sendServerCheck,
  sendServerError,
  sendBrowserObservation,
  shutdownTelemetry,
} from './server';
import type { LogRecord } from '@opentelemetry/api';

const { emit, flush, shutdown, factory } = vi.hoisted(() => {
  const emit = vi.fn<(producer: string, record: LogRecord) => void>();
  const flush = vi.fn().mockResolvedValue(undefined);
  const shutdown = vi.fn().mockResolvedValue(undefined);
  const factory = vi.fn((_config: unknown, _current: unknown) => ({ emit, flush, shutdown }));
  return { emit, flush, shutdown, factory };
});
vi.mock('./sdk', () => ({ createLogDelivery: factory }));
// Adapter tests isolate SDK delivery; native capture is covered by native.test.ts.
vi.mock('./native', () => ({
  createNativeDelivery: () => ({ register() {}, flush: async () => {}, shutdown: async () => {} }),
}));
vi.mock('next/server', () => ({ after: (callback: () => Promise<void>) => callback() }));
let epoch = Date.now();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime((epoch += 60001));
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', 'https://sentrame.example');
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'browser-test');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'server-test');
});
afterEach(async () => {
  await shutdownTelemetry();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
describe('runtime opt-in before SDK admission', () => {
  it.each(['', 'false', '1', 'yes', 'TRUE'])('fails closed for flag %s', async (flag) => {
    vi.stubEnv('WFS_TELEMETRY_ENABLED', flag);
    expect(telemetryEnabled()).toBe(false);
    await sendBrowserCheck();
    await sendServerCheck();
    expect(factory).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
  it.each([
    'https://user:secret@example.com',
    'https://example.com/private',
    'https://example.com?token=x',
    'https://example.com/#private',
    'ftp://example.com',
    'http://example.com',
    'not a URL',
    '',
  ])('rejects destination %s', async (base) => {
    vi.stubEnv('SENTRAME_OTLP_BASE', base);
    expect(telemetryEnabled()).toBe(false);
    await sendBrowserObservation(observation());
    expect(emit).not.toHaveBeenCalled();
  });
  it.each([
    ['SENTRAME_BROWSER_TOKEN', ''],
    ['SENTRAME_SERVER_TOKEN', ''],
    ['SENTRAME_BROWSER_TOKEN', 'server-test'],
    ['SENTRAME_BROWSER_TOKEN', 'browser\ttest'],
    ['SENTRAME_SERVER_TOKEN', 'server\u0001test'],
    ['SENTRAME_BROWSER_TOKEN', 'browser\u0100test'],
  ])('rejects invalid credential %#', async (key, value) => {
    vi.stubEnv(key, value);
    expect(telemetryEnabled()).toBe(false);
    await sendBrowserCheck();
    await sendServerCheck();
    expect(emit).not.toHaveBeenCalled();
  });
  it('rechecks opt-out without buffering for later enablement', async () => {
    vi.stubEnv('WFS_TELEMETRY_ENABLED', 'false');
    await sendBrowserObservation(observation());
    expect(factory).not.toHaveBeenCalled();
    vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
    await sendBrowserCheck();
    expect(emit).toHaveBeenCalledOnce();
    vi.stubEnv('WFS_TELEMETRY_ENABLED', 'false');
    await sendServerCheck();
    expect(emit).toHaveBeenCalledOnce();
  });
  it.each([
    'OTEL_EXPORTER_OTLP_HEADERS',
    'OTEL_EXPORTER_OTLP_LOGS_HEADERS',
    'OTEL_EXPORTER_OTLP_TRACES_HEADERS',
  ])(
    'refuses ambient header enrichment from %s instead of merging it into selected export',
    async (key) => {
      vi.stubEnv(key, 'x-private=private-sentinel');
      expect(telemetryEnabled()).toBe(false);
      await sendBrowserCheck();
      await sendServerCheck();
      expect(factory).not.toHaveBeenCalled();
    }
  );
});
it.each([' 1.4.2-beta.1 ', '', '   ', undefined])(
  'uses server version %s and independent producer authority',
  async (version) => {
    vi.stubEnv('WFS_VERSION', version);
    await sendBrowserCheck();
    await sendServerCheck();
    expect(factory).toHaveBeenCalledOnce();
    expect(factory.mock.calls[0][0]).toMatchObject({
      base: 'https://sentrame.example',
      browser: 'browser-test',
      server: 'server-test',
      version: version?.trim() || 'unknown',
    });
    expect(emit.mock.calls.map(([producer]) => producer)).toEqual(['browser', 'server']);
    for (const [, record] of emit.mock.calls) {
      expect(record.eventName).toBe('pwa.telemetry.check');
      expect(record.attributes).toEqual({});
      expect(record.severityNumber).toBe(9);
    }
  }
);
it('preserves the opening clock, fixed vocabulary and exact document context', async () => {
  const input = { ...observation('search'), timestamp: Date.now() - 1000 };
  const observed = Date.now();
  await sendBrowserObservation(input, observed);
  expect(emit).toHaveBeenCalledWith('browser', {
    eventName: input.eventName,
    timestamp: input.timestamp,
    observedTimestamp: observed,
    severityNumber: 9,
    attributes: {
      'stage.name': 'search',
      'event.id': input.eventId,
      'session.id': input.sessionId,
      'tab.id': input.tabId,
      'source.sequence': input.sequence,
    },
  });
  expect(flush).not.toHaveBeenCalled();
});
it('forwards browser attempts to the SDK admission owner without rearming document observations', async () => {
  for (let i = 0; i < 100; i++) await sendBrowserObservation(observation());
  await sendBrowserCheck();
  expect(emit).toHaveBeenCalledTimes(101);
  const owner = document.implementation.createHTMLDocument();
  Object.defineProperty(owner, 'visibilityState', { value: 'visible' });
  const submit = vi.fn(reportBrowserObservation);
  observeOpening(owner, true, '/recipes', submit);
  await Promise.resolve();
  observeOpening(owner, true, '/home', submit);
  observeOpening(owner, true, '/recipes', submit);
  await Promise.resolve();
  expect(submit).toHaveBeenCalledTimes(4);
  expect(emit).toHaveBeenCalledTimes(105);
  await sendServerCheck();
  expect(emit.mock.calls[105][0]).toBe('server');
  vi.setSystemTime(Date.now() + 60001);
  await sendBrowserObservation(observation('capture'));
  expect(emit).toHaveBeenCalledTimes(107);
});
it('forwards independent producer/error categories and occurrence snapshots to SDK admission', async () => {
  const input = {
    reason: 'browser.rejection' as const,
    eventId: crypto.randomUUID(),
    occurrenceId: crypto.randomUUID(),
    timestamp: Date.now() - 1000,
  };
  const observed = Date.now();
  for (let i = 0; i < 25; i++) await sendBrowserError(input, observed);
  expect(emit).toHaveBeenCalledTimes(25);
  expect(emit.mock.calls[0]).toEqual([
    'browser',
    {
      timestamp: input.timestamp,
      observedTimestamp: observed,
      eventName: 'pwa.browser.error',
      severityNumber: 17,
      attributes: {
        reason: input.reason,
        'event.id': input.eventId,
        'exception.occurrence.id': input.occurrenceId,
      },
    },
  ]);
  for (let i = 0; i < 105; i++) await sendBrowserCheck();
  expect(emit).toHaveBeenCalledTimes(130);
  for (let i = 0; i < 105; i++) await sendServerCheck();
  expect(emit).toHaveBeenCalledTimes(235);
  for (let i = 0; i < 25; i++) await sendServerError('route');
  expect(emit).toHaveBeenCalledTimes(260);
  vi.setSystemTime(Date.now() + 60001);
  await sendBrowserError(input, observed);
  expect(emit).toHaveBeenCalledTimes(261);
});
it('contains SDK admission and hook-flush failures without a telemetry observation', async () => {
  emit.mockImplementationOnce(() => {
    throw Error('private-sdk');
  });
  await expect(sendServerCheck()).resolves.toBeUndefined();
  flush.mockRejectedValueOnce(Error('private-flush'));
  await expect(sendServerError('render')).resolves.toBeUndefined();
  expect(emit).toHaveBeenCalledTimes(2);
});
