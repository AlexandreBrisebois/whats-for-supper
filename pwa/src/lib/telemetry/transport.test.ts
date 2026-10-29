import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, it, vi } from 'vitest';
import { sendServerCheck } from './server';
import { reportBrowserTelemetryCheck } from './actions';

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
