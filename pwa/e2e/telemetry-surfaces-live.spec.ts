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
const C = MOCK_IDS.RECIPE_CHICKEN;
const D = MOCK_IDS.RECIPE_CARBONARA;
const CAP_IDS = Object.entries(MOCK_IDS)
  .filter(([key, value]) => key.startsWith('RECIPE_') && value !== A && value !== C)
  .map(([, value]) => value);
const privateText = 'surface-private-content-sentinel';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOZkAAAAASUVORK5CYII=',
  'base64'
);
const originalImage = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" rx="24" fill="#f5edda"/><circle cx="240" cy="155" r="96" fill="#66816b"/><circle cx="240" cy="155" r="64" fill="#c76549"/><text x="240" y="295" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#343c38">${privateText}</text></svg>`
);
const recipeIdentities = [
  'recipe.detail',
  'recipe.plan',
  'recipe.actions',
  'recipe.filters',
  'recipe.issue',
  'recipe.bin',
  'recipe.purge',
  'original.photos',
  'cooking.reader',
];
const remainingIdentities = [
  'planning.pivot',
  'planning.non_cooking',
  'planning.recovery',
  'discovery.nudge',
  'invite.share',
  'profile.members',
  'demo.introduction',
  'demo.dialog',
  'capture.image_review',
  'capture.bundle_review',
  'capture.upload',
  'capture.queued',
  'capture.ready',
];
const identities = [...recipeIdentities, ...remainingIdentities];
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

// Only synthetic composition is added to the copied app. Real component, store,
// root readiness, Action, SDK and receiver code remain byte-identical to checkout.
// Harness controls replace private recipe identities to exercise stale generations;
// they do not call telemetry or claim real business persistence.
function composition() {
  return `'use client';
import { useState } from 'react';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { CooksMode } from '@/components/planner/CooksMode';
import { RecipeFiltersSheet } from '@/components/recipes/RecipeFiltersSheet';
import { RecycleBinSheet } from '@/components/recipes/RecycleBinSheet';
import { PlanningPivotSheet } from '@/components/planner/PlanningPivotSheet';
import { NonCookingDaySheet } from '@/components/planner/NonCookingDaySheet';
import { SkipRecoveryDialog } from '@/components/home/SkipRecoveryDialog';
import { FamilyNudgeDialog } from '@/components/discovery/FamilyNudgeDialog';
import { InviteLinkDialog } from '@/components/common/InviteLinkDialog';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { DemoDialog } from '@/components/demo/DemoDialog';
import { ImageReview } from '@/components/capture/ImageReview';
import CaptureWithPdf from '@/components/capture/CaptureWithPdf';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';
export default function SurfaceFixture() {
 const [detail, setDetail] = useState<string|null>(null);
 const [extra, setExtra] = useState(false);
 const [cooking, setCooking] = useState<string|null>(null);
 const [filters, setFilters] = useState(false);
 const [bin, setBin] = useState(false);
 const [cycle, setCycle] = useState(0);
 const [owner, setOwner] = useState('none');
 const [extraInvite, setExtraInvite] = useState(false);
 const [reviewImages] = useState(()=>[new File([new Uint8Array(${JSON.stringify([...png])})],'${privateText}.png',{type:'image/png'})]);
 const props = {plannerDayLabel:null,onUseForDay:async()=>{},onFindSimilar:()=>{}};
 return <main>
 <div style={{position:'fixed',top:0,left:0,zIndex:500,display:'flex',gap:4,background:'white'}}>
 ${[
   ['a', A],
   ['b', B],
   ['c', C],
   ['d', D],
 ]
   .map(
     ([label, id]) =>
       `<button data-testid="fixture-${label}" onClick={()=>setDetail('${id}')}>${label}</button>`
   )
   .join('')}
 <button data-testid="fixture-close" onClick={()=>setDetail(null)}>Close detail</button>
 <button data-testid="fixture-extra" onClick={()=>setExtra(v=>!v)}>Extra detail</button>
 <button data-testid="fixture-cook-a" onClick={()=>setCooking('${A}')}>Cook A</button>
 <button data-testid="fixture-cook-c" onClick={()=>setCooking('${C}')}>Cook C</button>
 <button data-testid="fixture-close-cook" onClick={()=>setCooking(null)}>Close cooking</button>
 <button data-testid="fixture-filters" onClick={()=>setFilters(v=>!v)}>Filters</button>
 <button data-testid="fixture-bin" onClick={()=>setBin(v=>!v)}>Bin</button>
 <button data-testid="fixture-cycle" onClick={()=>{const next=cycle+1;setCycle(next);setDetail(${JSON.stringify(CAP_IDS)}[(next-1)%${CAP_IDS.length}]);}}>Replace</button>
 </div>
 <div style={{position:'fixed',top:32,left:0,zIndex:500,display:'flex',gap:4,background:'white'}}>
 <label>Surface fixture <select data-testid="fixture-owner" value={owner} onChange={event=>{setOwner(event.target.value);setExtraInvite(false);}}>
 ${['none', 'pivot', 'non-cooking', 'recovery', 'nudge', 'invite', 'profile', 'dialog', 'capture', 'image'].map((owner) => `<option value="${owner}">${owner}</option>`).join('')}
 </select></label>
 <button data-testid="fixture-extra-invite" onClick={()=>setExtraInvite(value=>!value)}>Extra invitation</button>
 <button data-testid="fixture-pdf-mask" onClick={()=>usePdfCaptureStore.getState().select(new File(['%PDF-1.4 synthetic'],'${privateText}.pdf',{type:'application/pdf'}),'${MOCK_IDS.MEMBER_ALEX}')}>Select private PDF</button>
 <button data-testid="fixture-pdf-reset" onClick={()=>usePdfCaptureStore.getState().reset()}>Clear private PDF</button>
 </div>
 <PlanningPivotSheet isOpen={owner==='pivot'} onClose={()=>setOwner('none')} dayIndex={0} date="2026-10-31" hasRecipe onQuickFind={()=>{}} onSearchLibrary={()=>{}}/>
 {owner==='non-cooking'&&<NonCookingDaySheet date="2026-10-31" plan={{kind:'custom',customLabel:'${privateText}-plan'}} onSave={async()=>{throw new Error('${privateText}-save')}} onClose={()=>setOwner('none')}/>}
 <SkipRecoveryDialog isOpen={owner==='recovery'} step={1} onClose={()=>setOwner('none')} onBack={()=>{}} onAction={()=>{}} replacement={{phase:'retry',message:'${privateText}-recovery',recipeName:'${privateText}-recipe'}}/>
 <FamilyNudgeDialog open={owner==='nudge'} onClose={()=>setOwner('none')}/>
 {owner==='invite'&&<InviteLinkDialog memberId="${MOCK_IDS.MEMBER_ALEX}" memberName="${privateText}-member" onClose={()=>setOwner('none')}/>}
 {owner==='invite'&&extraInvite&&<InviteLinkDialog memberId="${MOCK_IDS.MEMBER_JORDAN}" memberName="${privateText}-other-member" onClose={()=>setExtraInvite(false)}/>}
 {owner==='profile'&&<div style={{marginTop:80}}><ProfileDropdown onSelect={()=>{}}/></div>}
 {owner==='dialog'&&<DemoDialog title="${privateText}-title" description="${privateText}-description" onClose={()=>setOwner('none')}><p>${privateText}-dialog</p></DemoDialog>}
 {owner==='capture'&&<div style={{marginTop:80}}><CaptureWithPdf/></div>}
 {owner==='image'&&<div style={{marginTop:80}}><ImageReview images={reviewImages} onDelete={()=>{}}/></div>}
 {detail&&<RecipeDetailSheet {...props} recipeId={detail} onClose={()=>setDetail(null)}/>}
 {extra&&<RecipeDetailSheet {...props} recipeId='${B}' onClose={()=>setExtra(false)}/>}
 {cooking&&<CooksMode recipe={{id:cooking,name:'${privateText}',image:'/surface-hero.png'}} onClose={()=>setCooking(null)}/>}
 {filters&&<RecipeFiltersSheet activeFilters={{}} activePreferences={{}} filterMetadata={null} onApply={()=>setFilters(false)} onClose={()=>setFilters(false)}/>}
 {bin&&<RecycleBinSheet onClose={()=>setBin(false)}/>}
 </main>;
}`;
}

test('actual loaded recipe/original presentation and bounded static surfaces survive protected replay/reopen', async ({
  browser,
}, info) => {
  test.setTimeout(420_000);
  const binary = process.env.WFS_OTEL_SENTRAME_BINARY;
  if (!binary)
    throw new Error(
      'Surface live qualification requires explicit WFS_OTEL_SENTRAME_BINARY for a fresh owned receiver'
    );
  const version = '1.4.2-test.surfaces';
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
          step: 'Synthetic composition',
          key: 'stage.name',
          value: 'other',
        },
        ...identities.flatMap((identity) =>
          ['opened', 'closed'].map((state) => ({
            ...mapping,
            kind: 'activity',
            event: 'pwa.surface.' + state,
            step: identity + ' ' + state,
            key: 'stage.name',
            value: identity,
          }))
        ),
        {
          ...mapping,
          kind: 'activity',
          event: 'pwa.recipe_detail.presented',
          step: 'Loaded detail',
          key: 'stage.name',
          value: 'other',
        },
        {
          ...mapping,
          kind: 'activity',
          event: 'pwa.original.presented',
          step: 'Rendered original image',
          key: 'reason',
          value: 'image',
        },
        {
          ...mapping,
          kind: 'activity',
          event: 'pwa.original.requested',
          step: 'External original requested',
          key: 'reason',
          value: 'external',
        },
      ],
    },
    assertSnapshot(snapshot, wires) {
      expect(snapshot.evidence).toHaveLength(wires.length);
      for (const point of wires) {
        const { record, attributes } = decoded(point);
        const row = snapshot.evidence.find((item) => item.record === attributes['event.id']);
        expect(row).toMatchObject({
          name: record.eventName,
          source: 'browser',
          signal: 'logs',
          service: 'wfs-pwa-browser',
          version,
          scope: attributes['session.id'],
          tab: attributes['tab.id'],
          sequence: attributes['source.sequence'],
          time: record.timeUnixNano,
          observed: record.observedTimeUnixNano,
          attrs: {
            'stage.name': attributes['stage.name'],
            ...(attributes.reason ? { reason: attributes.reason } : {}),
          },
        });
      }
      expect(snapshot.model.journeys.length).toBeGreaterThan(0);
      expect(snapshot.model.journeys.every((journey) => journey.status !== 'completed')).toBe(true);
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
  const root = await mkdtemp(path.join(tmpdir(), 'wfs-surfaces-live-'));
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
    HEARTH_SECRET: 'surface-private-hearth',
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
        () => reject(new Error('Owned surface Next startup timeout')),
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
        reject(new Error('Owned surface Next startup exit ' + code));
      });
    });
  };
  const records = (from = 0) => received.slice(from).map(decoded);
  const count = (name: string, from = 0) =>
    records(from).filter((point) => point.record.eventName === name).length;
  const surfaceCount = (state: string, identity: string, from = 0) =>
    records(from).filter(
      (point) =>
        point.record.eventName === 'pwa.surface.' + state &&
        point.attributes['stage.name'] === identity
    ).length;
  const settle = async (page: Page) => {
    await page.waitForTimeout(1400);
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
    for (const name of [
      'src/lib/telemetry/server.ts',
      'src/lib/telemetry/sdk.ts',
      'src/lib/telemetry/opening.ts',
      'src/lib/telemetry/surfaces.ts',
      'src/lib/telemetry/navigation.ts',
      'src/components/telemetry/OpeningObserver.tsx',
      'src/components/telemetry/useSurfacePresentation.ts',
      ...[
        'RecipeDetailSheet',
        'OriginalPhotosViewer',
        'ActionGearMenu',
        'RecipeFiltersSheet',
        'RecipeImportIssueSheet',
        'RecycleBinSheet',
      ].map((name) => 'src/components/recipes/' + name + '.tsx'),
      'src/components/planner/CooksMode.tsx',
      'src/components/common/Modal.tsx',
      'package.json',
      'package-lock.json',
    ]) {
      sourceHashes[name] = sha(await readFile(path.join(pwa, name)));
      expect(sha(await readFile(path.join(root, name))), name + ' source copy').toBe(
        sourceHashes[name]
      );
    }
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
    const fixtureDir = path.join(root, 'src/app/(app)/surface-fixture');
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(path.join(fixtureDir, 'page.tsx'), composition());
    await writeFile(
      info.outputPath('surface-source-beforebuild.json'),
      JSON.stringify(
        {
          sourceHashes,
          compositionSha256: sha(composition()),
          fixtureSha256: sha(await readFile(path.join(pwa, 'e2e/telemetry-surfaces-live.spec.ts'))),
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

    async function freshPage(url: string, demoMode = false) {
      const context = await browser.newContext({
        serviceWorkers: 'block',
        viewport: { width: 1280, height: 900 },
      });
      contexts.push(context);
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      page.setDefaultNavigationTimeout(30_000);
      await context.addCookies([
        { name: 'h_access', value: await generateSecretToken('surface-private-hearth'), url },
        { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url },
      ]);
      await page.addInitScript((id) => {
        localStorage.setItem('locale', 'en');
        localStorage.setItem(
          'family-storage',
          JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
        );
        Object.assign(window, { surfaceLaunches: 0 });
        window.open = () => {
          (window as Window & { surfaceLaunches?: number }).surfaceLaunches =
            ((window as Window & { surfaceLaunches?: number }).surfaceLaunches ?? 0) + 1;
          return null;
        };
      }, MOCK_IDS.MEMBER_ALEX);
      await page.route('**/api/**', (route) =>
        route.fulfill({ status: 403, contentType: 'application/json', body: '{}' })
      );
      await setupCommonRoutes(page, undefined, { demoMode });
      await page.route('**/api/family', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              builders.familyMember({ id: MOCK_IDS.MEMBER_ALEX, name: privateText + '-member' }),
              builders.familyMember({
                id: MOCK_IDS.MEMBER_JORDAN,
                name: privateText + '-other-member',
              }),
            ],
          }),
        });
      });
      await page.route('**/surface-hero.png', (route) =>
        route.fulfill({ status: 200, contentType: 'image/png', body: png })
      );
      const modes = new Map<string, 'pending' | 'fail'>();
      const pending = new Map<string, (success: boolean) => Promise<void>>();
      const imageModes = new Map<number, 'pending' | 'fail'>();
      const pendingImages = new Map<number, (success: boolean) => Promise<void>>();
      const recipe = (id: string) =>
        builders.recipe({
          id: id as any,
          name: privateText + '-' + id,
          description: privateText,
          imageUrl: '/surface-hero.png',
          sourceType: (id === C ? 'url' : 'photos') as any,
          sourceUrl: id === C ? 'https://example.invalid/' + privateText : null,
          imageCount: 32,
          finishedDishIndex: 0,
          notes: privateText,
          ingredients: [privateText],
          recipeInstructions: ['Boil water.', 'Cook pasta.'] as any,
        });
      await page.route(/\/api\/recipes\/[^/?]+(?:\?.*)?$/, async (route) => {
        const id = new URL(route.request().url()).pathname.split('/').at(-1)!;
        if (route.request().method() !== 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: {} }),
          });
          return;
        }
        const complete = async (success: boolean) => {
          if (success)
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ recipe: recipe(id), updatedAt: new Date().toISOString() }),
            });
          else
            await route.fulfill({
              status: 503,
              headers: { 'Retry-After': '0' },
              contentType: 'application/json',
              body: JSON.stringify({ errorCode: 'RECOVERY_BUSY', message: privateText }),
            });
        };
        if (modes.get(id) === 'pending') {
          pending.set(id, complete);
          return;
        }
        await complete(modes.get(id) !== 'fail');
      });
      await page.route(/\/api\/recipes\/[^/]+\/original\/\d+/, async (route) => {
        const index = Number(new URL(route.request().url()).pathname.split('/').at(-1));
        const complete = async (success: boolean) => {
          await route.fulfill({
            status: success ? 200 : 404,
            contentType: success ? 'image/svg+xml' : 'text/plain',
            body: success ? originalImage : privateText,
          });
        };
        if (imageModes.get(index) === 'pending') {
          pendingImages.set(index, complete);
          return;
        }
        await complete(imageModes.get(index) !== 'fail');
      });
      await page.route('**/api/recipes/trash', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              items: [
                {
                  id: A,
                  name: privateText,
                  imageUrl: '/surface-hero.png',
                  deletedAt: new Date().toISOString(),
                  deletedBy: MOCK_IDS.MEMBER_ALEX,
                },
              ],
            },
          }),
        })
      );
      const captureReplies: ((success: boolean) => Promise<void>)[] = [];
      await page.route(/\/api\/recipes(?:\?.*)?$/, async (route) => {
        if (route.request().method() === 'POST') {
          captureReplies.push(async (success) => {
            await route.fulfill({
              status: success ? 202 : 503,
              headers: success ? {} : { 'Retry-After': '0' },
              contentType: 'application/json',
              body: JSON.stringify(
                success ? { data: { id: A } } : { errorCode: 'RECOVERY_BUSY', message: privateText }
              ),
            });
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            recipes: [],
            updatedAt: new Date().toISOString(),
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          }),
        });
      });
      let bundleAttempts = 0;
      await page.route('**/api/recipes/import-bundle', (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({
          status: ++bundleAttempts === 1 ? 400 : 201,
          contentType: 'application/json',
          body: JSON.stringify(
            bundleAttempts === 1 ? { message: privateText } : { data: recipe(A) }
          ),
        });
      });
      await page.goto(url + '/surface-fixture?private=' + privateText);
      await expect(page.getByTestId('fixture-a')).toBeVisible();
      return { page, modes, pending, imageModes, pendingImages, captureReplies };
    }

    let url = await start();
    const first = await freshPage(url);
    const { page, modes, pending, imageModes, pendingImages } = first;
    await expect.poll(() => count('pwa.app.opened')).toBe(1);
    modes.set(A, 'pending');
    modes.set(B, 'fail');
    await page.getByTestId('fixture-a').click();
    await expect(page.getByText('Loading recipe...', { exact: true })).toBeVisible();
    await expect.poll(() => surfaceCount('opened', 'recipe.detail')).toBe(1);
    expect(count('pwa.recipe_detail.presented')).toBe(0);
    await page.getByTestId('fixture-b').click();
    await expect(page.getByTestId('recipe-detail-retry')).toBeVisible({ timeout: 15_000 });
    await settle(page);
    expect(count('pwa.recipe_detail.presented')).toBe(0);
    modes.delete(B);
    await page.getByTestId('recipe-detail-retry').click();
    await expect(page.getByTestId('recipe-detail-name')).toContainText(B);
    await expect.poll(() => count('pwa.recipe_detail.presented')).toBe(1);
    await page.getByTestId('fixture-c').click();
    await expect(page.getByTestId('recipe-detail-name')).toContainText(C);
    await pending.get(A)!(true);
    await expect.poll(() => count('pwa.recipe_detail.presented')).toBe(2);
    await settle(page);
    expect(count('pwa.recipe_detail.presented')).toBe(2);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.getByTestId('fixture-d').click();
    await expect(page.getByTestId('recipe-detail-name')).toContainText(D);
    await settle(page);
    expect(count('pwa.recipe_detail.presented')).toBe(2);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => count('pwa.recipe_detail.presented')).toBe(3);
    // The same loaded entry is stable through private note edits and rerenders.
    await page.getByTestId('recipe-notes-input').fill(privateText + '-edited');
    await page.getByTestId('action-gear-menu').click();
    await expect.poll(() => surfaceCount('opened', 'recipe.actions')).toBe(1);
    await page.getByTestId('action-gear-menu').click();
    await expect.poll(() => surfaceCount('closed', 'recipe.actions')).toBe(1);
    await page.getByTestId('action-cook-this').click();
    await expect.poll(() => surfaceCount('opened', 'recipe.plan')).toBe(1);
    await settle(page);
    expect(count('pwa.recipe_detail.presented')).toBe(3);
    await page.getByTestId('fixture-close').click();
    await expect.poll(() => surfaceCount('closed', 'recipe.plan')).toBe(1);
    await expect.poll(() => surfaceCount('closed', 'recipe.detail')).toBe(1);
    modes.delete(A);
    await page.getByTestId('fixture-a').click();
    await expect.poll(() => count('pwa.recipe_detail.presented')).toBe(4);
    await page.getByTestId('fixture-extra').click();
    await expect.poll(() => count('pwa.recipe_detail.presented')).toBe(5);
    await page.getByTestId('fixture-close').click();
    await settle(page);
    expect(surfaceCount('closed', 'recipe.detail')).toBe(1);
    await page.getByTestId('fixture-extra').click();
    await expect.poll(() => surfaceCount('closed', 'recipe.detail')).toBe(2);

    imageModes.set(0, 'pending');
    await page.getByTestId('fixture-a').click();
    await expect(page.getByTestId('recipe-detail-name')).toBeVisible();
    await page.getByTestId('action-view-original').click();
    await expect.poll(() => surfaceCount('opened', 'original.photos')).toBe(1);
    expect(count('pwa.original.presented')).toBe(0);
    await expect.poll(() => pendingImages.has(0)).toBe(true);
    await pendingImages.get(0)!(false);
    imageModes.delete(0);
    await settle(page);
    expect(count('pwa.original.presented')).toBe(0);
    await page.getByRole('button', { name: 'Next', exact: true }).first().click();
    await expect.poll(() => count('pwa.original.presented')).toBe(1);
    await page.getByRole('button', { name: 'View Original ×2.5', exact: true }).click();
    await page.locator('img[alt="Recipe photo 2"]').dispatchEvent('load');
    await settle(page);
    expect(count('pwa.original.presented')).toBe(1);
    imageModes.set(2, 'pending');
    await page.getByRole('button', { name: 'Next', exact: true }).first().click();
    await expect.poll(() => pendingImages.has(2)).toBe(true);
    await page.getByRole('button', { name: 'Back', exact: true }).first().click();
    await expect.poll(() => count('pwa.original.presented')).toBe(2);
    await pendingImages.get(2)!(true);
    imageModes.delete(2);
    await settle(page);
    expect(count('pwa.original.presented')).toBe(2);
    await page.getByTestId('action-close-viewer').click();
    await expect.poll(() => surfaceCount('closed', 'original.photos')).toBe(1);
    await page.getByTestId('fixture-c').click();
    await expect(page.getByTestId('recipe-detail-name')).toContainText(C);
    await page.getByTestId('action-view-original').click();
    await expect.poll(() => count('pwa.original.requested')).toBe(1);
    expect(
      await page.evaluate(() => (window as Window & { surfaceLaunches?: number }).surfaceLaunches)
    ).toBe(1);
    await page.getByTestId('fixture-close').click();
    await page.getByTestId('fixture-cook-c').click();
    await page.getByTestId('cooks-mode-original').click();
    await expect.poll(() => count('pwa.original.requested')).toBe(2);
    await page.getByTestId('fixture-close-cook').click();
    await page.getByTestId('fixture-cook-a').click();
    await page.getByTestId('ingredient-toggle').first().click();
    await expect(page.getByTestId('ingredient-toggle').first()).toHaveAttribute(
      'aria-checked',
      'true'
    );
    const cookingPosition = await page.getByTestId('cooks-mode-step-indicator').textContent();
    await page.getByTestId('cooks-mode-original').click();
    await expect(page.getByRole('dialog', { name: 'View Original' })).toBeVisible();
    await expect.poll(() => count('pwa.original.presented')).toBe(3);
    await page.screenshot({
      path: info.outputPath('actual-nested-surface-browser.png'),
      fullPage: true,
    });
    await page.getByTestId('action-close-viewer').click();
    await expect(page.getByTestId('cooks-mode-original')).toBeFocused();
    await expect(page.getByTestId('ingredient-toggle').first()).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(page.getByTestId('cooks-mode-step-indicator')).toHaveText(cookingPosition!);
    await page.getByTestId('fixture-close-cook').click();
    await page.getByTestId('fixture-filters').click();
    await expect.poll(() => surfaceCount('opened', 'recipe.filters')).toBe(1);
    await page.getByTestId('fixture-filters').click();
    await expect.poll(() => surfaceCount('closed', 'recipe.filters')).toBe(1);
    await page.getByTestId('fixture-a').click();
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-report-import-issue').click();
    await expect.poll(() => surfaceCount('opened', 'recipe.issue')).toBe(1);
    await page
      .getByRole('dialog', { name: 'Report issue', exact: true })
      .getByRole('button', { name: 'Close report issue', exact: true })
      .click();
    await expect.poll(() => surfaceCount('closed', 'recipe.issue')).toBe(1);
    await page.getByTestId('fixture-close').click();
    await page.getByTestId('fixture-bin').click();
    await page.getByTestId('action-purge-' + A).click();
    await expect.poll(() => surfaceCount('opened', 'recipe.purge')).toBe(1);
    await page.getByTestId('elevated-pin-input').fill('surface-private-pin');
    await page.getByTestId('elevated-pin-cancel').click();
    await expect.poll(() => surfaceCount('closed', 'recipe.purge')).toBe(1);
    await page.getByTestId('fixture-bin').click();
    await expect.poll(() => surfaceCount('closed', 'recipe.bin')).toBe(1);
    await settle(page);
    const happyEnd = received.length;
    console.log('Surface live: loaded/stale/image/external/nested owners qualified');
    expect(
      records().every(
        (point) =>
          !point.record.eventName.includes('return') && !point.record.eventName.includes('success')
      )
    ).toBe(true);
    for (const identity of recipeIdentities)
      expect(surfaceCount('opened', identity), identity).toBeGreaterThan(0);
    await page.context().close();
    await stop();

    // Every remaining inventory owner runs through its production rendering
    // boundary in a fresh document/process, independent of M4 admission pressure.
    url = await start();
    const inventoryStart = received.length;
    const inventory = await freshPage(url, true);
    const choose = (owner: string) =>
      inventory.page.getByTestId('fixture-owner').selectOption(owner);
    await expect.poll(() => count('pwa.app.opened', inventoryStart)).toBe(1);
    await inventory.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await choose('pivot');
    await expect(inventory.page.getByTestId('pivot-sheet')).toBeVisible();
    await choose('none');
    await expect(inventory.page.getByTestId('pivot-sheet')).toHaveCount(0);
    await inventory.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await settle(inventory.page);
    expect(surfaceCount('opened', 'planning.pivot', inventoryStart)).toBe(0);
    await choose('pivot');
    await expect.poll(() => surfaceCount('opened', 'planning.pivot', inventoryStart)).toBe(1);
    await inventory.page.getByTestId('pivot-sheet-backdrop').click({ position: { x: 1, y: 150 } });
    await expect.poll(() => surfaceCount('closed', 'planning.pivot', inventoryStart)).toBe(1);
    await choose('pivot');
    await expect.poll(() => surfaceCount('opened', 'planning.pivot', inventoryStart)).toBe(2);
    await choose('non-cooking');
    await expect.poll(() => surfaceCount('closed', 'planning.pivot', inventoryStart)).toBe(2);
    await expect.poll(() => surfaceCount('opened', 'planning.non_cooking', inventoryStart)).toBe(1);
    await inventory.page.getByTestId('non-cooking-custom-label').fill(privateText + '-edited-plan');
    await inventory.page.getByTestId('non-cooking-save').click();
    await expect(inventory.page.getByTestId('non-cooking-sheet').getByRole('alert')).toContainText(
      'Could not save'
    );
    await settle(inventory.page);
    expect(surfaceCount('opened', 'planning.non_cooking', inventoryStart)).toBe(1);
    await inventory.page.getByTestId('non-cooking-close').click();
    await expect.poll(() => surfaceCount('closed', 'planning.non_cooking', inventoryStart)).toBe(1);
    await choose('recovery');
    await expect(inventory.page.getByTestId('replacement-feedback')).toContainText(privateText);
    await expect.poll(() => surfaceCount('opened', 'planning.recovery', inventoryStart)).toBe(1);
    await inventory.page.getByTestId('recovery-close').click();
    await expect.poll(() => surfaceCount('closed', 'planning.recovery', inventoryStart)).toBe(1);
    await choose('nudge');
    await expect(inventory.page.getByTestId('planner-nudge-dialog')).toBeVisible();
    await expect.poll(() => surfaceCount('opened', 'discovery.nudge', inventoryStart)).toBe(1);
    await inventory.page.keyboard.press('Escape');
    await expect.poll(() => surfaceCount('closed', 'discovery.nudge', inventoryStart)).toBe(1);
    await choose('invite');
    await expect(inventory.page.getByTestId('invite-dialog')).toContainText(privateText);
    await expect.poll(() => surfaceCount('opened', 'invite.share', inventoryStart)).toBe(1);
    await inventory.page.getByTestId('fixture-extra-invite').click();
    await expect(inventory.page.getByTestId('invite-dialog')).toHaveCount(2);
    await inventory.page.getByTestId('invite-dialog-close').last().click();
    await expect(inventory.page.getByTestId('invite-dialog')).toHaveCount(1);
    await settle(inventory.page);
    expect(surfaceCount('opened', 'invite.share', inventoryStart)).toBe(1);
    expect(surfaceCount('closed', 'invite.share', inventoryStart)).toBe(0);
    await inventory.page.getByTestId('invite-dialog-close').click();
    await expect.poll(() => surfaceCount('closed', 'invite.share', inventoryStart)).toBe(1);
    await choose('profile');
    await inventory.page.getByTestId('profile-dropdown-toggle').click();
    await expect(inventory.page.getByTestId('profile-dropdown-menu')).toContainText(privateText);
    await expect.poll(() => surfaceCount('opened', 'profile.members', inventoryStart)).toBe(1);
    await inventory.page.keyboard.press('Escape');
    await expect.poll(() => surfaceCount('closed', 'profile.members', inventoryStart)).toBe(1);
    await inventory.page.getByTestId('profile-dropdown-toggle').click();
    await expect.poll(() => surfaceCount('opened', 'profile.members', inventoryStart)).toBe(2);
    await inventory.page.getByTestId('profile-dropdown-option-' + MOCK_IDS.MEMBER_JORDAN).click();
    await expect.poll(() => surfaceCount('closed', 'profile.members', inventoryStart)).toBe(2);
    await choose('none');
    // The ordinary deep link did not auto-open the introduction. The real band
    // opens the real native dialog; neither its label nor body selects identity.
    expect(surfaceCount('opened', 'demo.introduction', inventoryStart)).toBe(0);
    await inventory.page.getByTestId('demo-context-band').focus();
    await inventory.page.getByTestId('demo-context-band').press('Enter');
    await expect(inventory.page.getByRole('dialog')).toHaveJSProperty('open', true);
    await expect.poll(() => surfaceCount('opened', 'demo.introduction', inventoryStart)).toBe(1);
    await inventory.page.keyboard.press('Escape');
    await expect.poll(() => surfaceCount('closed', 'demo.introduction', inventoryStart)).toBe(1);
    await inventory.page.getByTestId('demo-context-band').focus();
    await inventory.page.getByTestId('demo-context-band').press('Enter');
    await expect.poll(() => surfaceCount('opened', 'demo.introduction', inventoryStart)).toBe(2);
    await inventory.page.getByRole('button', { name: 'Start exploring', exact: true }).click();
    await expect.poll(() => surfaceCount('closed', 'demo.introduction', inventoryStart)).toBe(2);
    await choose('dialog');
    await expect(inventory.page.getByRole('dialog')).toHaveJSProperty('open', true);
    await expect.poll(() => surfaceCount('opened', 'demo.dialog', inventoryStart)).toBe(1);
    await inventory.page
      .getByRole('dialog')
      .evaluate((dialog) => (dialog as HTMLDialogElement).close());
    await expect.poll(() => surfaceCount('closed', 'demo.dialog', inventoryStart)).toBe(1);
    await choose('none');
    await choose('dialog');
    await expect.poll(() => surfaceCount('opened', 'demo.dialog', inventoryStart)).toBe(2);
    await inventory.page.keyboard.press('Escape');
    await expect.poll(() => surfaceCount('closed', 'demo.dialog', inventoryStart)).toBe(2);
    await settle(inventory.page);
    const inventoryEnd = received.length;
    console.log('Surface live: remaining planning/sharing/member/native owners qualified');
    await inventory.page.context().close();
    await stop();

    url = await start();
    const captureStart = received.length;
    const capturePage = await freshPage(url);
    const captureOwner = (owner: string) =>
      capturePage.page.getByTestId('fixture-owner').selectOption(owner);
    const photo = { name: privateText + '-photo.png', mimeType: 'image/png', buffer: png };
    await expect.poll(() => count('pwa.app.opened', captureStart)).toBe(1);
    await captureOwner('capture');
    await expect(capturePage.page.getByTestId('capture-gallery-input')).toBeAttached();
    await expect(capturePage.page.getByTestId('capture-gallery-input')).toBeHidden();
    await settle(capturePage.page);
    for (const identity of remainingIdentities.filter((identity) =>
      identity.startsWith('capture.')
    ))
      expect(surfaceCount('opened', identity, captureStart)).toBe(0);
    // ImageReview thumbnails are distinct from its actual lightbox presentation.
    await captureOwner('image');
    await expect(capturePage.page.getByRole('img', { name: 'Photo 1', exact: true })).toBeVisible();
    await settle(capturePage.page);
    expect(surfaceCount('opened', 'capture.image_review', captureStart)).toBe(0);
    await capturePage.page.getByTestId('capture-image-preview-open-btn').click();
    await expect(capturePage.page.getByTestId('capture-image-preview')).toBeVisible();
    await expect.poll(() => surfaceCount('opened', 'capture.image_review', captureStart)).toBe(1);
    await capturePage.page.getByRole('button', { name: 'Close Preview', exact: true }).click();
    await expect.poll(() => surfaceCount('closed', 'capture.image_review', captureStart)).toBe(1);
    await capturePage.page.getByTestId('capture-image-preview-open-btn').click();
    await expect.poll(() => surfaceCount('opened', 'capture.image_review', captureStart)).toBe(2);
    await captureOwner('none');
    await expect.poll(() => surfaceCount('closed', 'capture.image_review', captureStart)).toBe(2);

    // The real photo upload is held at the API boundary. Departure suppresses its
    // later queued panel; a failed foreground attempt can then be explicitly retried.
    await captureOwner('capture');
    await capturePage.page.getByTestId('capture-gallery-input').setInputFiles(photo);
    await capturePage.page.getByTestId('capture-save-btn').click();
    await expect(capturePage.page.getByTestId('capture-photo-upload-overlay')).toBeVisible();
    await expect.poll(() => surfaceCount('opened', 'capture.upload', captureStart)).toBe(1);
    await expect.poll(() => capturePage.captureReplies.length).toBe(1);
    await captureOwner('none');
    await capturePage.captureReplies[0](true);
    await expect.poll(() => surfaceCount('closed', 'capture.upload', captureStart)).toBe(1);
    await settle(capturePage.page);
    expect(surfaceCount('opened', 'capture.queued', captureStart)).toBe(0);
    expect(surfaceCount('opened', 'capture.ready', captureStart)).toBe(0);
    await captureOwner('capture');
    await capturePage.page.getByTestId('capture-gallery-input').setInputFiles(photo);
    await capturePage.page.getByTestId('capture-save-btn').click();
    await expect.poll(() => surfaceCount('opened', 'capture.upload', captureStart)).toBe(2);
    await expect.poll(() => capturePage.captureReplies.length).toBe(2);
    await capturePage.captureReplies[1](false);
    await expect.poll(() => surfaceCount('closed', 'capture.upload', captureStart)).toBe(2);
    await expect(capturePage.page.getByTestId('capture-save-btn')).toBeEnabled();
    expect(surfaceCount('opened', 'capture.queued', captureStart)).toBe(0);
    await capturePage.page.getByTestId('capture-save-btn').click();
    await expect.poll(() => surfaceCount('opened', 'capture.upload', captureStart)).toBe(3);
    await expect.poll(() => capturePage.captureReplies.length).toBe(3);
    await capturePage.captureReplies[2](true);
    await expect(capturePage.page.getByTestId('capture-success-heading')).toHaveText(
      'Recipe queued'
    );
    await expect.poll(() => surfaceCount('opened', 'capture.queued', captureStart)).toBe(1);
    await capturePage.page.evaluate(
      ({ recipeId, name }) => {
        (window as any).__libraryStore
          .getState()
          .pushNotification({ recipeId, name, type: 'ready' });
      },
      { recipeId: A, name: privateText + '-ready' }
    );
    await expect(capturePage.page.getByTestId('capture-success-heading')).toContainText(
      privateText + '-ready'
    );
    await expect.poll(() => surfaceCount('closed', 'capture.queued', captureStart)).toBe(1);
    await expect.poll(() => surfaceCount('opened', 'capture.ready', captureStart)).toBe(1);
    await captureOwner('none');
    await expect.poll(() => surfaceCount('closed', 'capture.ready', captureStart)).toBe(1);

    const bundle = builders.recipeShareBundle({
      recipe: {
        ...builders.recipeShareBundle().recipe,
        name: privateText + '-bundle',
        notes: privateText + '-notes',
      },
      hero: { mimeType: 'image/png', base64: png.toString('base64') },
      originals: [],
    });
    const bundleFile = {
      name: privateText + '.recipe',
      mimeType: 'text/plain',
      buffer: Buffer.from(JSON.stringify(bundle)),
    };
    await captureOwner('capture');
    await capturePage.page.getByTestId('import-recipe-file-input').setInputFiles(bundleFile);
    await expect(capturePage.page.getByTestId('bundle-preview-name')).toHaveText(
      privateText + '-bundle'
    );
    await expect.poll(() => surfaceCount('opened', 'capture.bundle_review', captureStart)).toBe(1);
    // CaptureWithPdf really retains MinimalCapture under a hidden ancestor.
    // A synthetic foreground PDF selection exercises that actual production seam.
    await capturePage.page.getByTestId('fixture-pdf-mask').click();
    await expect(capturePage.page.getByTestId('pdf-confirmation')).toBeVisible();
    await expect(capturePage.page.getByTestId('bundle-preview-card')).toBeHidden();
    await expect.poll(() => surfaceCount('closed', 'capture.bundle_review', captureStart)).toBe(1);
    await capturePage.page.getByTestId('fixture-pdf-reset').click();
    await expect(capturePage.page.getByTestId('bundle-preview-card')).toBeVisible();
    await expect.poll(() => surfaceCount('opened', 'capture.bundle_review', captureStart)).toBe(2);
    await capturePage.page.getByTestId('reject-bundle-btn').click();
    await expect.poll(() => surfaceCount('closed', 'capture.bundle_review', captureStart)).toBe(2);
    await capturePage.page.getByTestId('import-recipe-file-input').setInputFiles(bundleFile);
    await expect.poll(() => surfaceCount('opened', 'capture.bundle_review', captureStart)).toBe(3);
    await capturePage.page.getByTestId('accept-bundle-btn').click();
    await expect(capturePage.page.getByTestId('bundle-import-error')).toBeVisible();
    await settle(capturePage.page);
    expect(surfaceCount('opened', 'capture.bundle_review', captureStart)).toBe(3);
    expect(surfaceCount('opened', 'capture.ready', captureStart)).toBe(1);
    await capturePage.page.getByTestId('accept-bundle-btn').click();
    await expect(capturePage.page.getByTestId('bundle-import-success')).toBeVisible();
    await expect.poll(() => surfaceCount('closed', 'capture.bundle_review', captureStart)).toBe(3);
    await expect.poll(() => surfaceCount('opened', 'capture.ready', captureStart)).toBe(2);
    await captureOwner('none');
    await expect.poll(() => surfaceCount('closed', 'capture.ready', captureStart)).toBe(2);
    expect(count('pwa.recipe_detail.presented', captureStart)).toBe(0);
    for (const identity of remainingIdentities) {
      expect(surfaceCount('opened', identity, inventoryStart), identity).toBeGreaterThan(0);
      expect(surfaceCount('closed', identity, inventoryStart), identity).toBeGreaterThan(0);
    }
    await settle(capturePage.page);
    const captureEnd = received.length;
    console.log(
      'Surface live: capture rendering/hidden/upload/interrupted/retry/status owners qualified'
    );
    await capturePage.page.context().close();
    await stop();

    // A recreated owned process resets only its producer admission window. A fresh
    // document proves shared lifetime caps survive component remount/replacement.
    url = await start();
    const capsStart = received.length;
    const caps = await freshPage(url);
    await caps.page.getByTestId('fixture-a').click();
    await expect.poll(() => count('pwa.recipe_detail.presented', capsStart)).toBe(1);
    expect(CAP_IDS.length).toBeGreaterThanOrEqual(22);
    for (const id of CAP_IDS) {
      await caps.page.getByTestId('fixture-cycle').click();
      await expect(caps.page.getByTestId('recipe-detail-name')).toContainText(id);
    }
    await settle(caps.page);
    expect(count('pwa.recipe_detail.presented', capsStart)).toBe(20);
    await caps.page.getByTestId('action-view-original').click();
    await expect.poll(() => count('pwa.original.presented', capsStart)).toBe(1);
    for (let i = 1; i <= 22; i++) {
      await caps.page.getByRole('button', { name: 'Next', exact: true }).first().click();
      await expect(caps.page.locator('img[alt="Recipe photo ' + (i + 1) + '"]')).toBeVisible();
      await caps.page.waitForFunction(
        (index) =>
          [...document.images].some(
            (img) => img.alt === 'Recipe photo ' + index && img.complete && img.naturalWidth > 0
          ),
        i + 1
      );
    }
    await settle(caps.page);
    expect(count('pwa.original.presented', capsStart)).toBe(20);
    await caps.page.getByTestId('action-close-viewer').click();
    await caps.page.getByTestId('fixture-c').click();
    await expect(caps.page.getByTestId('recipe-detail-name')).toContainText(C);
    await caps.page.getByTestId('action-view-original').click();
    await settle(caps.page);
    expect(count('pwa.original.requested', capsStart)).toBe(0);
    expect(
      await caps.page.evaluate(
        () => (window as Window & { surfaceLaunches?: number }).surfaceLaunches
      )
    ).toBe(1);
    await caps.page.getByTestId('fixture-close').click();
    await caps.page.getByTestId('fixture-a').click();
    await expect(caps.page.getByTestId('recipe-detail-name')).toContainText(A);
    await settle(caps.page);
    expect(count('pwa.recipe_detail.presented', capsStart)).toBe(20);
    const capEnd = received.length;
    console.log('Surface live: shared detail/original lifetime caps qualified');
    await caps.page.context().close();
    await stop();

    url = await start();
    const stormStart = received.length;
    const storm = await freshPage(url);
    await storm.page.getByTestId('fixture-a').click();
    await expect(storm.page.getByTestId('action-gear-menu')).toBeVisible();
    for (let i = 0; i < 70; i++) await storm.page.getByTestId('action-gear-menu').click();
    await settle(storm.page);
    const limited = records(stormStart);
    expect(
      limited.filter(
        (point) =>
          point.record.eventName === 'pwa.screen.presented' ||
          point.record.eventName.startsWith('pwa.surface.')
      )
    ).toHaveLength(60);
    expect(count('pwa.app.opened', stormStart)).toBe(1);
    expect(count('pwa.recipe_detail.presented', stormStart)).toBe(1);
    expect(surfaceCount('opened', 'recipe.actions', stormStart)).toBeLessThan(35);
    console.log('Surface live: shared surface admission budget qualified');
    await storm.page.context().close();
    await stop();

    for (const point of received) {
      const { resource, record, attributes } = decoded(point);
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
      expect(record.body.stringValue).toBe(
        record.eventName.startsWith('pwa.original.')
          ? 'WFS original observation'
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
          ...(record.eventName.startsWith('pwa.original.') ? ['reason'] : []),
        ].sort()
      );
      if (record.eventName === 'pwa.original.presented') expect(attributes.reason).toBe('image');
      if (record.eventName === 'pwa.original.requested') expect(attributes.reason).toBe('external');
      if (!record.eventName.startsWith('pwa.surface.'))
        expect(attributes['stage.name']).toBe('other');
      else expect(identities).toContain(attributes['stage.name']);
      expect(point.body).not.toMatch(
        /surface-private|example\.invalid|44665544|550e8400|surface-hero|recipeId|imageCount|photoIndex/
      );
      for (const secret of [
        durable.tokens.browser,
        durable.tokens.server,
        MOCK_IDS.MEMBER_ALEX,
        MOCK_IDS.MEMBER_JORDAN,
      ])
        expect(point.body).not.toContain(secret);
    }
    const streams = new Map<string, number[]>();
    for (const point of records()) {
      const scope = point.attributes['session.id'] as string;
      const sequence = streams.get(scope) ?? [];
      sequence.push(point.attributes['source.sequence'] as number);
      streams.set(scope, sequence);
    }
    expect(streams.size).toBe(5);
    for (const sequence of streams.values())
      expect(sequence).toEqual(sequence.map((_, index) => index + 1));
    await durable.qualify(received);
    await writeFile(
      info.outputPath('surface-source-and-runtime.json'),
      JSON.stringify(
        {
          sourceHashes,
          fixtureSha256: sha(await readFile(path.join(pwa, 'e2e/telemetry-surfaces-live.spec.ts'))),
          compositionSha256: sha(composition()),
          binarySha256: sha(await readFile(binary)),
          node: process.version,
          protocol: 'http/protobuf',
          compression: 'none',
          counts: {
            happy: happyEnd,
            remainingInventory: inventoryEnd - inventoryStart,
            capture: captureEnd - captureStart,
            caps: capEnd - capsStart,
            storm: received.length - stormStart,
            total: received.length,
          },
          wireHashes: batches.map(sha),
          independentBoundaries: {
            businessApi: 'schema-compliant synthetic browser routes; no persistence claim',
            actual:
              'production components/root/Action/SDK and fresh protected receiver/replay/reopen',
            external: 'request only; blocked window.open returns null',
            nativeDialog:
              'actual Chromium showModal/open, close event and Escape; failed showModal qualified by component tests separately',
            hiddenCapture:
              'actual CaptureWithPdf hidden ancestor and real foreground PDF store selection; PDF bytes not submitted',
            captureReadiness:
              'presentation only; synthetic API response and library notification do not prove persistence or processing',
            imageReview:
              'actual reusable ImageReview component in synthetic composition; no existing production consumer is claimed',
            visibility:
              'synthetic document.visibilityState transition; physical OS visibility not qualified',
            deploymentAndPhysicalDevice: 'not run',
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
