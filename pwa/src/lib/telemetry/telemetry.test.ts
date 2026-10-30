import { observation } from '@/test/telemetry';
// Transport assertions run deferred work inline; action scheduling is tested separately.
vi.mock('next/server', () => ({ after: (callback: () => Promise<void>) => callback() }));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportBrowserObservation } from './actions';
import { observeOpening } from './opening';
import {
  telemetryEnabled,
  sendBrowserCheck,
  sendServerCheck,
  sendBrowserObservation,
} from './server';

let epoch = Date.now();
const fetchMock = vi.fn().mockResolvedValue({ ok: true });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime((epoch += 60_001));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', 'https://sentrame.example');
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'browser-test');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'server-test');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('anonymous telemetry boundary', () => {
  it.each(['', 'false', '1', 'yes', 'TRUE'])(
    'does not export without explicit true (%s)',
    async (flag) => {
      vi.stubEnv('WFS_TELEMETRY_ENABLED', flag);
      expect(telemetryEnabled()).toBe(false);
      await sendBrowserCheck();
      await sendServerCheck();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );
  it.each([
    'https://user:secret@example.com',
    'https://example.com/private',
    'https://example.com?token=x',
    'ftp://example.com',
    'http://example.com',
    'not a URL',
  ])('fails closed for endpoint %s', (base) => {
    vi.stubEnv('SENTRAME_OTLP_BASE', base);
    expect(telemetryEnabled()).toBe(false);
  });
  it('requires distinct nonempty credentials', () => {
    vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'server-test');
    expect(telemetryEnabled()).toBe(false);
    vi.stubEnv('SENTRAME_BROWSER_TOKEN', '');
    expect(telemetryEnabled()).toBe(false);
  });
  it('emits only a synthetic browser check with browser authority', async () => {
    expect(telemetryEnabled()).toBe(true);
    await sendBrowserCheck();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://sentrame.example/v1/logs');
    expect(options.headers.Authorization).toBe('Bearer browser-test');
    const wire = JSON.parse(options.body);
    const record = wire.resourceLogs[0].scopeLogs[0].logRecords[0];
    expect(record.eventName).toBe('pwa.telemetry.check');
    expect(record.attributes).toBeUndefined();
    expect(options.body).not.toMatch(/private|secret|email|url/);
    expect(options.redirect).toBe('error');
  });
  it('uses server authority without application data', async () => {
    await sendServerCheck();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const options = fetchMock.mock.calls[0][1];
    expect(options.headers.Authorization).toBe('Bearer server-test');
    expect(options.body).toContain('pwa.telemetry.check');
    expect(options.body).not.toContain('session.id');
  });
  it('drops receiver failures without affecting the caller', async () => {
    fetchMock.mockRejectedValueOnce(new Error('private upstream failure'));
    await expect(sendServerCheck()).resolves.toBeUndefined();
  });
  it('bounds concurrent export and preserves independent server capacity', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    fetchMock.mockImplementation(() => pending);
    const browserChecks = Array.from({ length: 6 }, () => sendBrowserCheck());
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const serverCheck = sendServerCheck();
    expect(fetchMock).toHaveBeenCalledTimes(5);
    release();
    await Promise.all([...browserChecks, serverCheck]);
    fetchMock.mockResolvedValue({ ok: true });
  });
  it('bounds repeated export attempts per minute', async () => {
    for (let i = 0; i < 130; i++) await sendBrowserCheck();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(120);
  });
});

it.each([
  ['WFS_TELEMETRY_ENABLED', 'false'],
  ['WFS_TELEMETRY_ENABLED', 'TRUE'],
  ['SENTRAME_OTLP_BASE', ''],
  ['SENTRAME_OTLP_BASE', 'https://example.com/#private'],
  ['SENTRAME_OTLP_BASE', 'https://example.com/path'],
  ['SENTRAME_BROWSER_TOKEN', ''],
  ['SENTRAME_SERVER_TOKEN', ''],
  ['SENTRAME_BROWSER_TOKEN', 'server-test'],
  ['SENTRAME_BROWSER_TOKEN', 'browser\ttest'],
  ['SENTRAME_SERVER_TOKEN', 'server\u0001test'],
  ['SENTRAME_BROWSER_TOKEN', 'browser\u0100test'],
])('invalid runtime %s fails closed with zero intake', async (key, value) => {
  vi.stubEnv(key, value);
  expect(telemetryEnabled()).toBe(false);
  await sendBrowserObservation(observation('search'));
  await sendServerCheck();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('rechecks opt-out on each opening rather than caching enabled configuration', async () => {
  expect(telemetryEnabled()).toBe(true);
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'false');
  await sendBrowserObservation(observation('search'));
  expect(fetchMock).not.toHaveBeenCalled();
});

it('shares the exact 120/min browser budget across openings and checks, independently of server', async () => {
  for (let i = 0; i < 120; i++) await sendBrowserObservation(observation('search'));
  expect(fetchMock).toHaveBeenCalledTimes(120);
  await sendBrowserObservation(observation('home'));
  await sendBrowserCheck();
  expect(fetchMock).toHaveBeenCalledTimes(120);
  const owner = document.implementation.createHTMLDocument();
  Object.defineProperty(owner, 'visibilityState', { value: 'visible' });
  const submit = vi.fn(reportBrowserObservation);
  observeOpening(owner, true, '/recipes', submit);
  await Promise.resolve();
  observeOpening(owner, true, '/home', submit);
  observeOpening(owner, true, '/recipes', submit);
  expect(submit).toHaveBeenCalledTimes(4);
  expect(fetchMock).toHaveBeenCalledTimes(120);
  await sendServerCheck();
  expect(fetchMock).toHaveBeenCalledTimes(121);
  expect(fetchMock.mock.calls[120][1].headers.Authorization).toBe('Bearer server-test');
  vi.setSystemTime(Date.now() + 60_001);
  await sendBrowserObservation(observation('capture'));
  expect(fetchMock).toHaveBeenCalledTimes(122);
});

it.each([' 1.4.2-beta.1 ', '', '   ', undefined])(
  'uses deployment version %s on both producer resources, with an honest missing-version fallback',
  async (version) => {
    vi.stubEnv('WFS_VERSION', version);
    await sendBrowserCheck();
    await sendServerCheck();
    for (const [index, producer] of ['browser', 'server'].entries()) {
      const wire = JSON.parse(fetchMock.mock.calls[index][1].body);
      expect(wire.resourceLogs[0].resource.attributes).toEqual([
        { key: 'service.name', value: { stringValue: `wfs-pwa-${producer}` } },
        { key: 'service.version', value: { stringValue: version?.trim() || 'unknown' } },
      ]);
      expect(wire.resourceLogs[0].scopeLogs[0].logRecords[0].attributes).toBeUndefined();
    }
  }
);
