import { disposableTelemetryReceiver } from './telemetry-receiver';
import { test, expect, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';
import { generateSecretToken } from './auth-utils';

// Full application copy: real root, proxy, identity gate, action and Node exporter.
// No existing dev server, env file, receiver deployment or business database is used.
test('correlated Home Search Home through real browser action and Node exporter', async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  let actionId = '';
  const durable = process.env.WFS_NAV_SENTRAME_BINARY
    ? await disposableTelemetryReceiver(process.env.WFS_NAV_SENTRAME_BINARY, testInfo)
    : undefined;
  const browserToken = durable?.tokens.browser ?? 'opening-fixture-browser';
  const serverToken = durable?.tokens.server ?? 'opening-fixture-server';
  const initialContext = await browser.newContext({ serviceWorkers: 'block' });
  const page = await initialContext.newPage();
  const received: {
    path: string | undefined;
    type: string | undefined;
    encoding: string | undefined;
    authorization: string | undefined;
    body: string;
  }[] = [];
  const receiver = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    received.push({
      path: request.url,
      type: request.headers['content-type'],
      encoding: request.headers['content-encoding'],
      authorization: request.headers.authorization,
      body,
    });
    if (durable) {
      const actual = await fetch(durable.origin + '/v1/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${browserToken}` },
        body,
      });
      response
        .writeHead(actual.status, { 'Content-Type': 'application/json' })
        .end(await actual.text());
    } else response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
  });
  await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`;
  const root = await mkdtemp(path.join(tmpdir(), 'wfs-opening-'));
  const pwa = process.cwd();
  let child: ReturnType<typeof spawn> | undefined;
  try {
    for (const name of [
      'src',
      'public',
      'next.config.js',
      'postcss.config.js',
      'tailwind.config.ts',
      'playwright.config.ts',
      'tsconfig.json',
    ]) {
      await cp(path.join(pwa, name), path.join(root, name), {
        recursive: true,
        filter: (source) => !/\.(test|spec)\.tsx?$/.test(source),
      });
    }
    await cp(path.join(pwa, 'package.json'), path.join(root, 'package.json'));
    await cp(path.join(pwa, '..', '.gitignore'), path.join(root, '.gitignore'));
    await symlink(path.join(pwa, 'node_modules'), path.join(root, 'node_modules'));
    const fixtureEnv = {
      ...process.env,
      NEXT_PUBLIC_ENVIRONMENT: 'test',
      HEARTH_SECRET: 'opening-fixture-secret',
      WFS_TELEMETRY_ENABLED: 'true',
      WFS_VERSION: '1.4.2-test.opening',
      SENTRAME_OTLP_BASE: endpoint,
      SENTRAME_BROWSER_TOKEN: browserToken,
      SENTRAME_SERVER_TOKEN: serverToken,
      API_INTERNAL_URL: 'http://127.0.0.1:1',
      NEXT_PUBLIC_API_BASE_URL: '',
    };
    const next = path.join(pwa, 'node_modules/next/dist/bin/next');
    // Production mode avoids Fast Refresh creating replacement documents or
    // holding Flight response bodies open while other suites compile routes.
    child = spawn(process.execPath, [next, 'build', '--webpack'], {
      cwd: root,
      env: fixtureEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const build = child;
    await new Promise<void>((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => {
        build.kill('SIGTERM');
        reject(new Error('Owned Next build timed out'));
      }, 180_000);
      const read = (data: Buffer) => {
        output = (output + data.toString()).slice(-3000);
      };
      build.stdout!.on('data', read);
      build.stderr!.on('data', read);
      build.once('exit', (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new Error(`Owned Next build failed ${code}: ${output}`));
      });
    });
    const startApp = async (runtimeEnv: NodeJS.ProcessEnv) => {
      child = spawn(process.execPath, [next, 'start', '-H', '127.0.0.1', '-p', '0'], {
        cwd: root,
        env: runtimeEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const app = child;
      return await new Promise<string>((resolve, reject) => {
        let output = '';
        const timeout = setTimeout(
          () => reject(new Error(`Owned Next startup timed out: ${output.slice(-3000)}`)),
          30_000
        );
        app.stdout!.on('data', (data) => {
          output += data.toString();
          const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
          if (match) {
            clearTimeout(timeout);
            resolve(match[0]);
          }
        });
        app.stderr!.on('data', (data) => {
          output += data.toString();
        });
        app.once('exit', (code) => {
          clearTimeout(timeout);
          reject(new Error(`Owned Next exited ${code}: ${output.slice(-3000)}`));
        });
      });
    };
    const stopApp = async () => {
      if (child && child.exitCode === null) {
        child.kill('SIGTERM');
        await new Promise<void>((resolve) => child!.once('exit', () => resolve()));
      }
    };
    let url = await startApp(fixtureEnv);
    await page.context().addCookies([
      { name: 'h_access', value: await generateSecretToken('opening-fixture-secret'), url },
      { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url },
    ]);
    await page.addInitScript((id) => {
      localStorage.setItem('locale', 'en');
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);
    await page.route('**/api/**', (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: '{}' })
    );
    await setupCommonRoutes(page);
    const inspectPage = async (page: Page) => {
      // Drain a clone so complete real action bodies are available to CDP
      // inspection independently of the framework consumer. No request is mocked.
      await page.addInitScript(() => {
        const inspection = Object.assign(window, { openingDrainErrors: [] as string[] });
        const fetch = window.fetch.bind(window);
        window.fetch = async (input, init) => {
          const response = await fetch(input, init);
          const headers = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined)
          );
          if (headers.has('next-action'))
            void response
              .clone()
              .arrayBuffer()
              .catch((error) => {
                inspection.openingDrainErrors.push(String(error));
              });
          return response;
        };
      });
      const actionResponses: string[] = [];
      const openingResponses: string[] = [];
      const actionDiagnostics: string[] = [];
      const clientScripts: string[] = [];
      const bodyReads: Promise<void>[] = [];
      const bodyReadErrors: string[] = [];
      page.on('response', (response) => {
        const request = response.request();
        const isAction = Boolean(request.headers()['next-action']);
        if (isAction && !actionId) actionId = request.headers()['next-action'];
        if (isAction) actionDiagnostics.push(`response ${response.status()} action=true`);
        const isScript = request.resourceType() === 'script' && response.url().startsWith(url);
        if (!isAction && !isScript) return;
        // Await body completion explicitly and drain reads before each navigation.
        // Event callbacks are not awaited by Playwright's test lifecycle.
        bodyReads.push(
          response
            .finished()
            .then(() => response.text())
            .then((body) => {
              if (isAction) actionResponses.push(body);
              if (request.headers()['next-action'] === actionId) openingResponses.push(body);
              if (isScript) clientScripts.push(body);
            })
            .catch((error: Error) => {
              bodyReadErrors.push(error.message);
            })
        );
      });
      const drainBodies = async () => {
        await Promise.all(bodyReads);
        expect(bodyReadErrors, 'all inspected browser/action bodies must be available').toEqual([]);
        expect(
          await page.evaluate(
            () => (window as Window & { openingDrainErrors?: string[] }).openingDrainErrors
          )
        ).toEqual([]);
      };
      return {
        actionResponses,
        openingResponses,
        actionDiagnostics,
        clientScripts,
        bodyReadErrors,
        drainBodies,
      };
    };
    const { actionResponses, clientScripts, drainBodies } = await inspectPage(page);
    const records = () =>
      received.map((item) => JSON.parse(item.body).resourceLogs[0].scopeLogs[0].logRecords[0]);
    const attributes = (record: ReturnType<typeof records>[number]) =>
      Object.fromEntries(
        record.attributes.map(
          (item: { key: string; value: { stringValue?: string; intValue?: string } }) => [
            item.key,
            item.value.stringValue ?? Number(item.value.intValue),
          ]
        )
      );
    await page.goto(`${url}/home?private=private-navigation-sentinel`);
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    await expect.poll(() => received.length).toBe(2);
    await page.getByTestId('nav-item-recipes').click();
    await expect(page).toHaveURL(`${url}/recipes`);
    await expect.poll(() => received.length).toBe(3);
    await page.getByTestId('nav-item-home').click();
    await expect(page).toHaveURL(`${url}/home`);
    await expect.poll(() => received.length).toBe(4);
    const first = records().sort(
      (a, b) => attributes(a)['source.sequence'] - attributes(b)['source.sequence']
    );
    expect(first.map((record) => [record.eventName, attributes(record)['stage.name']])).toEqual([
      ['pwa.app.opened', 'home'],
      ['pwa.screen.presented', 'home'],
      ['pwa.screen.presented', 'search'],
      ['pwa.screen.presented', 'home'],
    ]);
    expect(first.map((record) => attributes(record)['source.sequence'])).toEqual([1, 2, 3, 4]);
    expect(new Set(first.map((record) => attributes(record)['session.id'])).size).toBe(1);
    expect(new Set(first.map((record) => attributes(record)['tab.id'])).size).toBe(1);
    expect(new Set(first.map((record) => attributes(record)['event.id'])).size).toBe(4);
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await page.waitForTimeout(300);
    expect(received).toHaveLength(4);
    // F2-2: actual rendered composition, including resize and hidden reconciliation.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('nav-item-planner').click();
    await expect(page.getByTestId('grocery-tab')).toBeVisible();
    await expect.poll(() => received.length).toBe(5);
    await page.getByTestId('grocery-tab').click();
    await expect.poll(() => received.length).toBe(6);
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByTestId('grocery-tab')).toBeHidden();
    await expect.poll(() => received.length).toBe(8);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('grocery-tab')).toBeVisible();
    await page.waitForTimeout(200);
    expect(received).toHaveLength(8);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => received.length).toBe(10);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(200);
    expect(received).toHaveLength(10);
    await page
      .getByTestId('grocery-checklist')
      .getByRole('button', { name: 'Close grocery list' })
      .click();
    await expect.poll(() => received.length).toBe(11);
    await page.getByTestId('nav-item-home').click();
    await expect.poll(() => received.length).toBe(12);
    const composition = records().sort(
      (a, b) => attributes(a)['source.sequence'] - attributes(b)['source.sequence']
    );
    expect(composition.slice(4).map((r) => [r.eventName, attributes(r)['stage.name']])).toEqual([
      ['pwa.screen.presented', 'planner'],
      ['pwa.screen.presented', 'planner.grocery'],
      ['pwa.screen.presented', 'planner'],
      ['pwa.surface.opened', 'planner.grocery'],
      ['pwa.surface.closed', 'planner.grocery'],
      ['pwa.screen.presented', 'planner.grocery'],
      ['pwa.screen.presented', 'planner'],
      ['pwa.screen.presented', 'home'],
    ]);
    expect(composition.map((r) => attributes(r)['source.sequence'])).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1)
    );
    expect(new Set(composition.map((r) => attributes(r)['session.id'])).size).toBe(1);
    expect(new Set(composition.map((r) => attributes(r)['tab.id'])).size).toBe(1);
    expect(new Set(composition.map((r) => attributes(r)['event.id'])).size).toBe(12);
    await drainBodies();
    await page.reload();
    await expect.poll(() => received.length).toBe(14);
    const reloaded = attributes(records()[12]);
    expect(reloaded['session.id']).not.toBe(attributes(first[0])['session.id']);
    expect(reloaded['tab.id']).not.toBe(attributes(first[0])['tab.id']);
    const second = await initialContext.newPage();
    await second.route('**/api/**', (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: '{}' })
    );
    await setupCommonRoutes(second);
    await second.goto(`${url}/home`);
    await expect.poll(() => received.length).toBe(16);
    expect(attributes(records()[14])['session.id']).not.toBe(reloaded['session.id']);
    await second.close();
    // Invoke the actual compiled Action with complete malformed envelopes. No exporter
    // or Action is mocked, and the valid records above establish the positive path.
    const statuses = await page.evaluate(async (id) => {
      const valid = {
        eventName: 'pwa.screen.presented',
        screen: 'home',
        sessionId: crypto.randomUUID(),
        tabId: crypto.randomUUID(),
        eventId: crypto.randomUUID(),
        sequence: 9,
        timestamp: Date.now(),
      };
      const inputs = [
        null,
        [],
        { screen: 'home' },
        { ...valid, url: 'private-navigation-sentinel' },
        { ...valid, eventName: 'business.saved' },
        { ...valid, screen: '/private-navigation-sentinel' },
        { ...valid, sessionId: 'private-navigation-sentinel' },
        { ...valid, sequence: 0 },
        { ...valid, sequence: Number.MAX_SAFE_INTEGER + 1 },
        { ...valid, timestamp: Date.now() - 86_500_000 },
        { ...valid, timestamp: Date.now() + 400_000 },
      ];
      const statuses: number[] = [];
      for (const input of inputs) {
        const response = await fetch(location.href, {
          method: 'POST',
          headers: {
            'Next-Action': id,
            'Content-Type': 'text/plain;charset=UTF-8',
            Accept: 'text/x-component',
          },
          body: JSON.stringify([input]),
        });
        await response.text();
        statuses.push(response.status);
      }
      return statuses;
    }, actionId);
    expect(statuses).toEqual(Array(11).fill(200));
    await page.waitForTimeout(250);
    expect(received).toHaveLength(16);
    for (const item of received) {
      expect(item.path).toBe('/v1/logs');
      expect(item.type).toBe('application/json');
      expect(item.encoding).toBeUndefined();
      expect(item.authorization).toBe(`Bearer ${browserToken}`);
      const record = JSON.parse(item.body).resourceLogs[0].scopeLogs[0].logRecords[0];
      expect(record.timeUnixNano).toMatch(/^\d{19}$/);
      expect(record.observedTimeUnixNano).toMatch(/^\d{19}$/);
      expect(Object.keys(attributes(record)).sort()).toEqual([
        'event.id',
        'session.id',
        'source.sequence',
        'stage.name',
        'tab.id',
      ]);
      for (const key of ['event.id', 'session.id', 'tab.id'])
        expect(attributes(record)[key]).toMatch(/^[0-9a-f-]{36}$/);
      expect(item.body).not.toMatch(
        /private-navigation-sentinel|opening-fixture-secret|opening-fixture-browser|opening-fixture-server/
      );
    }
    await drainBodies();
    const content = [await page.content(), ...actionResponses, ...clientScripts].join('\n');
    for (const secret of [endpoint, browserToken, serverToken])
      expect(content).not.toContain(secret);
    if (durable) await durable.qualify(received.map((item) => item.body));
    const payloadPath = testInfo.outputPath('navigation-wire.json');
    await writeFile(payloadPath, JSON.stringify(received.map(({ body }) => body)));
    await testInfo.attach('exact-navigation-wire', {
      path: payloadPath,
      contentType: 'application/json',
    });
  } finally {
    await initialContext.close();
    await durable?.close();
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise<void>((resolve) => child!.once('exit', () => resolve()));
    }
    receiver.closeAllConnections();
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
