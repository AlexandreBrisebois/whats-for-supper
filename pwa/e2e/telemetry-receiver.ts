import { expect, type TestInfo } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

type Snapshot = {
  evidence: Array<{
    name: string;
    source: string;
    signal: string;
    service: string;
    version: string;
    scope: string;
    tab: string;
    record: string;
    sequence: number;
    time: string;
    observed: string;
    attrs: Record<string, string>;
  }>;
  model: {
    computation: string;
    journeys: Array<{ scope: string; path: string[]; status: string }>;
  };
  activeDefinition: unknown;
};

// Opt-in actual receiver fixture. The binary is built by the caller from the selected
// local Sentrame tree. Only this fixture's fresh directory, process and app are mutated.
export async function disposableTelemetryReceiver(binary: string, info: TestInfo) {
  const root = await mkdtemp(path.join(tmpdir(), 'wfs-navigation-receiver-'));
  const portOwner = createServer();
  await new Promise<void>((resolve) => portOwner.listen(0, '127.0.0.1', resolve));
  const port = (portOwner.address() as AddressInfo).port;
  await new Promise<void>((resolve) => portOwner.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const passphrase = `synthetic-${randomUUID()}`;
  let child: ChildProcess | undefined;
  let cookie = '';
  let csrf = '';
  const stop = async () => {
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise<void>((resolve) => child!.once('exit', () => resolve()));
    }
  };
  const request = async (route: string, body?: unknown) => {
    const response = await fetch(origin + route, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Cookie: cookie,
        Origin: origin,
        'X-CSRF-Token': csrf,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    expect(response.status, `receiver ${route}`).toBe(200);
    if (route === '/api/login') cookie = response.headers.get('set-cookie')!.split(';')[0];
    return response.json();
  };
  const start = async () => {
    child = spawn(binary, [], {
      cwd: root,
      env: {
        ...process.env,
        SENTRAME_DB: path.join(root, 'telemetry.db'),
        SENTRAME_ORIGIN: origin,
        SENTRAME_ADDR: `127.0.0.1:${port}`,
        SENTRAME_PASSPHRASE: passphrase,
      },
      stdio: 'ignore',
    });
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(origin + '/api/session')).status;
          } catch {
            return 0;
          }
        },
        { timeout: 15_000 }
      )
      .toBe(401);
    const session = await request('/api/login', { passphrase });
    csrf = session.csrf;
  };
  try {
    await start();
    const app = await request('/api/apps', { name: 'Disposable WFS navigation qualification' });
    const base = `/api/apps/${app.id}`;
    const tokens: { browser: string; server: string } = await request(base + '/connection');
    const mapping = {
      source: 'browser',
      service: 'wfs-pwa-browser',
      signal: 'logs',
      carrier: 'log',
      kind: 'step',
      timing: 'none',
    };
    const home = {
      ...mapping,
      event: 'pwa.screen.presented',
      step: 'Home',
      key: 'stage.name',
      value: 'home',
    };
    const search = {
      ...mapping,
      event: 'pwa.screen.presented',
      step: 'Search',
      key: 'stage.name',
      value: 'search',
    };
    const definition = await request(base + '/definitions', {
      goal: 'pwa.screen.presented',
      goalSelector: search,
      mappings: [
        { ...mapping, event: 'pwa.app.opened', step: 'App opened', key: '', value: '' },
        home,
        search,
        { ...home, step: 'Planner', value: 'planner' },
        { ...home, step: 'Grocery', value: 'planner.grocery' },
        {
          ...mapping,
          event: 'pwa.surface.opened',
          kind: 'activity',
          step: 'Grocery companion opened',
          key: 'stage.name',
          value: 'planner.grocery',
        },
        {
          ...mapping,
          event: 'pwa.surface.closed',
          kind: 'activity',
          step: 'Grocery companion closed',
          key: 'stage.name',
          value: 'planner.grocery',
        },
      ],
    });
    expect((await fetch(origin + base + '/snapshot')).status).toBe(401);
    const snapshot = async (): Promise<Snapshot> => request(base + '/snapshot');
    return {
      origin,
      tokens,
      async qualify(wires: string[]) {
        await expect.poll(async () => (await snapshot()).evidence.length).toBe(wires.length);
        const before = await snapshot();
        for (const wire of wires) {
          const resource = JSON.parse(wire).resourceLogs[0];
          const record = resource.scopeLogs[0].logRecords[0];
          const attr = Object.fromEntries(
            record.attributes.map(
              (a: { key: string; value: { stringValue?: string; intValue?: string } }) => [
                a.key,
                a.value.stringValue ?? a.value.intValue,
              ]
            )
          );
          const retained = before.evidence.find((e) => e.record === attr['event.id']);
          expect(retained).toMatchObject({
            name: record.eventName,
            source: 'browser',
            signal: 'logs',
            service: 'wfs-pwa-browser',
            version: '1.4.2-test.opening',
            scope: attr['session.id'],
            tab: attr['tab.id'],
            sequence: Number(attr['source.sequence']),
            time: record.timeUnixNano,
            observed: record.observedTimeUnixNano,
            attrs: { 'stage.name': attr['stage.name'] },
          });
        }
        const firstRecord = JSON.parse(wires[0]).resourceLogs[0].scopeLogs[0].logRecords[0];
        const scope = firstRecord.attributes.find((a: { key: string }) => a.key === 'session.id')
          .value.stringValue;
        const journeys = before.model.journeys.filter((j) => j.scope === scope);
        expect(journeys.map((j) => j.path)).toEqual([
          ['App opened', 'Home', 'Search'],
          ['Home', 'Planner', 'Grocery', 'Planner', 'Grocery', 'Planner', 'Home'],
        ]);
        // Raw protected receipt is checked independently of configured graph steps.
        const retainedStream = before.evidence
          .filter((e) => e.scope === scope)
          .sort((a, b) => a.sequence - b.sequence);
        expect(retainedStream.map((e) => e.sequence)).toEqual(
          Array.from({ length: 12 }, (_, i) => i + 1)
        );
        expect(new Set(retainedStream.map((e) => e.tab)).size).toBe(1);
        expect(new Set(retainedStream.map((e) => e.record)).size).toBe(12);
        expect(retainedStream.map((e) => [e.name, e.attrs['stage.name']])).toEqual([
          ['pwa.app.opened', 'home'],
          ['pwa.screen.presented', 'home'],
          ['pwa.screen.presented', 'search'],
          ['pwa.screen.presented', 'home'],
          ['pwa.screen.presented', 'planner'],
          ['pwa.screen.presented', 'planner.grocery'],
          ['pwa.screen.presented', 'planner'],
          ['pwa.surface.opened', 'planner.grocery'],
          ['pwa.surface.closed', 'planner.grocery'],
          ['pwa.screen.presented', 'planner.grocery'],
          ['pwa.screen.presented', 'planner'],
          ['pwa.screen.presented', 'home'],
        ]);
        expect(journeys[0].status).toBe('completed');
        const replay = async () => {
          for (const wire of wires) {
            const result = await fetch(origin + '/v1/logs', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokens.browser}`,
              },
              body: wire,
            });
            expect(result.status).toBe(200);
            await result.text();
          }
          const after = await snapshot();
          expect(after.evidence).toEqual(before.evidence);
          expect(after.model.journeys).toEqual(before.model.journeys);
        };
        await replay();
        await stop();
        await start(); // same owned registry/storage, fresh owner session
        expect((await snapshot()).evidence).toEqual(before.evidence);
        await replay();
        const artifact = info.outputPath('receiver-qualification.json');
        await writeFile(
          artifact,
          JSON.stringify(
            {
              binarySha256: createHash('sha256')
                .update(await readFile(binary))
                .digest('hex'),
              definition,
              before,
              after: await snapshot(),
              exactWireSha256: wires.map((w) => createHash('sha256').update(w).digest('hex')),
            },
            null,
            2
          )
        );
        await info.attach('durable-receipt-and-separate-derivation', {
          path: artifact,
          contentType: 'application/json',
        });
      },
      async close() {
        await stop();
        await rm(root, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await stop();
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
