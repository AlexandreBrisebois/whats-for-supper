import { test, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';
import { generateSecretToken } from './auth-utils';
import { captureLogs, captureOnce, type CapturedLog } from './telemetry-wire';
import { disposableTelemetryReceiver } from './telemetry-receiver';

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const A = MOCK_IDS.RECIPE_LASAGNA;
const B = MOCK_IDS.RECIPE_STIR_FRY;
const privateText = 'issue-private-feedback-sentinel';
const resultName = 'pwa.recipe_issue.save_result';
const reasons = ['saved_manual', 'processing_acknowledged', 'saved_launch_failed', 'unconfirmed'];
const decoded = (point: CapturedLog) => {
  const resource = JSON.parse(point.body).resourceLogs[0];
  const record = resource.scopeLogs[0].logRecords[0];
  const attributes = Object.fromEntries(
    (record.attributes ?? []).map(
      (a: { key: string; value: { stringValue?: string; intValue?: string } }) => [
        a.key,
        a.value.stringValue ?? Number(a.value.intValue),
      ]
    )
  );
  return { resource, record, attributes };
};
function composition() {
  return `'use client';
 import {useState} from 'react';
 import {RecipeDetailSheet} from '@/components/recipes/RecipeDetailSheet';
 export default function IssueFixture(){
 const [id,setId]=useState<string|null>(null);const [key,setKey]=useState(0);
 return <main><div style={{position:'fixed',top:0,left:0,zIndex:500,background:'white'}}>
 <button data-testid="fixture-a" onClick={()=>setId('${A}')}>A</button>
 <button data-testid="fixture-b" onClick={()=>setId('${B}')}>B</button>
 <button data-testid="fixture-close" onClick={()=>setId(null)}>Close detail</button>
 <button data-testid="fixture-remount" onClick={()=>setKey(k=>k+1)}>Remount detail</button>
 </div>{id&&<RecipeDetailSheet key={key} recipeId={id} plannerDayLabel={null} onClose={()=>setId(null)} onUseForDay={async()=>{}} onFindSimilar={()=>{}}/>}</main>;}`;
}

test('current issue response reasons stay bounded and independent through actual SDK protected replay/reopen', async ({
  browser,
}, info) => {
  test.setTimeout(420_000);
  const binary = process.env.WFS_OTEL_SENTRAME_BINARY;
  if (!binary)
    throw new Error(
      'Issue live qualification requires explicit WFS_OTEL_SENTRAME_BINARY for a fresh owned receiver'
    );
  const version = '1.4.2-test.issues';
  const received: CapturedLog[] = [];
  const batches: Buffer[] = [];
  const mapping = {
    source: 'browser',
    service: 'wfs-pwa-browser',
    signal: 'logs',
    carrier: 'log',
    timing: 'none',
  };
  const durable = await disposableTelemetryReceiver(binary, info, {
    version,
    definition: {
      goal: '',
      mappings: [
        {
          ...mapping,
          kind: 'step',
          event: 'pwa.app.opened',
          step: 'App opened',
          key: '',
          value: '',
        },
        {
          ...mapping,
          kind: 'step',
          event: 'pwa.screen.presented',
          step: 'Issue fixture',
          key: 'stage.name',
          value: 'other',
        },
        ...reasons.map((reason) => ({
          ...mapping,
          kind: 'activity',
          event: resultName,
          step: reason,
          key: 'reason',
          value: reason,
        })),
      ],
    },
    assertSnapshot(snapshot, wires) {
      expect(snapshot.evidence).toHaveLength(wires.length);
      expect(snapshot.model.journeys.length).toBeGreaterThan(0);
      expect(snapshot.model.journeys.every((j) => j.status !== 'completed')).toBe(true);
      expect(JSON.stringify(snapshot)).not.toContain(privateText);
    },
  });
  const capture = createServer(async (request, response) => {
    const parts: Buffer[] = [];
    for await (const part of request) parts.push(part);
    if (request.url !== '/v1/logs') {
      response.writeHead(404).end();
      return;
    }
    const wire = Buffer.concat(parts);
    expect(request.headers.authorization).toBe('Bearer ' + durable.tokens.browser);
    expect(request.headers['content-type']).toBe('application/x-protobuf');
    expect(request.headers['content-encoding']).toBeUndefined();
    batches.push(wire);
    for (const point of captureLogs(wire)) captureOnce(received, point);
    const actual = await fetch(durable.origin + '/v1/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-protobuf',
        Authorization: 'Bearer ' + durable.tokens.browser,
      },
      body: new Uint8Array(wire),
    });
    response
      .writeHead(actual.status, { 'Content-Type': 'application/x-protobuf' })
      .end(Buffer.from(await actual.arrayBuffer()));
  });
  await new Promise<void>((resolve, reject) => {
    capture.once('error', reject);
    capture.listen(0, '127.0.0.1', resolve);
  });
  const origin = 'http://127.0.0.1:' + (capture.address() as AddressInfo).port;
  const root = await mkdtemp(path.join(tmpdir(), 'wfs-issues-live-'));
  const pwa = process.cwd();
  let child: ChildProcess | undefined;
  const logs: string[] = [];
  const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
  const stop = async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exit = once(child, 'exit');
      child.kill('SIGTERM');
      await exit;
    }
    child = undefined;
  };
  const env = {
    ...process.env,
    NEXT_PUBLIC_ENVIRONMENT: 'test',
    HEARTH_SECRET: 'issue-private-hearth',
    WFS_TELEMETRY_ENABLED: 'true',
    WFS_VERSION: version,
    SENTRAME_OTLP_BASE: origin,
    SENTRAME_BROWSER_TOKEN: durable.tokens.browser,
    SENTRAME_SERVER_TOKEN: durable.tokens.server,
    API_INTERNAL_URL: 'http://127.0.0.1:1',
    NEXT_PUBLIC_API_BASE_URL: '',
  };
  const next = path.join(pwa, 'node_modules/next/dist/bin/next');
  const sourceHashes: Record<string, string> = {};
  const run = async (args: string[]) => {
    child = spawn(process.execPath, [next, ...args], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout!.on('data', (data) => logs.push(data.toString()));
    child.stderr!.on('data', (data) => logs.push(data.toString()));
    return child;
  };
  const start = async () => {
    const app = await run(['start', '-H', '127.0.0.1', '-p', '0']);
    return new Promise<string>((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(
        () => reject(new Error('Owned issue Next startup timeout')),
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
      app.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error('Owned issue Next startup exit ' + code));
      });
    });
  };
  const records = (from = 0) => received.slice(from).map(decoded);
  const results = (from = 0) => records(from).filter((p) => p.record.eventName === resultName);
  const settle = async (page: Page) => {
    await page.waitForTimeout(1500);
  };
  try {
    for (const name of [
      'src',
      'public',
      'next.config.js',
      'postcss.config.js',
      'tailwind.config.ts',
      'tsconfig.json',
      'package.json',
      'package-lock.json',
    ])
      await cp(path.join(pwa, name), path.join(root, name), {
        recursive: true,
        filter: (file) => !/\.(test|spec)\.tsx?$/.test(file),
      });
    await cp(path.join(pwa, '..', '.gitignore'), path.join(root, '.gitignore'));
    await symlink(path.join(pwa, 'node_modules'), path.join(root, 'node_modules'));
    const copiedSource = async (directory: string): Promise<string[]> => {
      const entries = await readdir(directory, { withFileTypes: true });
      const groups = await Promise.all(
        entries.map((entry) =>
          entry.isDirectory()
            ? copiedSource(path.join(directory, entry.name))
            : Promise.resolve([path.join(directory, entry.name)])
        )
      );
      return groups.flat();
    };
    for (const file of (await copiedSource(path.join(root, 'src'))).sort()) {
      const name = path.relative(root, file);
      sourceHashes[name] = sha(await readFile(path.join(pwa, name)));
      expect(sha(await readFile(file)), name + ' complete copied source identity').toBe(
        sourceHashes[name]
      );
    }
    const fixtureDir = path.join(root, 'src/app/(app)/issue-fixture');
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(path.join(fixtureDir, 'page.tsx'), composition());
    await writeFile(
      info.outputPath('issue-source-beforebuild.json'),
      JSON.stringify(
        {
          sourceHashes,
          compositionSha256: sha(composition()),
          fixtureSha256: sha(
            await readFile(path.join(pwa, 'e2e/telemetry-issue-results-live.spec.ts'))
          ),
        },
        null,
        2
      )
    );
    const build = await run(['build', '--webpack']);
    const timer = setTimeout(() => build.kill('SIGTERM'), 180_000);
    const [code] = await once(build, 'exit');
    clearTimeout(timer);
    expect(code, logs.join('').slice(-5000)).toBe(0);
    child = undefined;

    async function freshPage(url: string) {
      const context = await browser.newContext({
        serviceWorkers: 'block',
        viewport: { width: 1280, height: 900 },
      });
      contexts.push(context);
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      await context.addCookies([
        { name: 'h_access', value: await generateSecretToken('issue-private-hearth'), url },
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
      const recipe = (id: string) =>
        builders.recipe({
          id: id as any,
          name: privateText,
          description: privateText,
          imageUrl: null,
          sourceType: 'url',
          sourceUrl: 'https://example.invalid/' + privateText,
          canReimport: true,
          imageCount: 0,
          finishedDishIndex: -1,
          isReady: true,
          notes: privateText,
          ingredients: [privateText],
          recipeInstructions: ['Boil water.'] as any,
          importIssue: {
            reasons: ['ingredients'],
            note: privateText,
            status: 'reported',
            isReimporting: false,
            reimportFailureMessage: null,
            reimportFailureImportId: null,
          },
        });
      let mode = 'manual';
      let saveCalls = 0;
      let polls = 0;
      let pending: (() => Promise<void>) | undefined;
      await page.route(/\/api\/recipes\/[^/?]+(?:\?.*)?$/, async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const id = new URL(route.request().url()).pathname.split('/').at(-1)!;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: recipe(id), updatedAt: new Date().toISOString() }),
        });
      });
      await page.route(/\/api\/recipes\/[^/]+\/import-report$/, async (route) => {
        const id = new URL(route.request().url()).pathname.split('/').at(-2)!;
        if (route.request().method() === 'DELETE')
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              recipe: { ...recipe(id), importIssue: null },
              updatedAt: new Date().toISOString(),
            }),
          });
        if (route.request().method() !== 'POST') return route.fallback();
        saveCalls++;
        const selected = mode;
        const respond = async () => {
          if (selected === 'reject')
            return route.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({ status: 400, message: privateText }),
            });
          if (selected === 'lost') return route.abort('failed');
          const reply: Record<string, unknown> = {
            recipe: {
              ...recipe(id),
              importIssue: {
                ...recipe(id).importIssue,
                isReimporting: selected === 'started' || selected === 'reused',
              },
            },
            updatedAt: new Date().toISOString(),
            reimportStarted: selected === 'started' || selected === 'reused',
            importId: selected === 'started' || selected === 'reused' ? MOCK_IDS.PHOTO_NEW : null,
            reimportLaunchFailed: selected === 'launch-failed',
          };
          if (selected === 'missing-flags') delete reply.reimportStarted;
          if (selected === 'missing-detail') delete reply.recipe;
          if (selected === 'inconsistent') {
            reply.reimportStarted = true;
            reply.reimportLaunchFailed = true;
            reply.importId = MOCK_IDS.PHOTO_NEW;
          }
          if (selected === 'wrong-detail') reply.recipe = recipe(id === A ? B : A);
          if (selected === 'raw-update-clock') reply.updatedAt = '1';
          if (selected === 'raw-detail-clock')
            reply.recipe = { ...recipe(id), createdAt: '2026-02-30T00:00:00Z' };
          if (selected === 'raw-import-id') reply.importId = 42;
          if (selected === 'raw-flag') reply.reimportStarted = 'false';
          if (selected === 'raw-name') reply.recipe = { ...recipe(id), name: 42 };
          if (selected === 'raw-image') reply.recipe = { ...recipe(id), imageUrl: { privateText } };
          if (selected === 'raw-reason')
            reply.recipe = {
              ...recipe(id),
              importIssue: { ...recipe(id).importIssue, reasons: ['ingredients', privateText] },
            };
          if (selected === 'raw-note')
            reply.recipe = {
              ...recipe(id),
              importIssue: { ...recipe(id).importIssue, note: { privateText } },
            };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(reply),
          });
        };
        if (selected === 'pending') {
          pending = respond;
          return;
        }
        await respond();
      });
      await page.route('**/api/recipe-imports/*', (route) => {
        polls++;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: MOCK_IDS.PHOTO_NEW,
            workflowId: 'recipe-import',
            status: 'Completed',
            tasks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      });
      await page.goto(url + '/issue-fixture?private=' + privateText);
      await expect(page.getByTestId('fixture-a')).toBeVisible();
      await expect
        .poll(() => records().filter((p) => p.record.eventName === 'pwa.app.opened').length)
        .toBeGreaterThan(0);
      const open = async () => {
        await page.getByTestId('fixture-a').click();
        await expect(page.getByTestId('action-gear-menu')).toBeVisible();
        await page.getByTestId('action-gear-menu').click();
        await page.getByTestId('action-report-import-issue').click();
        await expect(page.getByTestId('import-issue-save')).toBeEnabled();
      };
      const save = async (next: string) => {
        mode = next;
        await page.getByTestId('import-issue-save').click();
        await expect.poll(() => saveCalls).toBeGreaterThan(0);
      };
      const closeIssue = async () => {
        const close = page.getByRole('button', { name: 'Close review issue' });
        if (await close.isVisible()) await close.click();
      };
      return {
        page,
        open,
        save,
        closeIssue,
        setMode: (next: string) => {
          mode = next;
        },
        get saveCalls() {
          return saveCalls;
        },
        get polls() {
          return polls;
        },
        finish: async () => {
          expect(pending).toBeDefined();
          const action = pending!;
          pending = undefined;
          await action();
        },
      };
    }
    let url = await start();
    const happyStart = received.length;
    const happy = await freshPage(url);
    for (const [mode, reason] of [
      ['manual', 'saved_manual'],
      ['manual', 'saved_manual'],
      ['started', 'processing_acknowledged'],
      ['reused', 'processing_acknowledged'],
      ['launch-failed', 'saved_launch_failed'],
      ['reject', 'unconfirmed'],
      ['missing-flags', 'unconfirmed'],
      ['missing-detail', 'unconfirmed'],
      ['inconsistent', 'unconfirmed'],
      ['wrong-detail', 'unconfirmed'],
    ]) {
      await happy.open();
      const before = results(happyStart).length;
      await happy.save(mode);
      await expect.poll(() => results(happyStart).length).toBe(before + 1);
      expect(results(happyStart).at(-1)!.attributes.reason).toBe(reason);
      if (mode === 'launch-failed') {
        await expect(
          happy.page.getByText(
            'We saved your report, but couldn’t start re-import. Try again later.'
          )
        ).toBeVisible();
        await expect(happy.page.getByTestId('import-issue-note')).toHaveValue(privateText);
      }
      await happy.closeIssue();
      await happy.page.getByTestId('fixture-close').click();
    }
    expect(happy.saveCalls).toBe(10);
    expect(happy.polls).toBe(2);
    await settle(happy.page);
    expect(results(happyStart)).toHaveLength(10);
    const happyEnd = received.length;
    await happy.page.context().close();
    await stop();

    url = await start();
    const lifetimeStart = received.length;
    const lifetime = await freshPage(url);
    // A rejected response preserves the draft, then a later explicit retry is distinct.
    await lifetime.open();
    await lifetime.save('reject');
    await expect.poll(() => results(lifetimeStart).length).toBe(1);
    await expect(lifetime.page.getByText('Could not save changes. Try again.')).toBeVisible();
    await expect(lifetime.page.getByTestId('import-issue-note')).toHaveValue(privateText);
    await lifetime.save('manual');
    await expect.poll(() => results(lifetimeStart).length).toBe(2);
    for (const departure of ['issue', 'detail', 'replace', 'hidden']) {
      await lifetime.open();
      const before = lifetime.saveCalls;
      await lifetime.save('pending');
      await expect.poll(() => lifetime.saveCalls).toBe(before + 1);
      if (departure === 'issue') await lifetime.closeIssue();
      if (departure === 'detail') await lifetime.page.getByTestId('fixture-close').click();
      if (departure === 'replace') await lifetime.page.getByTestId('fixture-b').click();
      if (departure === 'hidden')
        await lifetime.page.evaluate(() => {
          Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
          });
          document.dispatchEvent(new Event('visibilitychange'));
        });
      await lifetime.finish();
      await settle(lifetime.page);
      expect(results(lifetimeStart)).toHaveLength(2);
      if (departure === 'hidden') {
        await lifetime.page.evaluate(() => {
          Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
          });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await settle(lifetime.page);
        expect(results(lifetimeStart)).toHaveLength(2);
      }
      await lifetime.closeIssue();
      await lifetime.page.getByTestId('fixture-close').click();
    }
    await lifetime.open();
    await lifetime.save('manual');
    await expect.poll(() => results(lifetimeStart).length).toBe(3);
    const lifetimeEnd = received.length;
    await lifetime.page.context().close();
    await stop();

    url = await start();
    const rawStart = received.length;
    const raw = await freshPage(url);
    for (const mode of [
      'raw-import-id',
      'raw-flag',
      'raw-name',
      'raw-image',
      'raw-reason',
      'raw-note',
      'raw-update-clock',
      'raw-detail-clock',
      'lost',
    ]) {
      await raw.open();
      const before = results(rawStart).length;
      await raw.save(mode);
      await expect.poll(() => results(rawStart).length).toBe(before + 1);
      expect(results(rawStart).at(-1)!.attributes.reason).toBe('unconfirmed');
      await raw.closeIssue();
      await raw.page.getByTestId('fixture-close').click();
    }
    await raw.open();
    await raw.save('manual');
    await expect.poll(() => results(rawStart).length).toBe(10);
    expect(results(rawStart).at(-1)!.attributes.reason).toBe('saved_manual');
    const rawEnd = received.length;
    await raw.page.context().close();
    await stop();

    url = await start();
    const capStart = received.length;
    const cap = await freshPage(url);
    for (let i = 0; i < 12; i++) {
      await cap.open();
      const before = cap.saveCalls;
      await cap.save('manual');
      await expect.poll(() => cap.saveCalls).toBe(before + 1);
      await expect(cap.page.getByRole('dialog', { name: 'Review issue' })).toHaveCount(0);
      await cap.page.getByTestId('fixture-close').click();
      if (i === 5) {
        await cap.page.getByTestId('fixture-a').click();
        await cap.page.getByTestId('fixture-remount').click();
        await expect(cap.page.getByTestId('action-gear-menu')).toBeVisible();
        await cap.page.getByTestId('fixture-close').click();
      }
    }
    await settle(cap.page);
    expect(results(capStart)).toHaveLength(10);
    expect(cap.saveCalls).toBe(12);
    await cap.page.context().close();
    await stop();
    for (const point of records()) {
      const { resource, record, attributes } = point;
      expect(resource.resource.attributes).toEqual(
        expect.arrayContaining([
          { key: 'service.name', value: { stringValue: 'wfs-pwa-browser' } },
          { key: 'service.version', value: { stringValue: version } },
        ])
      );
      expect(resource.scopeLogs[0].scope).toEqual({ name: 'wfs.anonymous' });
      expect(record.severityNumber).toBe(9);
      expect(record.traceId).toBeUndefined();
      expect(record.spanId).toBeUndefined();
      const issue = record.eventName === resultName;
      expect(record.body.stringValue).toBe(
        issue
          ? 'WFS recipe issue result observed'
          : record.eventName === 'pwa.app.opened'
            ? 'WFS opening observed'
            : 'WFS presentation observed'
      );
      expect(Object.keys(attributes).sort()).toEqual(
        [
          'event.id',
          'session.id',
          'source.sequence',
          'stage.name',
          'tab.id',
          ...(issue ? ['reason'] : []),
        ].sort()
      );
      if (issue) {
        expect(reasons).toContain(attributes.reason);
        expect(attributes['stage.name']).toBe('other');
      }
      expect(BigInt(record.timeUnixNano)).toBeLessThanOrEqual(BigInt(record.observedTimeUnixNano));
      for (const sentinel of [
        privateText,
        A,
        B,
        MOCK_IDS.PHOTO_NEW,
        MOCK_IDS.MEMBER_ALEX,
        durable.tokens.browser,
        durable.tokens.server,
        'example.invalid',
      ])
        expect(JSON.stringify(point)).not.toContain(sentinel);
    }
    const streams = new Map<string, number[]>();
    for (const point of records()) {
      const key = String(point.attributes['session.id']);
      const stream = streams.get(key) ?? [];
      stream.push(point.attributes['source.sequence']);
      streams.set(key, stream);
    }
    expect(streams.size).toBe(4);
    for (const sequence of streams.values())
      expect(sequence).toEqual([...new Set(sequence)].sort((a, b) => a - b));
    expect(new Set(results().map((p) => p.attributes['event.id'])).size).toBe(33);
    for (const [name, digest] of Object.entries(sourceHashes)) {
      expect(sha(await readFile(path.join(pwa, name))), name + ' current-source identity').toBe(
        digest
      );
    }
    await durable.qualify(received);
    await writeFile(
      info.outputPath('issue-source-and-runtime.json'),
      JSON.stringify(
        {
          sourceHashes,
          fixtureSha256: sha(
            await readFile(path.join(pwa, 'e2e/telemetry-issue-results-live.spec.ts'))
          ),
          compositionSha256: sha(composition()),
          binarySha256: sha(await readFile(binary)),
          node: process.version,
          protocol: 'http/protobuf',
          compression: 'none',
          counts: {
            happy: happyEnd - happyStart,
            lifetime: lifetimeEnd - lifetimeStart,
            rawValidity: rawEnd - rawStart,
            caps: received.length - capStart,
            total: received.length,
            results: results().length,
          },
          wireHashes: batches.map(sha),
          boundaries: {
            actual:
              'production wrapper/component/root/Action/standard SDK/protected receiver exact replay/reopen',
            business:
              'schema-compliant synthetic browser API routes; malformed response tests intentionally violate contract to qualify fail-closed observation; no API/database claim',
            authority:
              'browser credential only; trusted API facts independently qualified by backend fixture without joining',
            visibility: 'synthetic document visibility; no physical OS claim',
            deploymentAndDevice: 'not run',
          },
        },
        null,
        2
      )
    );
  } finally {
    for (const context of contexts) await context.close();
    await stop();
    capture.closeAllConnections();
    await new Promise<void>((resolve) => capture.close(() => resolve()));
    await durable.close();
    await writeFile(info.outputPath('owned-next-output.txt'), logs.join(''));
    await rm(root, { recursive: true, force: true });
  }
});
