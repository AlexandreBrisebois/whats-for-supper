import { encodeLogs } from '../src/test/otlp';
import type { CapturedLog } from './telemetry-wire';
import { expect, type Browser, type TestInfo } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

type Evidence = {
  record: string;
  name: string;
  source: string;
  signal: string;
  service: string;
  version: string;
  scope: string;
  tab: string;
  sequence: number;
  severity: number;
  time: string;
  observed: string;
  attrs: Record<string, string>;
};
type Journey = {
  scope: string;
  path: string[];
  status: string;
  evidence: Evidence[];
  lastMapped: string;
};
type Snapshot = { evidence: Evidence[]; model: { journeys: Journey[] }; activeDefinition: unknown };
const sha = (value: string | Buffer | CapturedLog) =>
  createHash('sha256')
    .update(typeof value === 'string' || Buffer.isBuffer(value) ? value : value.wire)
    .digest('hex');
const parse = (wire: CapturedLog) => {
  const resource = JSON.parse(wire.body).resourceLogs[0],
    record = resource.scopeLogs[0].logRecords[0];
  const attrs = Object.fromEntries(
    record.attributes.map(
      (a: { key: string; value: { stringValue?: string; intValue?: string } }) => [
        a.key,
        a.value.stringValue ?? a.value.intValue,
      ]
    )
  );
  return { record, attrs };
};

// Explicit caller-selected binary; only owned fresh apps/storage/processes are mutated.
export async function disposableErrorReceiver(binary: string, info: TestInfo) {
  const assets = process.env.WFS_ERROR_SENTRAME_ASSETS;
  if (!assets)
    throw new Error('Error UI acceptance requires explicit reviewed WFS_ERROR_SENTRAME_ASSETS');
  const root = await mkdtemp(path.join(tmpdir(), 'wfs-errors-receiver-'));
  const portOwner = createServer();
  await new Promise<void>((resolve) => portOwner.listen(0, '127.0.0.1', resolve));
  const port = (portOwner.address() as AddressInfo).port;
  await new Promise<void>((resolve) => portOwner.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`,
    passphrase = `synthetic-${randomUUID()}`;
  let child: ChildProcess | undefined,
    cookie = '',
    csrf = '';
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
    expect(response.status, route).toBe(200);
    if (route === '/api/login') cookie = response.headers.get('set-cookie')!.split(';')[0];
    return response.json();
  };
  const start = async () => {
    child = spawn(binary, [], {
      cwd: root,
      env: {
        ...process.env,
        SENTRAME_DB: path.join(root, 'errors.db'),
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
        { timeout: 15000 }
      )
      .toBe(401);
    csrf = (await request('/api/login', { passphrase })).csrf;
  };
  try {
    await mkdir(path.join(root, 'web'), { recursive: true });
    await cp(assets, path.join(root, 'web/dist'), { recursive: true });
    await start();
    console.info('error receiver: authenticated fresh storage');
    let app = await request('/api/apps', { name: 'Disposable standalone WFS diagnostics' });
    let base = `/api/apps/${app.id}`;
    const tokens: { browser: string; server: string } = await request(base + '/connection');
    let currentTokens = tokens;
    const snapshot = async (): Promise<Snapshot> => request(base + '/snapshot');
    const errors = async (): Promise<{ records: Evidence[] }> => request(base + '/errors');
    const assetFiles = await readdir(assets, { recursive: true, withFileTypes: true });
    const assetHashes: Record<string, string> = {};
    for (const file of assetFiles.filter((f) => f.isFile())) {
      const full = path.join(file.parentPath, file.name);
      assetHashes[path.relative(assets, full)] = sha(await readFile(full));
    }
    const evidence: Record<string, unknown> = {
      binarySha256: sha(await readFile(binary)),
      binaryPath: binary,
      assetsPath: assets,
      assetHashes,
    };
    const ui = async (
      browser: Browser,
      expected: number,
      linkedScope?: string,
      reason = 'browser.script'
    ) => {
      const context = await browser.newContext();
      context.setDefaultTimeout(10000);
      const page = await context.newPage();
      try {
        console.info('error receiver: checking diagnostic UI');
        await page.goto(origin + '/?app=' + app.id);
        console.info('error receiver: UI loaded');
        await page.getByLabel('Passphrase', { exact: true }).fill(passphrase);
        await page.getByRole('button', { name: 'Open workspace' }).click();
        await page.getByRole('button', { name: 'Workspace menu', exact: true }).click();
        await page.getByRole('button', { name: 'Errors & exceptions', exact: true }).click();
        await expect(
          page.getByRole('button', { name: 'Whole application', exact: true })
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.error-record')).toHaveCount(expected);
        await page.locator('.error-record > summary').first().click();
        await page.getByText('Retained diagnostic fields', { exact: true }).first().click();
        await expect(page.locator('.diagnostic-fields pre').first()).toContainText(reason);
        await expect(page.locator('.diagnostic-fields pre').first()).toContainText(
          'exception.occurrence.id'
        );
        if (linkedScope) {
          await expect(page.locator('.diagnostic-fields pre').first()).toContainText('home');
          await page.getByRole('button', { name: 'Explore related context', exact: true }).click();
          await expect(
            page.getByRole('button', { name: 'Clear selected visit: ' + linkedScope, exact: true })
          ).toBeVisible();
        }
        await page.screenshot({
          path: info.outputPath(linkedScope ? 'linked-errors.png' : 'standalone-errors.png'),
          fullPage: true,
        });
      } finally {
        await context.close();
      }
    };
    const checkWires = (wires: CapturedLog[], retained: Evidence[]) => {
      for (const wire of wires) {
        const { record, attrs } = parse(wire);
        const actual = retained.find((e) => e.record === attrs['event.id']);
        expect(actual).toMatchObject({
          name: record.eventName,
          source: record.eventName === 'pwa.server.error' ? 'server' : 'browser',
          signal: 'logs',
          service: record.eventName === 'pwa.server.error' ? 'wfs-pwa-server' : 'wfs-pwa-browser',
          version: '1.4.2-test.opening',
          time: record.timeUnixNano,
          observed: record.observedTimeUnixNano,
        });
        if (record.eventName === 'pwa.browser.error' || record.eventName === 'pwa.server.error')
          expect(actual).toMatchObject({
            severity: 17,
            attrs: {
              reason: attrs.reason,
              'exception.occurrence.id': attrs['exception.occurrence.id'],
            },
          });
        if (attrs['session.id'])
          expect(actual).toMatchObject({
            scope: attrs['session.id'],
            tab: attrs['tab.id'],
            sequence: Number(attrs['source.sequence']),
            attrs: { 'stage.name': attrs['stage.name'] },
          });
        else {
          expect(actual!.scope).toBe('');
          expect(actual!.tab).toBe('');
          expect(actual!.sequence).toBe(0);
        }
      }
    };
    const replayReopen = async (wires: CapturedLog[]) => {
      const before = await snapshot(),
        diagnostics = await errors();
      const replay = async () => {
        for (const wire of wires) {
          const response = await fetch(origin + '/v1/logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-protobuf',
              Authorization: `Bearer ${parse(wire).record.eventName === 'pwa.server.error' ? currentTokens.server : currentTokens.browser}`,
            },
            body: new Uint8Array(wire.wire),
          });
          expect(response.status).toBe(200);
          await response.text();
        }
        expect((await snapshot()).evidence).toEqual(before.evidence);
        expect((await snapshot()).model.journeys).toEqual(before.model.journeys);
        expect(await errors()).toEqual(diagnostics);
      };
      await replay();
      await stop();
      await start();
      expect((await snapshot()).evidence).toEqual(before.evidence);
      expect((await snapshot()).model.journeys).toEqual(before.model.journeys);
      expect(await errors()).toEqual(diagnostics);
      await replay();
      return { before, diagnostics, reopened: await snapshot(), wireSha256: wires.map(sha) };
    };
    return {
      origin,
      tokens,
      get currentTokens() {
        return currentTokens;
      },
      async qualifyStandalone(wires: CapturedLog[], browser: Browser) {
        expect((await fetch(origin + base + '/errors')).status).toBe(401);
        await expect.poll(async () => (await errors()).records.length).toBe(1);
        const before = await snapshot();
        checkWires(wires, (await errors()).records);
        expect(before.model.journeys).toHaveLength(0);
        // Default empty definition has neither mappings nor operational goal.
        expect(before.activeDefinition).toMatchObject({ goal: '', mappings: [] });
        evidence.standaloneDefinition = before.activeDefinition;
        console.info('error receiver: protected reads passed');
        await ui(browser, 1);
        evidence.standalone = await replayReopen(wires);
        app = await request('/api/apps', {
          name: 'Disposable synthetic reaching Search qualification',
        });
        base = `/api/apps/${app.id}`;
        currentTokens = await request(base + '/connection');
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
        const search = { ...home, step: 'Search', value: 'search' };
        const definition = {
          goal: 'pwa.screen.presented',
          goalSelector: search,
          mappings: [
            { ...mapping, event: 'pwa.app.opened', step: 'App opened', key: '', value: '' },
            home,
            search,
          ],
        };
        evidence.pathDefinition = await request(base + '/definitions', definition);
        evidence.definitionSha256 = sha(JSON.stringify(definition));
      },
      async assertActive() {
        await expect.poll(async () => (await errors()).records.length).toBe(1);
        const current = await snapshot();
        expect(current.model.journeys).toHaveLength(1);
        expect(current.model.journeys[0].status).toBe('active');
        expect(current.model.journeys[0].path).toEqual(['App opened', 'Home']);
        expect(current.model.journeys[0].evidence.some((e) => e.name === 'pwa.browser.error')).toBe(
          true
        );
        const home = current.model.journeys[0].evidence.find(
          (e) => e.name === 'pwa.screen.presented'
        )!;
        expect(current.model.journeys[0].lastMapped).toBe(home.time);
        evidence.afterError = current;
      },
      async qualifyPath(wires: CapturedLog[], browser: Browser) {
        await expect.poll(async () => (await snapshot()).evidence.length).toBe(4);
        const current = await snapshot();
        checkWires(wires, current.evidence);
        expect(current.model.journeys).toHaveLength(1);
        const journey = current.model.journeys[0];
        expect(journey.path).toEqual(['App opened', 'Home', 'Search']);
        expect(journey.status).toBe('completed');
        const errorId = parse(wires.find((w) => parse(w).record.eventName === 'pwa.browser.error')!)
          .attrs['event.id'];
        expect(journey.evidence.find((e) => e.record === errorId)?.name).toBe('pwa.browser.error');
        expect((await errors()).records.find((e) => e.record === errorId)?.scope).toBe(
          journey.scope
        );
        console.info('error receiver: protected reads passed');
        await ui(browser, 1, journey.scope);
        evidence.path = await replayReopen(wires);
        const artifact = info.outputPath('error-receiver-qualification.json');
        await writeFile(artifact, JSON.stringify(evidence, null, 2));
        await info.attach('independent-error-durable-and-derivation-cells', {
          path: artifact,
          contentType: 'application/json',
        });
      },
      async qualifyRejection(wire: CapturedLog) {
        await expect.poll(async () => (await errors()).records.length).toBe(2);
        const record = parse(wire);
        expect(record.attrs.reason).toBe('browser.rejection');
        checkWires([wire], (await errors()).records);
        evidence.rejection = await replayReopen([wire]);
        const artifact = info.outputPath('error-receiver-qualification.json');
        await writeFile(artifact, JSON.stringify(evidence, null, 2));
      },
      async beginBoundaryQualification() {
        app = await request('/api/apps', {
          name: 'Disposable F3-2 unmapped browser and server failures',
        });
        base = `/api/apps/${app.id}`;
        currentTokens = await request(base + '/connection');
      },
      async qualifyBoundaries(wires: CapturedLog[], browser: Browser) {
        expect((await fetch(origin + base + '/errors')).status).toBe(401);
        const diagnostics = wires.filter((w) => parse(w).record.severityNumber === 17);
        await expect.poll(async () => (await errors()).records.length).toBe(diagnostics.length);
        const retained = (await errors()).records;
        checkWires(diagnostics, retained);
        const snap = await snapshot();
        expect(snap.activeDefinition).toMatchObject({ goal: '', mappings: [] });
        expect(snap.model.journeys).toHaveLength(0);
        for (const e of retained.filter((e) => e.source === 'server')) {
          expect(e.scope).toBe('');
          expect(e.tab).toBe('');
          expect(e.sequence).toBe(0);
          expect(e.attrs).not.toHaveProperty('stage.name');
        }
        // Authority comes from the token, not an asserted service label. Probe
        // swaps in a separate app so this cannot contaminate acceptance replay.
        const authorityApp = await request('/api/apps', {
          name: 'Disposable token-authority probe',
        });
        const authorityTokens = await request(`/api/apps/${authorityApp.id}/connection`);
        const serverWire = diagnostics.find(
          (w) => parse(w).record.eventName === 'pwa.server.error'
        )!;
        const wrong = await fetch(origin + '/v1/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-protobuf',
            Authorization: `Bearer ${authorityTokens.browser}`,
          },
          body: new Uint8Array(serverWire.wire),
        });
        expect(wrong.status).toBe(200);
        await wrong.text();
        const browserWire = diagnostics.find(
          (w) => parse(w).record.eventName === 'pwa.browser.error'
        )!;
        const wrongBrowser = await fetch(origin + '/v1/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-protobuf',
            Authorization: `Bearer ${authorityTokens.server}`,
          },
          body: new Uint8Array(browserWire.wire),
        });
        expect(wrongBrowser.status).toBe(200);
        await wrongBrowser.text();
        evidence.boundaries = await replayReopen(wires);
        const authoritySnapshot = await request(`/api/apps/${authorityApp.id}/snapshot`);
        expect(authoritySnapshot.evidence).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ source: 'browser', service: 'wfs-pwa-server' }),
            expect.objectContaining({ source: 'server', service: 'wfs-pwa-browser' }),
          ])
        );
        evidence.authorityQualification = authoritySnapshot;
        const invalid = await fetch(origin + '/v1/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-protobuf',
            Authorization: 'Bearer invalid-synthetic',
          },
          body: new Uint8Array(serverWire.wire),
        });
        expect(invalid.status).toBe(401);
        await invalid.text();
        const context = await browser.newContext(),
          page = await context.newPage();
        try {
          await page.goto(origin + '/?app=' + app.id);
          await page.getByLabel('Passphrase', { exact: true }).fill(passphrase);
          await page.getByRole('button', { name: 'Open workspace' }).click();
          await page.getByRole('button', { name: 'Workspace menu', exact: true }).click();
          await page.getByRole('button', { name: 'Errors & exceptions', exact: true }).click();
          await expect(page.locator('.error-record')).toHaveCount(diagnostics.length);
          await expect(page.getByText('pwa.server.error', { exact: true }).first()).toBeVisible();
          await page.screenshot({
            path: info.outputPath('boundary-server-errors.png'),
            fullPage: true,
          });
        } finally {
          await context.close();
        }
        await writeFile(
          info.outputPath('error-receiver-qualification.json'),
          JSON.stringify(evidence, null, 2)
        );
      },
      async beginBoundaryPath() {
        app = await request('/api/apps', {
          name: 'Disposable render supporting-path qualification',
        });
        base = `/api/apps/${app.id}`;
        currentTokens = await request(base + '/connection');
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
        const search = { ...home, step: 'Search', value: 'search' };
        const definition = {
          goal: 'pwa.screen.presented',
          goalSelector: search,
          mappings: [
            { ...mapping, event: 'pwa.app.opened', step: 'App opened', key: '', value: '' },
            home,
            search,
          ],
        };
        evidence.boundaryPathDefinition = await request(base + '/definitions', definition);
        evidence.boundaryPathDefinitionSha256 = sha(JSON.stringify(definition));
      },
      async assertBoundaryPathActive() {
        await expect.poll(async () => (await errors()).records.length).toBe(1);
        const current = await snapshot();
        expect(current.model.journeys).toHaveLength(1);
        expect(current.model.journeys[0]).toMatchObject({
          status: 'active',
          path: ['App opened', 'Home'],
        });
        expect(current.model.journeys[0].evidence).toContainEqual(
          expect.objectContaining({
            name: 'pwa.browser.error',
            attrs: expect.objectContaining({ reason: 'browser.render' }),
          })
        );
        evidence.boundaryPathActive = current;
      },
      async qualifyBoundaryPath(wires: CapturedLog[], browser: Browser) {
        await expect
          .poll(async () => (await snapshot()).model.journeys[0]?.status)
          .toBe('completed');
        const current = await snapshot();
        checkWires(wires, current.evidence);
        const journey = current.model.journeys[0];
        expect(journey.path[0]).toBe('App opened');
        expect(journey.path).toContain('Home');
        expect(journey.path.at(-1)).toBe('Search');
        expect(journey.evidence).toContainEqual(
          expect.objectContaining({
            name: 'pwa.browser.error',
            attrs: expect.objectContaining({ reason: 'browser.render', 'stage.name': 'home' }),
          })
        );
        await ui(browser, 1, journey.scope, 'browser.render');
        evidence.boundaryPath = await replayReopen(wires);
        await writeFile(
          info.outputPath('error-receiver-qualification.json'),
          JSON.stringify(evidence, null, 2)
        );
      },
      async beginMappedPath() {
        // Activate a separate prospective definition before fresh browser emission.
        app = await request('/api/apps', { name: 'Disposable mapped error qualification' });
        base = `/api/apps/${app.id}`;
        currentTokens = await request(base + '/connection');
        const common = {
          source: 'browser',
          service: 'wfs-pwa-browser',
          signal: 'logs',
          carrier: 'log',
          kind: 'step',
          timing: 'none',
        };
        const search = {
          ...common,
          event: 'pwa.screen.presented',
          step: 'Search',
          key: 'stage.name',
          value: 'search',
        };
        const definition = {
          goal: 'pwa.screen.presented',
          goalSelector: search,
          mappings: [
            { ...common, event: 'pwa.app.opened', step: 'App opened', key: '', value: '' },
            {
              ...common,
              event: 'pwa.screen.presented',
              step: 'Home',
              key: 'stage.name',
              value: 'home',
            },
            {
              ...common,
              event: 'pwa.browser.error',
              step: 'Render error',
              key: 'reason',
              value: 'browser.render',
            },
            search,
          ],
        };
        evidence.mappedDefinition = await request(base + '/definitions', definition);
        evidence.mappedDefinitionSha256 = sha(JSON.stringify(definition));
      },
      async assertMappedPathActive() {
        await expect.poll(async () => (await errors()).records.length).toBe(1);
        const afterMappedError = await snapshot();
        expect(afterMappedError.model.journeys[0].status).toBe('active');
        expect(afterMappedError.model.journeys[0].path).toContain('Render error');
        evidence.afterMappedError = afterMappedError;
      },
      async qualifyMappedPath(wires: CapturedLog[], browser: Browser) {
        await expect
          .poll(async () => (await snapshot()).model.journeys[0]?.status)
          .toBe('completed');
        const mapped = await snapshot();
        expect(mapped.model.journeys[0].path).toContain('Render error');
        expect(mapped.model.journeys[0].path.at(-1)).toBe('Search');
        evidence.mappedPath = await replayReopen(wires);
        const errorWire = wires.find((w) => parse(w).attrs.reason === 'browser.render')!;
        const changed = JSON.parse(errorWire.body);
        changed.resourceLogs[0].scopeLogs[0].logRecords[0].attributes.find(
          (a: { key: string }) => a.key === 'reason'
        ).value.stringValue = 'browser.script';
        const beforeConflict = await snapshot();
        const conflict = await fetch(origin + '/v1/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-protobuf',
            Authorization: `Bearer ${currentTokens.browser}`,
          },
          body: new Uint8Array(encodeLogs(changed)),
        });
        expect(conflict.status).toBe(400);
        await conflict.text();
        expect((await snapshot()).evidence).toEqual(beforeConflict.evidence);
        evidence.changedProjectionStatus = conflict.status;
        const distinct = JSON.parse(errorWire.body);
        const distinctId = randomUUID();
        distinct.resourceLogs[0].scopeLogs[0].logRecords[0].attributes.find(
          (a: { key: string }) => a.key === 'event.id'
        ).value.stringValue = distinctId;
        const distinctWire: CapturedLog = {
          body: JSON.stringify(distinct),
          wire: encodeLogs(distinct),
        };
        const distinctResponse = await fetch(origin + '/v1/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-protobuf',
            Authorization: `Bearer ${currentTokens.browser}`,
          },
          body: new Uint8Array(distinctWire.wire),
        });
        expect(distinctResponse.status).toBe(200);
        await distinctResponse.text();
        await expect.poll(async () => (await errors()).records.length).toBe(2);
        checkWires([errorWire, distinctWire], (await errors()).records);
        evidence.distinctOccurrenceRecords = await replayReopen([...wires, distinctWire]);
        const reopenedBeforeConflict = await snapshot();
        const reopenedConflict = await fetch(origin + '/v1/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-protobuf',
            Authorization: `Bearer ${currentTokens.browser}`,
          },
          body: new Uint8Array(encodeLogs(changed)),
        });
        expect(reopenedConflict.status).toBe(400);
        await reopenedConflict.text();
        expect((await snapshot()).evidence).toEqual(reopenedBeforeConflict.evidence);
        evidence.reopenedChangedProjectionStatus = reopenedConflict.status;
        const mappedContext = await browser.newContext();
        try {
          const mappedPage = await mappedContext.newPage();
          await mappedPage.goto(origin + '/?app=' + app.id);
          await mappedPage.getByLabel('Passphrase', { exact: true }).fill(passphrase);
          await mappedPage.getByRole('button', { name: 'Open workspace' }).click();
          await expect(mappedPage.getByText('Render error', { exact: true }).first()).toBeVisible();
          await mappedPage.screenshot({
            path: info.outputPath('mapped-error-step.png'),
            fullPage: true,
          });
        } finally {
          await mappedContext.close();
        }
        await writeFile(
          info.outputPath('error-receiver-qualification.json'),
          JSON.stringify(evidence, null, 2)
        );
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
