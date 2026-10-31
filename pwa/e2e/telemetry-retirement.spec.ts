import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';
import { generateSecretToken } from './auth-utils';

// The copy retains actual root/identity/components and Node instrumentation. Only
// fixture composition is added; business HTTP is doubled at its external boundary.
// No Sentrame binary, OTLP decoder, provider or shared development host is used.
const composition = `'use client';
import Link from 'next/link';
import { useState } from 'react';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
export default function RetirementFixture(){
 const [detail,setDetail]=useState(false);
 const [failure,setFailure]=useState(false);
 if(failure) throw new Error('Synthetic retirement render failure');
 return <main><h1>Retirement fixture</h1>
 <Link data-testid="retirement-navigation" href="/retirement-b">Next screen</Link>
 <button data-testid="retirement-detail" onClick={()=>setDetail(true)}>Recipe detail</button>
 <button data-testid="retirement-error" onClick={()=>setFailure(true)}>Render failure</button>
 {detail&&<RecipeDetailSheet recipeId="${MOCK_IDS.RECIPE_LASAGNA}" plannerDayLabel={null}
 onUseForDay={async()=>{}} onFindSimilar={()=>{}} onClose={()=>setDetail(false)}/>}
 </main>;
}`;
const sha = (value: Buffer) => createHash('sha256').update(value).digest('hex');

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? sourceFiles(path.join(directory, entry.name))
          : Promise.resolve([path.join(directory, entry.name)])
      )
    )
  ).flat();
}

async function stop(child?: ChildProcess) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
  await once(child, 'exit');
  clearTimeout(timeout);
}

test('legacy telemetry configuration cannot activate collection while navigation, Save and error recovery work', async ({
  browser,
}, info) => {
  test.setTimeout(300_000);
  const requests: { path: string; method: string }[] = [];
  let probes = 0;
  const sink = createServer(async (request, response) => {
    for await (const chunk of request) void chunk;
    if (request.url === '/reachability') probes++;
    else requests.push({ path: request.url ?? '', method: request.method ?? '' });
    response.writeHead(200, { 'Content-Type': 'application/x-protobuf' }).end();
  });
  await new Promise<void>((resolve) => sink.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${(sink.address() as AddressInfo).port}`;
  await fetch(endpoint + '/reachability');
  expect(probes).toBe(1);
  const root = await mkdtemp(path.join(tmpdir(), 'wfs-retirement-'));
  const pwa = process.cwd();
  const context = await browser.newContext({ serviceWorkers: 'block' });
  let child: ChildProcess | undefined;
  let appOrigin = '';
  const output: string[] = [];
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
    ]) {
      await cp(path.join(pwa, name), path.join(root, name), {
        recursive: true,
        filter: (file) => !/\.(test|spec)\.tsx?$/.test(file),
      });
    }
    await cp(path.join(pwa, '..', '.gitignore'), path.join(root, '.gitignore'));
    await symlink(path.join(pwa, 'node_modules'), path.join(root, 'node_modules'));
    const sourceHashes: Record<string, string> = {};
    for (const file of await sourceFiles(path.join(root, 'src'))) {
      const name = path.relative(root, file);
      sourceHashes[name] = sha(await readFile(path.join(pwa, name)));
      expect(sha(await readFile(file)), name + ' production copy').toBe(sourceHashes[name]);
    }
    for (const route of ['retirement-a', 'retirement-b']) {
      const directory = path.join(root, 'src/app/(app)', route);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, 'page.tsx'), composition);
    }
    const serverFailure = path.join(root, 'src/app/(app)/retirement-failure');
    await mkdir(serverFailure, { recursive: true });
    await writeFile(
      path.join(serverFailure, 'page.tsx'),
      "import { connection } from 'next/server'; export default async function Failure(){await connection();throw new Error('Synthetic Node retirement failure');}"
    );
    await writeFile(info.outputPath('source-identity.json'), JSON.stringify(sourceHashes, null, 2));
    const environment: NodeJS.ProcessEnv = {
      ...process.env,
      NEXT_PUBLIC_ENVIRONMENT: 'test',
      HEARTH_SECRET: 'retirement-fixture-secret',
      DEMO_MODE: 'false',
      WFS_TELEMETRY_ENABLED: 'true',
      WFS_VERSION: 'retirement-fixture',
      SENTRAME_OTLP_BASE: endpoint,
      SENTRAME_BROWSER_TOKEN: 'retirement-fixture-browser',
      SENTRAME_SERVER_TOKEN: 'retirement-fixture-server',
      API_INTERNAL_URL: 'http://127.0.0.1:1',
      NEXT_PUBLIC_API_BASE_URL: '',
    };
    // Ambient headers must not invalidate the deliberate baseline configuration.
    for (const key of Object.keys(environment))
      if (key.startsWith('OTEL_')) delete environment[key];
    const next = path.join(pwa, 'node_modules/next/dist/bin/next');
    child = spawn(process.execPath, [next, 'build', '--webpack'], {
      cwd: root,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const build = child;
    build.stdout!.on('data', (chunk: Buffer) => output.push(chunk.toString()));
    build.stderr!.on('data', (chunk: Buffer) => output.push(chunk.toString()));
    const timer = setTimeout(() => build.kill('SIGTERM'), 180_000);
    const [code] = await once(build, 'exit');
    clearTimeout(timer);
    expect(code, output.join('').slice(-6000)).toBe(0);
    const manifest = await readFile(
      path.join(root, '.next/server/server-reference-manifest.json'),
      'utf8'
    );
    child = spawn(process.execPath, [next, 'start', '-H', '127.0.0.1', '-p', '0'], {
      cwd: root,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const app = child;
    let startup = '';
    app.stdout!.on('data', (chunk: Buffer) => {
      startup += chunk.toString();
      output.push(chunk.toString());
    });
    app.stderr!.on('data', (chunk: Buffer) => output.push(chunk.toString()));
    await expect
      .poll(() => /http:\/\/127\.0\.0\.1:\d+/.exec(startup)?.[0], { timeout: 30_000 })
      .toBeTruthy();
    const origin = /http:\/\/127\.0\.0\.1:\d+/.exec(startup)![0];
    appOrigin = origin;
    await context.addCookies([
      {
        name: 'h_access',
        value: await generateSecretToken('retirement-fixture-secret'),
        url: origin,
      },
      { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: origin },
    ]);
    const page = await context.newPage();
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
    let recipe = builders.recipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Retirement fixture pasta',
      sourceType: 'url',
      canReimport: true,
      imageCount: 0,
      finishedDishIndex: -1,
      isReady: true,
      importIssue: null,
    });
    let saves = 0;
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}**`, async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname.endsWith('/import-report') && request.method() === 'POST') {
        saves++;
        const draft = request.postDataJSON();
        recipe = {
          ...recipe,
          importIssue: {
            status: 'reported',
            reasons: draft.reasons,
            note: draft.note ?? null,
            isReimporting: false,
            reimportFailureMessage: null,
            reimportFailureImportId: null,
          },
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            updatedAt: new Date().toISOString(),
            recipe,
            reimportStarted: false,
            importId: null,
            reimportLaunchFailed: false,
          }),
        });
      } else if (
        request.method() === 'GET' &&
        pathname === `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe }),
        });
      } else await route.fulfill({ status: 405, contentType: 'application/json', body: '{}' });
    });
    const actions: string[] = [];
    page.on('request', (request) => {
      if (request.headers()['next-action']) actions.push(request.url());
    });
    await page.goto(origin + '/retirement-a');
    await expect(page.getByTestId('retirement-detail')).toBeVisible();
    // Wait beyond the former one-second SDK schedule, without asserting timing of
    // business work. Baseline must fail here because actual production emitted.
    await page.waitForTimeout(2500);
    expect(requests, 'legacy config must not create an export pipeline').toEqual([]);
    expect(actions, 'root must not submit telemetry forwarding Actions').toEqual([]);
    await page.getByTestId('retirement-navigation').click();
    await expect(page).toHaveURL(origin + '/retirement-b');
    await page.getByTestId('retirement-detail').click();
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-report-import-issue').click();
    await page.getByTestId('import-issue-reason-duplicate').click();
    await page.getByTestId('import-issue-save').click();
    await expect.poll(() => saves).toBe(1);
    await expect(page.getByRole('dialog', { name: 'Report issue' })).toHaveCount(0);
    await expect(page.getByTestId('recipe-import-issue-status-reported')).toBeVisible();
    await page.goto(origin + '/retirement-b');
    await page.getByTestId('retirement-error').click();
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('retirement-detail')).toBeVisible();
    await page.goto(origin + '/retirement-failure');
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await page.goto(origin + '/retirement-a');
    await expect(page.getByTestId('retirement-detail')).toBeVisible();
    await page.waitForTimeout(2500);
    expect(requests).toEqual([]);
    expect(actions).toEqual([]);
    expect(manifest).not.toMatch(
      /reportBrowserObservation|reportBrowserError|reportBrowserTelemetryCheck|readErrorReportingEnabled/
    );
    for (const [name, hash] of Object.entries(sourceHashes)) {
      expect(sha(await readFile(path.join(pwa, name))), name + ' current-source identity').toBe(
        hash
      );
    }
    await writeFile(
      info.outputPath('retirement-summary.json'),
      JSON.stringify(
        {
          copiedProductionInputs: Object.keys(sourceHashes).length,
          sinkReachabilityProbes: probes,
          exportRequests: requests.length,
          forwardingActions: actions.length,
          manualSaves: saves,
          root: 'production',
          businessAPI: 'schema-compliant browser mocks',
          phases: [
            'entry',
            'navigation',
            'detail',
            'manual Save',
            'client render error/reset',
            'Node render error',
            'navigation recovery',
          ],
        },
        null,
        2
      )
    );
  } finally {
    await context.close();
    await stop(child);
    sink.closeAllConnections();
    await new Promise<void>((resolve) => sink.close(() => resolve()));
    await writeFile(info.outputPath('owned-next-output.txt'), output.join(''));
    await rm(root, { recursive: true, force: true });
    await writeFile(
      info.outputPath('resource-cleanup.json'),
      JSON.stringify(
        {
          appOrigin,
          sinkOrigin: endpoint,
          temporaryRoot: root,
          ownedProcessId: child?.pid ?? null,
          ownedProcessExited: !child || child.exitCode !== null || child.signalCode !== null,
          browserContextClosed: true,
          sinkClosed: !sink.listening,
          temporaryRootRemoved: true,
        },
        null,
        2
      )
    );
  }
});
