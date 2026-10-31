import { captureLogs, captureOnce } from './telemetry-wire';
import { disposableErrorReceiver } from './telemetry-error-receiver';
import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';
import { generateSecretToken } from './auth-utils';

// Full application copy: real root, proxy, identity gate, action and Node exporter.
// No existing dev server, env file, receiver deployment or business database is used.
test('native script/rejection through Action and Node Protobuf, standalone diagnostics and supporting path', async ({
  browser,
}, testInfo) => {
  test.setTimeout(360_000);
  let errorActionId = '';
  let actionId = '';
  let outage = false;
  let stalled = false;
  const binary = process.env.WFS_NAV_SENTRAME_BINARY;
  if (process.env.WFS_ERROR_DURABLE === '1' && !binary)
    throw new Error('Durable acceptance requires explicit reviewed WFS_NAV_SENTRAME_BINARY');
  const durable = binary ? await disposableErrorReceiver(binary, testInfo) : undefined;
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
    wire: Buffer;
    delivered: boolean;
  }[] = [];
  const receiver = createServer(async (request, response) => {
    if (request.url !== '/v1/logs') {
      // Native trace receipt is qualified separately from these minimized logs.
      for await (const chunk of request) {
        void chunk;
      }
      response.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk);
    const wire = Buffer.concat(chunks);
    const items = captureLogs(wire).map((point) =>
      captureOnce(received, {
        path: request.url,
        type: request.headers['content-type'],
        encoding: request.headers['content-encoding'],
        authorization: request.headers.authorization,
        delivered: false,
        ...point,
      })
    );
    if (stalled) return;
    if (outage) {
      response.writeHead(503).end('private-outage-sentinel');
      return;
    }
    if (durable) {
      const actual = await fetch(durable.origin + '/v1/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-protobuf',
          Authorization: `Bearer ${request.headers.authorization === `Bearer ${serverToken}` ? durable.currentTokens.server : durable.currentTokens.browser}`,
        },
        body: new Uint8Array(wire),
      });
      for (const item of items) item.delivered = actual.status === 200;
      response
        .writeHead(actual.status, { 'Content-Type': 'application/x-protobuf' })
        .end(Buffer.from(await actual.arrayBuffer()));
    } else response.writeHead(200, { 'Content-Type': 'application/x-protobuf' }).end();
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
    await writeFile(
      path.join(root, 'src/app/telemetry-fixture.tsx'),
      `'use client';
import { useEffect } from 'react';
import { observeOpening } from '@/lib/telemetry/opening';
export default function Fixture() { useEffect(() => { observeOpening(document, true, null, async () => {}); window.dispatchEvent(new ErrorEvent('error', {error:new Error('private-standalone-sentinel')})); }, []); return <main data-testid="standalone-ready">Standalone fixture</main>; }`
    );
    await import('node:fs/promises').then(async ({ mkdir }) => {
      await mkdir(path.join(root, 'src/app/telemetry-fixture'), { recursive: true });
    });
    await writeFile(
      path.join(root, 'src/app/telemetry-fixture/page.tsx'),
      `export {default} from '../telemetry-fixture';`
    );
    // Diagnostic routes and root failure controls exist ONLY in this disposable copy.
    await mkdir(path.join(root, 'src/app/error-fixture'), { recursive: true });
    await mkdir(path.join(root, 'src/app/server-error-fixture'), { recursive: true });
    await mkdir(path.join(root, 'src/app/route-error-fixture'), { recursive: true });
    await mkdir(path.join(root, 'src/app/action-error-fixture'), { recursive: true });
    await writeFile(
      path.join(root, 'src/app/error-fixture/page.tsx'),
      `'use client';
import { useState } from 'react';
const failure = new Error('private-render-sentinel');
export default function Fixture() { const [fail,setFail]=useState(false); if(fail) throw failure; return <button onClick={()=>setFail(true)}>Induce route render</button>; }`
    );
    await writeFile(
      path.join(root, 'src/app/server-error-fixture/page.tsx'),
      `import {connection} from 'next/server'; export default async function Fixture() { await connection(); throw new Error('private-server-sentinel'); }`
    );
    await writeFile(
      path.join(root, 'src/app/route-error-fixture/route.ts'),
      `export const dynamic='force-dynamic'; const failure=new Error('private-server-sentinel'); export async function GET() { throw failure; }`
    );
    await writeFile(
      path.join(root, 'src/app/action-error-fixture/page.tsx'),
      `export default function Fixture() { return <form action={async()=>{'use server';throw new Error('private-server-sentinel');}}><button>Induce server action</button></form>; }`
    );
    await writeFile(
      path.join(root, 'src/app/root-error-fixture.tsx'),
      `'use client';
import {useState,useEffect} from 'react'; import Link from 'next/link';
const failure=new Error('private-root-sentinel');
export default function FixtureRoot({children}:{children:React.ReactNode}) { const [fail,setFail]=useState(false); useEffect(()=>{const trigger=()=>setFail(true);window.addEventListener('fixture-root-failure',trigger);return()=>window.removeEventListener('fixture-root-failure',trigger);},[]); if(fail || (typeof window!=='undefined' && location.pathname==='/early-root-fixture')) throw failure; return <><Link href="/error-fixture">Fixture route</Link>{children}</>; }`
    );
    const layoutPath = path.join(root, 'src/app/layout.tsx');
    const layout = await readFile(layoutPath, 'utf8');
    await writeFile(
      layoutPath,
      `import FixtureRoot from './root-error-fixture';\n` +
        layout
          .replace('<LocaleProvider>', '<FixtureRoot><LocaleProvider>')
          .replace('</LocaleProvider>', '</LocaleProvider></FixtureRoot>')
    );
    await mkdir(path.join(root, 'src/app/early-root-fixture'), { recursive: true });
    await writeFile(
      path.join(root, 'src/app/early-root-fixture/page.tsx'),
      `export default function Page(){return <main>Early root fixture</main>}`
    );
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
        const inspection = Object.assign(window, {
          openingDrainErrors: [] as string[],
          openingPendingActions: 0,
        });
        const fetch = window.fetch.bind(window);
        window.fetch = async (input, init) => {
          const headers = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined)
          );
          const isAction = headers.has('next-action');
          if (isAction) inspection.openingPendingActions++;
          const response = await fetch(input, init);
          if (isAction)
            void response
              .clone()
              .arrayBuffer()
              .catch((error) => {
                inspection.openingDrainErrors.push(String(error));
              })
              .finally(() => inspection.openingPendingActions--);
          return response;
        };
      });
      const actionResponses: string[] = [];
      const openingResponses: string[] = [];
      const actionDiagnostics: string[] = [];
      const clientScripts: string[] = [];
      const bodyReads: Promise<void>[] = [];
      const pendingBodies = new Set<string>();
      const bodyReadErrors: string[] = [];
      page.on('response', (response) => {
        const request = response.request();
        const isAction = Boolean(request.headers()['next-action']);
        if (isAction && !actionId) actionId = request.headers()['next-action'];
        if (isAction && request.postData()?.includes('browser.script'))
          errorActionId = request.headers()['next-action'];
        if (isAction)
          actionDiagnostics.push(
            `response ${response.status()} action=true at ${new URL(response.url()).pathname}`
          );
        const isScript = request.resourceType() === 'script' && response.url().startsWith(url);
        if (!isAction && !isScript) return;
        // Await body completion explicitly and drain reads before each navigation.
        // Event callbacks are not awaited by Playwright's test lifecycle.
        const label = `${bodyReads.length} ${isAction ? 'Action' : 'script'} ${new URL(response.url()).pathname}`;
        pendingBodies.add(label);
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
              bodyReadErrors.push(`${label}: ${error.message}`);
            })
            .finally(() => pendingBodies.delete(label))
        );
      });
      const drainBodies = async () => {
        await expect
          .poll(
            () =>
              page.evaluate(
                () => (window as Window & { openingPendingActions?: number }).openingPendingActions
              ),
            { timeout: 10000 }
          )
          .toBe(0);
        let timeout: ReturnType<typeof setTimeout>;
        try {
          await Promise.race([
            Promise.all(bodyReads),
            new Promise((_, reject) => {
              timeout = setTimeout(
                () =>
                  reject(
                    new Error(
                      `Inspected response bodies did not finish; ${[...pendingBodies].join('; ')}`
                    )
                  ),
                10000
              );
            }),
          ]);
        } finally {
          clearTimeout(timeout!);
        }
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
    await page.goto(`${url}/telemetry-fixture`);
    await expect(page.getByTestId('standalone-ready')).toBeVisible();
    await expect
      .poll(() => records().filter((r) => r.eventName === 'pwa.browser.error').length)
      .toBe(1);
    const standalone = received
      .filter(
        (i) =>
          JSON.parse(i.body).resourceLogs[0].scopeLogs[0].logRecords[0].eventName ===
          'pwa.browser.error'
      )
      .map((i) => i);
    expect(
      attributes(JSON.parse(standalone[0].body).resourceLogs[0].scopeLogs[0].logRecords[0])
    ).not.toHaveProperty('session.id');
    if (durable) await durable.qualifyStandalone(standalone, browser);
    const start = received.length;
    await page.goto(`${url}/home?private=private-route-sentinel`);
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    await expect.poll(() => received.length).toBe(start + 2);
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('private-error-sentinel https://private.example secret');
      }, 0);
    });
    await expect.poll(() => received.length).toBe(start + 3);
    if (durable) await durable.assertActive();
    await page.getByTestId('nav-item-recipes').click();
    await expect(page).toHaveURL(`${url}/recipes`);
    await expect.poll(() => received.length).toBe(start + 4);
    const pathWires = received.slice(start).map((i) => i);
    const first = pathWires
      .map((w) => JSON.parse(w.body).resourceLogs[0].scopeLogs[0].logRecords[0])
      .sort((a, b) => attributes(a)['source.sequence'] - attributes(b)['source.sequence']);
    expect(first.map((r) => [r.eventName, attributes(r)['stage.name']])).toEqual([
      ['pwa.app.opened', 'home'],
      ['pwa.screen.presented', 'home'],
      ['pwa.browser.error', 'home'],
      ['pwa.screen.presented', 'search'],
    ]);
    expect(first.map((r) => attributes(r)['source.sequence'])).toEqual([1, 2, 3, 4]);
    expect(new Set(first.map((r) => attributes(r)['session.id'])).size).toBe(1);
    expect(new Set(first.map((r) => attributes(r)['tab.id'])).size).toBe(1);
    expect(new Set(first.map((r) => attributes(r)['event.id'])).size).toBe(4);
    if (durable) await durable.qualifyPath(pathWires, browser);
    await page.evaluate(() => {
      Promise.reject({ secret: 'private-error-sentinel' });
    });
    await expect.poll(() => received.length).toBe(start + 5);
    expect(attributes(records().at(-1)!).reason).toBe('browser.rejection');
    if (durable) await durable.qualifyRejection(received.at(-1)!);
    await drainBodies();
    expect(errorActionId).not.toBe('');
    const beforeInvalid = received.length;
    const invalidStatuses = await page.evaluate(async (id) => {
      const valid = {
        reason: 'browser.script',
        eventId: crypto.randomUUID(),
        occurrenceId: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      const invalid = [
        null,
        [],
        { ...valid, raw: 'private-error-sentinel' },
        { ...valid, reason: 'server.render' },
        { ...valid, screen: 'home' },
        { ...valid, sessionId: crypto.randomUUID() },
        { ...valid, timestamp: Date.now() - 86400001 },
        { ...valid, timestamp: Date.now() + 400000 },
        { ...valid, eventId: 'private' },
        { ...valid, occurrenceId: 'private' },
        { ...valid, producer: 'server' },
        { ...valid, endpoint: 'https://private.example' },
      ];
      const statuses = [];
      for (const input of invalid) {
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
    }, errorActionId);
    expect(invalidStatuses).toEqual(Array(12).fill(200));
    await page.waitForTimeout(100);
    expect(received).toHaveLength(beforeInvalid);
    await page.evaluate(() => {
      const reused = new Error('private-error-sentinel');
      for (let i = 0; i < 100; i++)
        window.dispatchEvent(new ErrorEvent('error', { error: reused }));
    });
    await expect
      .poll(
        () =>
          records().filter(
            (r) =>
              r.eventName === 'pwa.browser.error' &&
              attributes(r)['session.id'] === attributes(first[0])['session.id']
          ).length
      )
      .toBe(10);
    await page.getByTestId('nav-item-home').click();
    await expect(page).toHaveURL(`${url}/home`);
    await expect.poll(() => records().at(-1)?.eventName).toBe('pwa.screen.presented');
    await drainBodies();
    // A fresh document has fresh admission; exporter outage is contained with bounded SDK retries.
    outage = true;
    const beforeReload = received.length;
    await page.reload();
    await expect.poll(() => received.length).toBe(beforeReload + 2);
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    const beforeOutageError = received.length;
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('private-error-sentinel');
      }, 0);
    });
    await expect.poll(() => received.length).toBe(beforeOutageError + 1);
    await page.getByTestId('nav-item-recipes').click();
    await expect(page).toHaveURL(`${url}/recipes`);
    await expect.poll(() => received.length).toBe(beforeOutageError + 2);
    await drainBodies();
    outage = false;
    if (durable) await durable.beginBoundaryQualification();
    console.info('error fixture: boundaries');
    const boundaryStart = received.length;
    await drainBodies();
    await page.goto(`${url}/home`);
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    await expect.poll(() => received.length).toBe(boundaryStart + 2);
    // Client navigation retains the document and its coordinator.
    await page.getByRole('link', { name: 'Fixture route', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Induce route render' })).toBeVisible();
    const beforeRoute = received.length;
    await page.getByRole('button', { name: 'Induce route render' }).click();
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect
      .poll(
        () =>
          records()
            .slice(beforeRoute)
            .filter(
              (r) =>
                r.eventName === 'pwa.browser.error' && attributes(r).reason === 'browser.render'
            ).length
      )
      .toBe(1);
    const routeError = records()
      .slice(beforeRoute)
      .find(
        (r) => r.eventName === 'pwa.browser.error' && attributes(r).reason === 'browser.render'
      )!;
    expect(attributes(routeError)['session.id']).toBe(
      attributes(records()[boundaryStart])['session.id']
    );
    expect(attributes(routeError)['stage.name']).not.toBe('error');
    const beforeReset = received.length;
    await page.getByRole('button', { name: 'Try again' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Induce route render' })).toBeVisible();
    await page.getByRole('button', { name: 'Induce route render' }).click();
    await expect
      .poll(
        () =>
          records()
            .slice(beforeReset)
            .filter((r) => attributes(r).reason === 'browser.render').length
      )
      .toBe(1);
    const retryError = records()
      .slice(beforeReset)
      .find((r) => attributes(r).reason === 'browser.render')!;
    expect(attributes(retryError)['exception.occurrence.id']).not.toBe(
      attributes(routeError)['exception.occurrence.id']
    );
    await drainBodies();
    await page.goto(`${url}/home`);
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    await expect.poll(() => records().at(-1)?.eventName).toBe('pwa.screen.presented');
    const rootContext = attributes(records().at(-1)!);
    const beforeRoot = received.length;
    await page.evaluate(() => window.dispatchEvent(new Event('fixture-root-failure')));
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect(page.getByTestId('nav-item-recipes')).toHaveCount(0);
    await expect
      .poll(
        () =>
          records()
            .slice(beforeRoot)
            .filter((r) => attributes(r).reason === 'browser.render').length
      )
      .toBe(1);
    const rootError = records()
      .slice(beforeRoot)
      .find((r) => attributes(r).reason === 'browser.render')!;
    expect(attributes(rootError)).toMatchObject({
      'session.id': rootContext['session.id'],
      'tab.id': rootContext['tab.id'],
      'stage.name': 'home',
    });
    expect(await page.locator('html > body main').count()).toBe(1);
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute(
      'href',
      '/home'
    );
    await page.getByRole('button', { name: 'Try again' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    console.info('error fixture: early root');
    const beforeEarlyRoot = received.length;
    await drainBodies();
    await page.goto(`${url}/early-root-fixture`);
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect(page.getByTestId('nav-item-recipes')).toHaveCount(0);
    await expect
      .poll(
        () =>
          records()
            .slice(beforeEarlyRoot)
            .filter((r) => attributes(r).reason === 'browser.render').length
      )
      .toBe(1);
    const earlyRootError = records()
      .slice(beforeEarlyRoot)
      .find((r) => attributes(r).reason === 'browser.render')!;
    expect(attributes(earlyRootError)).not.toHaveProperty('session.id');
    await drainBodies();
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    console.info('error fixture: Next hooks');
    const beforeServer = received.length;
    for (let i = 0; i < 2; i++)
      expect(
        (
          await page.request.get(`${url}/route-error-fixture?private=private-route-sentinel`)
        ).status()
      ).toBe(500);
    await expect
      .poll(
        () =>
          records()
            .slice(beforeServer)
            .filter((r) => attributes(r).reason === 'server.route').length
      )
      .toBe(2);
    console.info('error fixture: Route Handler hook passed');
    await drainBodies();
    await page.goto(`${url}/server-error-fixture`);
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect
      .poll(
        () =>
          records()
            .slice(beforeServer)
            .filter((r) => attributes(r).reason === 'server.render').length
      )
      .toBeGreaterThanOrEqual(1);
    console.info('error fixture: server render hook passed');
    await expect
      .poll(
        () =>
          records()
            .slice(beforeServer)
            .filter(
              (r) =>
                r.eventName === 'pwa.screen.presented' && attributes(r)['stage.name'] === 'error'
            ).length
      )
      .toBe(1);
    await drainBodies();
    await drainBodies();
    await page.goto(`${url}/action-error-fixture`);
    await page.getByRole('button', { name: 'Induce server action' }).click();
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect
      .poll(
        () =>
          records()
            .slice(beforeServer)
            .filter((r) => attributes(r).reason === 'server.action').length
      )
      .toBe(1);
    console.info('error fixture: Server Action hook passed');
    const serverRecords = records()
      .slice(beforeServer)
      .filter((r) => r.eventName === 'pwa.server.error');
    expect(new Set(serverRecords.map((r) => attributes(r)['exception.occurrence.id'])).size).toBe(
      serverRecords.length
    );
    expect(
      records()
        .slice(beforeServer)
        .filter((r) => r.eventName === 'pwa.browser.error')
    ).toHaveLength(0);
    for (const record of serverRecords)
      expect(Object.keys(attributes(record)).sort()).toEqual([
        'event.id',
        'exception.occurrence.id',
        'reason',
      ]);
    console.info('error fixture: draining post-failure responses');
    await drainBodies();
    // Actual Next Route Handler response lifecycle under a stalled hook export.
    console.info('error fixture: stalled Next hook');
    const serverErrorCount = () =>
      records().filter((record) => record.eventName === 'pwa.server.error').length;
    stalled = true;
    const beforeStall = serverErrorCount(),
      stallStart = Date.now();
    expect((await page.request.get(`${url}/route-error-fixture`)).status()).toBe(500);
    const stallElapsed = Date.now() - stallStart;
    expect(stallElapsed).toBeGreaterThanOrEqual(1800);
    expect(stallElapsed).toBeLessThan(4000);
    await expect.poll(serverErrorCount).toBe(beforeStall + 1);
    stalled = false;
    outage = true;
    const beforeHookOutage = serverErrorCount();
    expect((await page.request.get(`${url}/route-error-fixture`)).status()).toBe(500);
    await page.waitForTimeout(100);
    await expect.poll(serverErrorCount).toBe(beforeHookOutage + 1);
    outage = false;
    for (let i = 0; i < 30; i++)
      expect((await page.request.get(`${url}/route-error-fixture`)).status()).toBe(500);
    await expect.poll(serverErrorCount).toBe(20);
    await writeFile(
      testInfo.outputPath('node-hook-lifecycle.json'),
      JSON.stringify(
        {
          runtime: 'Node next start optimized webpack',
          stallElapsedMs: stallElapsed,
          timeoutMs: 2000,
          stallAttempts: 1,
          outageAttempts: 1,
          serverProcessErrorAttempts: 20,
          inducedRequests: 30,
          unqualified: ['Edge', 'serverless', 'abrupt exit'],
        },
        null,
        2
      )
    );
    console.info('error fixture: receiver boundary reopen');
    if (durable)
      await durable.qualifyBoundaries(
        received
          .slice(boundaryStart)
          .filter((i) => i.delivered)
          .map((i) => i),
        browser
      );
    await drainBodies();
    if (durable) await durable.beginBoundaryPath();
    await drainBodies();
    const linkedRootStart = received.length;
    await page.goto(`${url}/home`);
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    await expect.poll(() => received.length).toBe(linkedRootStart + 2);
    await page.evaluate(() => localStorage.setItem('locale', 'fr'));
    await page.evaluate(() => window.dispatchEvent(new Event('fixture-root-failure')));
    await expect(page.getByRole('heading', { name: 'Une erreur est survenue' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('link', { name: 'Accueil', exact: true })).toHaveAttribute(
      'href',
      '/home'
    );
    await expect
      .poll(
        () =>
          records()
            .slice(linkedRootStart)
            .filter((r) => attributes(r).reason === 'browser.render').length
      )
      .toBe(1);
    if (durable) await durable.assertBoundaryPathActive();
    await page.getByRole('button', { name: 'Réessayer' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    await page.getByTestId('nav-item-recipes').click();
    await expect(page).toHaveURL(`${url}/recipes`);
    await expect.poll(() => attributes(records().at(-1)!)['stage.name']).toBe('search');
    await drainBodies();
    if (durable)
      await durable.qualifyBoundaryPath(
        received
          .slice(linkedRootStart)
          .filter((i) => i.delivered)
          .map((i) => i),
        browser
      );
    if (durable) {
      await durable.beginMappedPath();
      const mappedStart = received.length;
      await page.goto(`${url}/home`);
      await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
      await expect.poll(() => received.length).toBe(mappedStart + 2);
      await page.evaluate(() => window.dispatchEvent(new Event('fixture-root-failure')));
      await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
      await expect
        .poll(
          () =>
            records()
              .slice(mappedStart)
              .filter((r) => attributes(r).reason === 'browser.render').length
        )
        .toBe(1);
      await durable.assertMappedPathActive();
      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
      await page.getByTestId('nav-item-recipes').click();
      await expect.poll(() => attributes(records().at(-1)!)['stage.name']).toBe('search');
      await drainBodies();
      await durable.qualifyMappedPath(
        received
          .slice(mappedStart)
          .filter((i) => i.delivered)
          .map((i) => i),
        browser
      );
    }
    await page.evaluate(() => localStorage.setItem('locale', 'en'));
    await stopApp();
    url = await startApp({ ...fixtureEnv, WFS_TELEMETRY_ENABLED: 'false' });
    const beforeDisabled = received.length;
    await drainBodies();
    await page.goto(`${url}/home`);
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('private-error-sentinel');
      }, 0);
    });
    await page.getByTestId('nav-item-recipes').click();
    await expect(page).toHaveURL(`${url}/recipes`);
    await page.waitForTimeout(300);
    expect(received).toHaveLength(beforeDisabled);
    await drainBodies();
    for (const item of received) {
      expect(item.path).toBe('/v1/logs');
      expect(item.type).toBe('application/x-protobuf');
      expect(item.encoding).toBeUndefined();
      expect(item.authorization).toBe(
        `Bearer ${JSON.parse(item.body).resourceLogs[0].scopeLogs[0].logRecords[0].eventName === 'pwa.server.error' ? serverToken : browserToken}`
      );
      const record = JSON.parse(item.body).resourceLogs[0].scopeLogs[0].logRecords[0];
      expect(record.timeUnixNano).toMatch(/^\d{19}$/);
      expect(record.observedTimeUnixNano).toMatch(/^\d{19}$/);
      const isError =
        record.eventName === 'pwa.browser.error' || record.eventName === 'pwa.server.error';
      expect(record.severityNumber).toBe(isError ? 17 : 9);
      expect(record.body.stringValue).toBe(
        isError
          ? 'WFS unexpected error observed'
          : record.eventName === 'pwa.app.opened'
            ? 'WFS opening observed'
            : 'WFS presentation observed'
      );
      if (isError) expect(attributes(record)['exception.occurrence.id']).toMatch(/^[0-9a-f-]{36}$/);
      expect(item.body).not.toMatch(
        /private-error-sentinel|private-standalone-sentinel|private-route-sentinel|private-render-sentinel|private-root-sentinel|private-server-sentinel|private.example|opening-fixture-secret|opening-fixture-browser|opening-fixture-server/
      );
    }
    await drainBodies();
    const assets = await readdir(path.join(root, '.next/static'), {
      recursive: true,
      withFileTypes: true,
    });
    const assetHashes: Record<string, string> = {};
    for (const asset of assets.filter((a) => a.isFile())) {
      const full = path.join(asset.parentPath, asset.name),
        bytes = await readFile(full);
      assetHashes[path.relative(root, full)] = createHash('sha256').update(bytes).digest('hex');
      // Inspect complete emitted client assets, including lazy chunks and maps.
      for (const secret of [endpoint, browserToken, serverToken])
        expect(bytes.toString()).not.toContain(secret);
    }
    const hash = async (file: string) =>
      createHash('sha256')
        .update(await readFile(file))
        .digest('hex');
    const sourceFiles = await readdir(path.join(root, 'src'), {
      recursive: true,
      withFileTypes: true,
    });
    const sourceHashes: Record<string, string> = {};
    for (const file of sourceFiles.filter((f) => f.isFile())) {
      const full = path.join(file.parentPath, file.name);
      sourceHashes[path.relative(root, full)] = await hash(full);
    }
    const identity = {
      node: process.version,
      next: JSON.parse(await readFile(path.join(pwa, 'node_modules/next/package.json'), 'utf8'))
        .version,
      version: fixtureEnv.WFS_VERSION,
      buildId: await readFile(path.join(root, '.next/BUILD_ID'), 'utf8'),
      lockSha256: await hash(path.join(pwa, 'package-lock.json')),
      configSha256: await hash(path.join(root, 'next.config.js')),
      sourceHashes,
      assetHashes,
      configuration: {
        enabled: true,
        protocol: 'HTTP JSON',
        receiver: 'owned loopback capture forwarding exact bodies to owned disposable receiver',
        credentialAuthority: 'separate private synthetic browser/server tokens',
        standaloneAndPathApps: 'separate; capture forwards under each fresh app browser token',
      },
      actionResponses: actionResponses.length,
      clientScripts: clientScripts.length,
    };
    await writeFile(
      testInfo.outputPath('error-build-identity.json'),
      JSON.stringify(identity, null, 2)
    );
    expect(actionResponses.join('\n')).not.toMatch(
      /private-error-sentinel|private-standalone-sentinel|private-outage-sentinel|private-render-sentinel|private-root-sentinel|private-server-sentinel/
    );
    const content = [await page.content(), ...actionResponses, ...clientScripts].join('\n');
    for (const secret of [endpoint, browserToken, serverToken])
      expect(content).not.toContain(secret);

    const payloadPath = testInfo.outputPath('errors-wire.json');
    await writeFile(payloadPath, JSON.stringify(received.map(({ body }) => body)));
    await testInfo.attach('exact-error-wire', {
      path: payloadPath,
      contentType: 'application/json',
    });
  } finally {
    await writeFile(
      testInfo.outputPath('attempted-errors-wire.json'),
      JSON.stringify(received.map(({ body }) => body))
    );
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
