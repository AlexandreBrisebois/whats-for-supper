import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, it, vi } from 'vitest';
import { sendServerCheck } from './server';
import { reportBrowserAppOpened, reportBrowserTelemetryCheck } from './actions';
import { observeOpening } from './opening';

afterEach(() => vi.unstubAllEnvs());

it('delivers standard JSON logs through both producer entry points and stops after opt-out', async () => {
  const received: { authorization: string | undefined; path: string | undefined; body: string }[] =
    [];
  const receiver = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    received.push({ authorization: request.headers.authorization, path: request.url, body });
    response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
  });
  await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
  try {
    const port = (receiver.address() as AddressInfo).port;
    vi.stubEnv('WFS_VERSION', '1.4.2-test');
    vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
    vi.stubEnv('SENTRAME_OTLP_BASE', `http://127.0.0.1:${port}`);
    vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'synthetic-browser');
    vi.stubEnv('SENTRAME_SERVER_TOKEN', 'synthetic-server');
    await sendServerCheck();
    await reportBrowserTelemetryCheck();
    expect(received).toHaveLength(2);
    expect(received.map((item) => item.authorization)).toEqual([
      'Bearer synthetic-server',
      'Bearer synthetic-browser',
    ]);
    for (const [index, item] of received.entries()) {
      expect(item.path).toBe('/v1/logs');
      const resource = JSON.parse(item.body).resourceLogs[0];
      expect(resource.resource.attributes).toEqual([
        { key: 'service.name', value: { stringValue: `wfs-pwa-${index ? 'browser' : 'server'}` } },
        { key: 'service.version', value: { stringValue: '1.4.2-test' } },
      ]);
      expect(resource.scopeLogs[0].logRecords[0]).toEqual({
        timeUnixNano: expect.stringMatching(/^\d{19}$/),
        eventName: 'pwa.telemetry.check',
        severityNumber: 9,
        body: { stringValue: 'Synthetic telemetry integration check' },
      });
      expect(item.body).not.toMatch(/synthetic-browser|synthetic-server|session.id|cookie|http/);
    }
    vi.stubEnv('WFS_TELEMETRY_ENABLED', 'false');
    await sendServerCheck();
    await reportBrowserTelemetryCheck();
    expect(received).toHaveLength(2);
  } finally {
    receiver.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      receiver.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

it.each(['reject', 'redirect', 'timeout'] as const)(
  'contains real HTTP %s and never retries on navigation/resume',
  async (mode) => {
    const received: string[] = [];
    let redirected = 0;
    const receiver = createServer(async (request, response) => {
      if (request.url !== '/v1/logs') {
        redirected++;
        response.end();
        return;
      }
      let body = '';
      for await (const chunk of request) body += chunk;
      received.push(body);
      if (mode === 'reject') response.writeHead(503).end('private rejection');
      if (mode === 'redirect') response.writeHead(307, { Location: '/private-redirect' }).end();
      // Timeout deliberately leaves the response pending until the export aborts.
    });
    await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
    try {
      vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
      vi.stubEnv(
        'SENTRAME_OTLP_BASE',
        `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`
      );
      vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'synthetic-browser');
      vi.stubEnv('SENTRAME_SERVER_TOKEN', 'synthetic-server');
      const owner = document.implementation.createHTMLDocument();
      let visible = true;
      Object.defineProperty(owner, 'visibilityState', {
        get: () => (visible ? 'visible' : 'hidden'),
      });
      let completion: Promise<void> | undefined;
      const submit = vi.fn((input) => (completion = reportBrowserAppOpened(input)));
      const started = performance.now();
      observeOpening(owner, true, '/recipes', submit);
      expect(submit).toHaveBeenCalledTimes(1);
      await expect(completion).resolves.toBeUndefined();
      if (mode === 'timeout') {
        expect(performance.now() - started).toBeGreaterThanOrEqual(1800);
        expect(performance.now() - started).toBeLessThan(4000);
      }
      visible = false;
      observeOpening(owner, true, '/home', submit);
      visible = true;
      observeOpening(owner, true, '/home', submit);
      observeOpening(owner, true, '/recipes', submit);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(submit).toHaveBeenCalledTimes(1);
      expect(received).toHaveLength(1);
      expect(redirected).toBe(0);
    } finally {
      receiver.closeAllConnections();
      await new Promise<void>((resolve) => receiver.close(() => resolve()));
    }
  }
);

it('real concurrent opening saturation leaves server capacity and releases browser slots after failure', async () => {
  vi.resetModules();
  const actions = await import('./actions');
  const server = await import('./server');
  const received: string[] = [];
  const pending: import('node:http').ServerResponse[] = [];
  const receiver = createServer(async (request, response) => {
    for await (const _chunk of request) {
      /* Drain actual HTTP body. */
    }
    received.push(request.headers.authorization ?? '');
    if (request.headers.authorization === 'Bearer synthetic-server') response.end('{}');
    else pending.push(response);
  });
  await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
  try {
    vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
    vi.stubEnv(
      'SENTRAME_OTLP_BASE',
      `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`
    );
    vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'synthetic-browser');
    vi.stubEnv('SENTRAME_SERVER_TOKEN', 'synthetic-server');
    const openings = Array.from({ length: 8 }, () =>
      actions.reportBrowserAppOpened({ screen: 'search' })
    );
    await vi.waitFor(() => expect(pending).toHaveLength(4));
    await server.sendServerCheck();
    expect(received.filter((token) => token === 'Bearer synthetic-browser')).toHaveLength(4);
    expect(received.filter((token) => token === 'Bearer synthetic-server')).toHaveLength(1);
    for (const response of pending) response.writeHead(429).end();
    await Promise.all(openings);
    const next = actions.reportBrowserAppOpened({ screen: 'home' });
    await vi.waitFor(() => expect(pending).toHaveLength(5));
    pending[4].end('{}');
    await next;
    vi.stubEnv('WFS_TELEMETRY_ENABLED', 'false');
    await actions.reportBrowserAppOpened({ screen: 'capture' });
    expect(received).toHaveLength(6);
  } finally {
    receiver.closeAllConnections();
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
  }
});
