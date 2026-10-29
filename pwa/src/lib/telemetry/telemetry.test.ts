import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { telemetryEnabled, sendBrowserCheck, sendServerCheck } from './server';

const fetchMock = vi.fn().mockResolvedValue({ ok: true });

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', 'https://sentrame.example');
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'browser-test');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'server-test');
});
afterEach(() => {
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
