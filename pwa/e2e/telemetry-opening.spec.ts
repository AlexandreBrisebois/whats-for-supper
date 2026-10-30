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
test('fresh Search -> real action -> Node capture; navigation suppresses, reload rearms', async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  let receiverMode: 'accept' | 'reject' | 'redirect' | 'timeout' = 'accept';
  let redirects = 0;
  let actionId = '';
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
    if (request.url !== '/v1/logs') {
      redirects++;
      response.end();
      return;
    }
    let body = '';
    for await (const chunk of request) body += chunk;
    received.push({
      path: request.url,
      type: request.headers['content-type'],
      encoding: request.headers['content-encoding'],
      authorization: request.headers.authorization,
      body,
    });
    if (receiverMode === 'timeout') return;
    if (receiverMode === 'redirect') {
      response.writeHead(307, { Location: '/forbidden' }).end();
      return;
    }
    response
      .writeHead(receiverMode === 'reject' ? 503 : 200, { 'Content-Type': 'application/json' })
      .end('{}');
  });
  await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`;
  const root = await mkdtemp(path.join(tmpdir(), 'wfs-opening-'));
  const pwa = process.cwd();
  let child: ReturnType<typeof spawn> | undefined;
  try {
    for (const name of [
      'src',
      'e2e',
      'public',
      'next.config.js',
      'postcss.config.js',
      'tailwind.config.ts',
      'playwright.config.ts',
      'tsconfig.json',
    ]) {
      await cp(path.join(pwa, name), path.join(root, name), { recursive: true });
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
      SENTRAME_BROWSER_TOKEN: 'opening-fixture-browser',
      SENTRAME_SERVER_TOKEN: 'opening-fixture-server',
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
    const { actionResponses, actionDiagnostics, clientScripts, bodyReadErrors, drainBodies } =
      await inspectPage(page);
    await page.goto(`${url}/recipes`);
    await expect(page.getByTestId('nav-item-home')).toBeVisible();
    await expect.poll(() => received.length, { timeout: 20_000 }).toBe(1);
    await expect
      .poll(
        () => ({
          bodies: actionResponses.length,
          errors: bodyReadErrors,
          responses: actionDiagnostics,
        }),
        { timeout: 20_000 }
      )
      .toMatchObject({ bodies: 1, errors: [], responses: ['response 200 action=true'] });
    await drainBodies();
    const documentMarker = await page.evaluate(() => {
      const marker = Math.random();
      (window as Window & { openingFixture?: number }).openingFixture = marker;
      return marker;
    });
    await page.getByTestId('nav-item-home').click();
    await expect(page).toHaveURL(`${url}/home`);
    await expect(page.getByTestId('nav-item-recipes')).toBeVisible();
    await drainBodies();
    await page.getByTestId('nav-item-recipes').click();
    await expect(page).toHaveURL(`${url}/recipes`);
    expect(
      await page.evaluate(() => (window as Window & { openingFixture?: number }).openingFixture)
    ).toBe(documentMarker);
    // Allow delayed forwarding to surface; this is an absence check at the receiver.
    await page.waitForTimeout(2500);
    expect(received).toHaveLength(1);
    await drainBodies();
    await page.reload();
    await expect.poll(() => received.length, { timeout: 20_000 }).toBe(2);
    await expect
      .poll(
        () => ({
          bodies: actionResponses.length,
          errors: bodyReadErrors,
          responses: actionDiagnostics,
        }),
        { timeout: 20_000 }
      )
      .toMatchObject({
        bodies: 2,
        errors: [],
        responses: ['response 200 action=true', 'response 200 action=true'],
      });
    await drainBodies();
    for (const item of received) {
      expect(item.path).toBe('/v1/logs');
      expect(item.type).toBe('application/json');
      expect(item.encoding).toBeUndefined();
      expect(item.authorization).toBe('Bearer opening-fixture-browser');
      expect(JSON.parse(item.body)).toEqual({
        resourceLogs: [
          {
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: 'wfs-pwa-browser' } },
                { key: 'service.version', value: { stringValue: '1.4.2-test.opening' } },
              ],
            },
            scopeLogs: [
              {
                scope: { name: 'wfs.anonymous' },
                logRecords: [
                  {
                    timeUnixNano: expect.stringMatching(/^\d{19}$/),
                    eventName: 'pwa.app.opened',
                    severityNumber: 9,
                    body: { stringValue: 'WFS opening observed' },
                    attributes: [{ key: 'stage.name', value: { stringValue: 'search' } }],
                  },
                ],
              },
            ],
          },
        ],
      });
    }
    const browserContent = [await page.content(), ...actionResponses, ...clientScripts].join('\n');
    for (const privateValue of [endpoint, 'opening-fixture-browser', 'opening-fixture-server'])
      expect(browserContent).not.toContain(privateValue);
    await page.close();
    // Each case owns a fresh browser document; the action and exporter stay real.
    const invitation = await generateSecretToken('opening-fixture-secret');
    const entries = [
      { target: '/recipes', access: false, member: false, screen: 'welcome', arrival: '/welcome' },
      {
        target: '/capture?text=private-share',
        access: false,
        member: false,
        screen: 'welcome',
        arrival: '/welcome',
      },
      {
        target: '/recipes',
        access: true,
        member: false,
        screen: 'onboarding',
        arrival: '/onboarding',
      },
      { target: '/', access: true, member: true, screen: 'home', arrival: '/home' },
      {
        target: `/invite?secret=${invitation}&memberId=${MOCK_IDS.MEMBER_ALEX}`,
        access: false,
        member: false,
        screen: 'invite',
        arrival: '/home',
      },
      {
        target: `/invite?secret=${invitation}&redirect=/discovery`,
        access: false,
        member: true,
        screen: 'invite',
        arrival: '/discovery',
      },
      {
        target: '/invite?secret=rejected-private-token',
        access: false,
        member: false,
        screen: 'invite',
        arrival: '/invite',
      },
      {
        target: '/capture?text=private-text&title=private-title&url=https://private.example',
        access: true,
        member: true,
        screen: 'capture',
        arrival: '/capture',
      },
      {
        target: '/capture?share=private-handoff',
        access: true,
        member: true,
        screen: 'capture',
        arrival: '/capture',
      },
      {
        target: '/capture?pdfShareError=restart',
        access: true,
        member: true,
        screen: 'capture',
        arrival: '/capture',
      },
      {
        target: '/unregistered/private-value',
        access: true,
        member: true,
        screen: 'not.found',
        arrival: '/unregistered/private-value',
      },
    ];
    for (const entry of entries) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      try {
        const cookies = [];
        if (entry.access) cookies.push({ name: 'h_access', value: invitation, url });
        if (entry.member)
          cookies.push({ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url });
        await context.addCookies(cookies);
        const candidate = await context.newPage();
        await candidate.addInitScript(
          ({ member, id }) => {
            localStorage.setItem('locale', 'en');
            if (member)
              localStorage.setItem(
                'family-storage',
                JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
              );
          },
          { member: entry.member, id: MOCK_IDS.MEMBER_ALEX }
        );
        await candidate.route('**/api/**', (route) =>
          route.fulfill({ status: 403, contentType: 'application/json', body: '{}' })
        );
        await setupCommonRoutes(candidate);
        const inspection = await inspectPage(candidate);
        const before = received.length;
        await candidate.goto(`${url}${entry.target}`);
        await expect.poll(() => new URL(candidate.url()).pathname).toBe(entry.arrival);
        await expect.poll(() => received.length, { timeout: 20_000 }).toBe(before + 1);
        await candidate.waitForTimeout(2500);
        expect(received.length, entry.target).toBe(before + 1);
        await expect.poll(() => inspection.actionResponses.length).toBeGreaterThanOrEqual(1);
        await inspection.drainBodies();
        for (const privateValue of [endpoint, 'opening-fixture-browser', 'opening-fixture-server'])
          expect(
            [
              await candidate.content(),
              ...inspection.actionResponses,
              ...inspection.clientScripts,
            ].join('\n')
          ).not.toContain(privateValue);
        const payload = JSON.parse(received[before].body);
        const record = payload.resourceLogs[0].scopeLogs[0].logRecords[0];
        expect(record.attributes, entry.target).toEqual([
          { key: 'stage.name', value: { stringValue: entry.screen } },
        ]);
        expect(Object.keys(record).sort()).toEqual([
          'attributes',
          'body',
          'eventName',
          'severityNumber',
          'timeUnixNano',
        ]);
        expect(received[before].authorization).toBe('Bearer opening-fixture-browser');
        for (const privateValue of ['private-', invitation, MOCK_IDS.MEMBER_ALEX])
          expect(received[before].body).not.toContain(privateValue);
      } finally {
        await context.close();
      }
    }

    // Reuse the optimized build; each runtime cell restarts only this owned Node
    // process and uses fresh documents. No env file or running deployment is touched.
    const runtimeCells = [
      { name: 'disabled', env: { WFS_TELEMETRY_ENABLED: 'false' }, intake: false },
      { name: 'invalid origin', env: { SENTRAME_OTLP_BASE: endpoint + '/private' }, intake: false },
      {
        name: 'equal tokens',
        env: { SENTRAME_BROWSER_TOKEN: 'opening-fixture-server' },
        intake: false,
      },
      { name: 'unsafe token', env: { SENTRAME_BROWSER_TOKEN: 'opening\tfixture' }, intake: false },
      { name: 'rejection', env: {}, intake: true, mode: 'reject' },
      { name: 'redirect', env: {}, intake: true, mode: 'redirect' },
      { name: 'timeout', env: {}, intake: true, mode: 'timeout' },
    ] as const;
    for (const cell of runtimeCells) {
      await stopApp();
      receiverMode = 'mode' in cell ? cell.mode : 'accept';
      url = await startApp({ ...fixtureEnv, ...cell.env });
      const context = await browser.newContext({ serviceWorkers: 'block' });
      try {
        const candidate = await context.newPage();
        const inspection = await inspectPage(candidate);
        await candidate.addInitScript((id) => {
          localStorage.setItem('locale', 'en');
          localStorage.setItem(
            'family-storage',
            JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
          );
        }, MOCK_IDS.MEMBER_ALEX);
        await candidate.route('**/api/**', (route) =>
          route.fulfill({ status: 403, contentType: 'application/json', body: '{}' })
        );
        await setupCommonRoutes(candidate);
        const before = received.length;
        // Exercise access recovery and login while the opening fails or hangs.
        await candidate.goto(`${url}/recipes`);
        await expect(candidate.getByTestId('passphrase-input')).toBeVisible();
        if (cell.intake) await expect.poll(() => received.length).toBe(before + 1);
        else {
          await candidate.waitForTimeout(250);
          expect(inspection.openingResponses, cell.name).toEqual([]);
          expect(received.length, cell.name).toBe(before);
          // The disabled UI is not the authorization boundary. Invoke the actual
          // compiled action with valid data and verify runtime server opt-out too.
          await candidate.evaluate(async (id) => {
            await fetch(location.href, {
              method: 'POST',
              headers: {
                'Next-Action': id,
                'Content-Type': 'text/plain;charset=UTF-8',
                Accept: 'text/x-component',
              },
              body: JSON.stringify([{ screen: 'search' }]),
            });
          }, actionId);
        }
        await candidate.getByTestId('passphrase-input').fill('opening-fixture-secret');
        await candidate.getByTestId('welcome-enter-btn').click();
        await expect(candidate).toHaveURL(`${url}/onboarding`);
        await candidate.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`).click();
        await expect(candidate).toHaveURL(`${url}/home`);
        await expect(candidate.getByTestId('nav-item-recipes')).toBeVisible();
        const marker = await candidate.evaluate(() => {
          (window as Window & { failureDocument?: string }).failureDocument = 'same-document';
          return 'same-document';
        });
        await candidate.getByTestId('nav-item-recipes').click();
        await expect(candidate).toHaveURL(`${url}/recipes`);
        await candidate.evaluate(() => {
          document.dispatchEvent(new Event('visibilitychange'));
          window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        });
        expect(
          await candidate.evaluate(
            () => (window as Window & { failureDocument?: string }).failureDocument
          )
        ).toBe(marker);
        await candidate.waitForTimeout(2500);
        expect(received.length, cell.name).toBe(before + (cell.intake ? 1 : 0));
        await expect.poll(() => inspection.actionResponses.length).toBeGreaterThanOrEqual(1);
        await inspection.drainBodies();
        if (cell.intake) {
          expect(inspection.openingResponses, cell.name).toHaveLength(1);
          const wire = JSON.parse(received[before].body);
          expect(wire.resourceLogs[0].scopeLogs[0].logRecords[0].attributes).toEqual([
            { key: 'stage.name', value: { stringValue: 'welcome' } },
          ]);
          expect(received[before].authorization).toBe('Bearer opening-fixture-browser');
        }
        for (const privateValue of [
          endpoint,
          'opening-fixture-browser',
          'opening-fixture-server',
          'opening\tfixture',
        ])
          expect(
            [
              await candidate.content(),
              ...inspection.actionResponses,
              ...inspection.clientScripts,
            ].join('\n')
          ).not.toContain(privateValue);
      } finally {
        await context.close();
      }
    }
    expect(redirects).toBe(0);

    // Reachable same-origin action: malformed/extended payloads are rejected
    // without Node intake, then the same action still exports an approved input.
    await stopApp();
    receiverMode = 'accept';
    url = await startApp(fixtureEnv);
    const adversary = await browser.newContext({ serviceWorkers: 'block' });
    try {
      const candidate = await adversary.newPage();
      const inspection = await inspectPage(candidate);
      const before = received.length;
      await candidate.goto(`${url}/welcome`);
      await expect.poll(() => received.length).toBe(before + 1);
      await expect.poll(() => inspection.actionResponses.length).toBeGreaterThanOrEqual(1);
      await inspection.drainBodies();
      const validCount = received.length;
      const inputs = [
        null,
        [],
        'search',
        {},
        { screen: 'invented' },
        { screen: 'x'.repeat(10000) },
        ...['destination', 'eventName', 'producer', 'attributes', 'token'].map((key) => ({
          screen: 'search',
          [key]: 'private-injection',
        })),
      ];
      for (const input of inputs) {
        const status = await candidate.evaluate(
          async ({ id, input }) => {
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
            return response.status;
          },
          { id: actionId, input }
        );
        expect(status).toBe(200);
        expect(received).toHaveLength(validCount);
      }
      await candidate.evaluate(async (id) => {
        await fetch(location.href, {
          method: 'POST',
          headers: {
            'Next-Action': id,
            'Content-Type': 'text/plain;charset=UTF-8',
            Accept: 'text/x-component',
          },
          body: JSON.stringify([{ screen: 'search' }]),
        });
      }, actionId);
      await expect.poll(() => received.length).toBe(validCount + 1);
      await expect.poll(() => inspection.actionResponses.length).toBe(inputs.length + 2);
      await inspection.drainBodies();
      // The complete action response must finish while the receiver is stalled.
      // Awaiting response.text() catches exports that delay the streamed response tail.
      receiverMode = 'timeout';
      const elapsed = await candidate.evaluate(async (id) => {
        const start = performance.now();
        const response = await fetch(location.href, {
          method: 'POST',
          headers: {
            'Next-Action': id,
            'Content-Type': 'text/plain;charset=UTF-8',
            Accept: 'text/x-component',
          },
          body: JSON.stringify([{ screen: 'search' }]),
        });
        await response.text();
        if (!response.ok) throw new Error('Opening action failed');
        return performance.now() - start;
      }, actionId);
      expect(elapsed).toBeLessThan(1500);
      await expect.poll(() => received.length).toBe(validCount + 2);
      await expect.poll(() => inspection.actionResponses.length).toBe(inputs.length + 3);
      await inspection.drainBodies();
      receiverMode = 'accept';
      for (const privateValue of [
        endpoint,
        'opening-fixture-browser',
        'opening-fixture-server',
        'private-injection',
      ])
        expect(
          [
            await candidate.content(),
            ...inspection.actionResponses,
            ...inspection.clientScripts,
          ].join('\n')
        ).not.toContain(privateValue);
    } finally {
      await adversary.close();
    }
    for (const item of received) {
      expect(JSON.parse(item.body).resourceLogs[0].resource.attributes).toEqual([
        { key: 'service.name', value: { stringValue: 'wfs-pwa-browser' } },
        { key: 'service.version', value: { stringValue: '1.4.2-test.opening' } },
      ]);
    }
    const payloadPath = testInfo.outputPath('opening-payloads.json');
    await writeFile(
      payloadPath,
      JSON.stringify(
        received.map((item) => JSON.parse(item.body)),
        null,
        2
      )
    );
    await testInfo.attach('opening-payloads', {
      path: payloadPath,
      contentType: 'application/json',
    });
  } finally {
    await initialContext.close();
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise<void>((resolve) => child!.once('exit', () => resolve()));
    }
    receiver.closeAllConnections();
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
