import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Root } from 'protobufjs';

// This live qualification owns a copied app and its synthetic upstream/capture
// server. The selected receiver belongs to its caller; this file never stops it.
// The private credential file is explicit and is never copied to test artifacts.
type Credentials = { base: string; browser: string; server: string; version: string };
type Attribute = { key: string; value: { stringValue?: string; intValue?: string } };
type Span = {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  kind: number;
  attributes?: Attribute[];
  events?: unknown[];
  links?: unknown[];
  traceState?: string;
  status?: { code?: number; message?: string };
};
type ResourceSpans = {
  resource: { attributes?: Attribute[] };
  scopeSpans: { scope: { name: string; version?: string }; spans: Span[] }[];
};
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const attrs = (value: { attributes?: Attribute[] }) =>
  Object.fromEntries(
    (value.attributes ?? []).map(({ key, value }) => [key, value.stringValue ?? value.intValue])
  );
function decoder() {
  const root = new Root();
  const schemas = path.resolve('src/test/otlp-proto');
  root.resolvePath = (_origin, target) => path.resolve(schemas, target);
  root.loadSync('opentelemetry/proto/collector/trace/v1/trace_service.proto');
  const request = root.lookupType(
    'opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest'
  );
  return (wire: Buffer) =>
    request.toObject(request.decode(wire), { longs: String, enums: Number, bytes: String }) as {
      resourceSpans: ResourceSpans[];
    };
}

test('actual Next native spans keep local structure and privacy through the standard exporter', async ({}, info) => {
  test.setTimeout(300_000);
  const credentialsFile = process.env.WFS_NATIVE_RECEIVER_CREDENTIALS;
  if (!credentialsFile)
    throw new Error(
      'Native live qualification requires explicit WFS_NATIVE_RECEIVER_CREDENTIALS for an owned receiver'
    );
  const credentials: Credentials = JSON.parse(await readFile(credentialsFile, 'utf8'));
  const fixtureSeed = randomBytes(4).readUInt32BE(0);
  const pwa = process.cwd();
  const evidenceDir = process.env.WFS_NATIVE_EVIDENCE_DIR || info.outputPath('native');
  await mkdir(evidenceDir, { recursive: true });
  const decode = decoder();
  const root = await mkdtemp(path.join(tmpdir(), 'wfs-native-'));
  const logs: string[] = [];
  const batches: { wire: Buffer; status: number; mode: string }[] = [];
  const spans: Span[] = [];
  const resources: ResourceSpans[] = [];
  const upstreamHeaders: Record<string, string | string[] | undefined>[] = [];
  let receiverMode: 'forward' | 'reject' | 'stall' = 'forward';
  let requests = 0;
  let child: ChildProcess | undefined;
  const receiver = createServer(async (request, response) => {
    if (request.url?.startsWith('/synthetic/')) {
      upstreamHeaders.push(request.headers);
      if (request.url.includes('failure')) {
        request.socket.destroy(new Error('native-private-failure-sentinel'));
        return;
      }
      response.end('native-private-content-sentinel');
      return;
    }
    if (request.url !== '/v1/traces' && request.url !== '/v1/logs') {
      response.writeHead(404).end();
      return;
    }
    const parts: Buffer[] = [];
    for await (const part of request) parts.push(part);
    const wire = Buffer.concat(parts);
    if (request.url === '/v1/logs') {
      // Existing explicit checks/errors remain separately owned log observations.
      response.end();
      return;
    }
    requests++;
    expect(request.headers.authorization === `Bearer ${credentials.server}`).toBe(true);
    expect(request.headers['content-type']).toBe('application/x-protobuf');
    expect(request.headers['content-encoding']).toBeUndefined();
    const decoded = decode(wire);
    resources.push(...decoded.resourceSpans);
    spans.push(...decoded.resourceSpans.flatMap((r) => r.scopeSpans.flatMap((s) => s.spans)));
    if (receiverMode === 'stall') {
      batches.push({ wire, status: 0, mode: receiverMode });
      return;
    }
    if (receiverMode === 'reject') {
      batches.push({ wire, status: 400, mode: receiverMode });
      response.writeHead(400).end();
      return;
    }
    try {
      const actual = await fetch(credentials.base + '/v1/traces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-protobuf',
          Authorization: `Bearer ${credentials.server}`,
        },
        body: new Uint8Array(wire),
      });
      batches.push({ wire, status: actual.status, mode: receiverMode });
      response
        .writeHead(actual.status, { 'Content-Type': 'application/x-protobuf' })
        .end(Buffer.from(await actual.arrayBuffer()));
    } catch {
      batches.push({ wire, status: 502, mode: receiverMode });
      response.writeHead(502).end();
    }
  });
  const stop = async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exit = once(child, 'exit');
      child.kill('SIGTERM');
      await exit;
    }
    child = undefined;
  };
  await new Promise<void>((resolve, reject) => {
    receiver.once('error', reject);
    receiver.listen(0, '127.0.0.1', resolve);
  });
  const captureOrigin = `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`;
  let manifest: Record<string, unknown> = {};
  try {
    const names = [
      'src',
      'public',
      'next.config.js',
      'postcss.config.js',
      'tailwind.config.ts',
      'tsconfig.json',
      'package.json',
      'package-lock.json',
    ];
    for (const name of names)
      await cp(path.join(pwa, name), path.join(root, name), {
        recursive: true,
        filter: (source) => !/\.(test|spec)\.tsx?$/.test(source),
      });
    await cp(path.join(pwa, '..', '.gitignore'), path.join(root, '.gitignore'));
    await symlink(path.join(pwa, 'node_modules'), path.join(root, 'node_modules'));
    const sourceFiles = [
      'src/instrumentation.ts',
      'src/lib/telemetry/server.ts',
      'src/lib/telemetry/sdk.ts',
      'src/lib/telemetry/native.ts',
      'package.json',
      'package-lock.json',
      'next.config.js',
    ];
    const sourceHashes: Record<string, string> = {};
    for (const file of sourceFiles) {
      sourceHashes[file] = sha(await readFile(path.join(pwa, file)));
      expect(sha(await readFile(path.join(root, file))), `${file} copied identity`).toBe(
        sourceHashes[file]
      );
    }
    const serverFile = path.join(root, 'src/lib/telemetry/server.ts');
    const original = await readFile(serverFile, 'utf8');
    // Fixture-only SDK ID composition, using the unchanged production 10% sampler.
    // XOR 1 falls below 10%; XOR ffffffff falls above it. A fresh synthetic seed
    // and process-generation field prevent test runs/restarts sharing trace IDs.
    // No product env seam is added.
    const call = 'createNativeDelivery(config, configuration)';
    const composition = `createNativeDelivery(config, configuration, { idGenerator: {
      generateTraceId() {
        const owner = globalThis as typeof globalThis & { __nativeFixtureId?: number };
        const value = ++owner.__nativeFixtureId! || (owner.__nativeFixtureId = 1);
        const generation = Number(process.env.WFS_NATIVE_FIXTURE_GENERATION || '0');
        const decision = process.env.WFS_NATIVE_FIXTURE_UNSAMPLED === 'true' ? 0xffffffff : 1;
        return [${fixtureSeed}, generation, value, (${fixtureSeed} ^ generation ^ value ^ decision) >>> 0].map(part => part.toString(16).padStart(8, '0')).join('');
      },
      generateSpanId() { return crypto.randomUUID().replaceAll('-', '').slice(0, 16); }
    } })`;
    if (original.includes(call)) await writeFile(serverFile, original.replace(call, composition));
    manifest = {
      root,
      sourceHashes,
      compositionApplied: original.includes(call),
      copiedCompositionSha256: sha(await readFile(serverFile)),
      fixtureSha256: sha(await readFile(path.join(pwa, 'e2e/telemetry-native-live.spec.ts'))),
      protectedRetention:
        'pending caller-owned protected read/exact replay/reopen; HTTP success is not retention evidence',
    };
    const pageDir = path.join(root, 'src/app/(auth)/welcome/native-fixture/[scenario]');
    await mkdir(pageDir, { recursive: true });
    await writeFile(
      path.join(pageDir, 'page.tsx'),
      `
import { reportBrowserTelemetryCheck } from '@/lib/telemetry/actions';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ scenario: string }> }) {
  const { scenario } = await params;
  const count = scenario === 'pressure' ? 400 : 1;
  const results = await Promise.all(Array.from({ length: count }, () => fetch(process.env.WFS_NATIVE_UPSTREAM + '/synthetic/' + scenario + '?private=native-private-url-sentinel', { cache: 'no-store' }).then(r => r.text())));
  return <main><p>{results[0]}</p><form action={reportBrowserTelemetryCheck}><button>synthetic check</button></form></main>;
}
`
    );
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NEXT_PUBLIC_ENVIRONMENT: 'test',
      HEARTH_SECRET: 'native-fixture-synthetic-secret',
      WFS_TELEMETRY_ENABLED: 'true',
      WFS_VERSION: credentials.version,
      SENTRAME_OTLP_BASE: captureOrigin,
      SENTRAME_BROWSER_TOKEN: credentials.browser,
      SENTRAME_SERVER_TOKEN: credentials.server,
      API_INTERNAL_URL: 'http://127.0.0.1:1',
      NEXT_PUBLIC_API_BASE_URL: '',
      WFS_NATIVE_UPSTREAM: captureOrigin,
    };
    for (const key of Object.keys(env))
      if (
        key.startsWith('OTEL_') ||
        key.startsWith('NEXT_OTEL_') ||
        key === 'NEXT_MANUAL_SIG_HANDLE'
      )
        delete env[key];
    const next = path.join(pwa, 'node_modules/next/dist/bin/next');
    const run = (args: string[], runtimeEnv = env, entry = next) => {
      const process = spawn(globalThis.process.execPath, [entry, ...args], {
        cwd: root,
        env: runtimeEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      for (const stream of [process.stdout, process.stderr])
        stream!.on('data', (chunk) => logs.push(chunk.toString()));
      return process;
    };
    child = run(['build', '--webpack']);
    expect((await once(child, 'exit'))[0], logs.join('').slice(-2000)).toBe(0);
    const standalone = path.join(root, '.next/standalone');
    await cp(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });
    await cp(path.join(root, '.next/static'), path.join(standalone, '.next/static'), {
      recursive: true,
    });
    let generation = 0;
    const start = async (overrides: Partial<NodeJS.ProcessEnv> = {}) => {
      logs.length = 0;
      const portOwner = createServer();
      await new Promise<void>((resolve, reject) => {
        portOwner.once('error', reject);
        portOwner.listen(0, '127.0.0.1', resolve);
      });
      const port = (portOwner.address() as AddressInfo).port;
      await new Promise<void>((resolve) => portOwner.close(() => resolve()));
      child = run(
        [],
        {
          ...env,
          WFS_NATIVE_FIXTURE_GENERATION: String(++generation),
          HOSTNAME: '127.0.0.1',
          PORT: String(port),
          ...overrides,
        },
        path.join(standalone, 'server.js')
      );
      let origin = '';
      await expect
        .poll(
          () => {
            origin = logs.join('').match(/http:\/\/127\.0\.0\.1:\d+/)?.[0] || '';
            return origin;
          },
          { timeout: 30_000 }
        )
        .not.toBe('');
      await expect.poll(() => logs.join(''), { timeout: 30_000 }).toContain('Ready');
      return origin;
    };
    let origin = await start();
    const hostile = {
      traceparent: '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01',
      tracestate: 'private=native-private-tracestate-sentinel',
      baggage: 'private=native-private-baggage-sentinel',
      cookie: 'private=native-private-cookie-sentinel',
      connection: 'close',
    };
    const requestPage = async (scenario: string, method = 'GET') => {
      const response = await fetch(
        origin + '/welcome/native-fixture/' + scenario + '?private=native-private-query-sentinel',
        { headers: hostile, method }
      );
      const html = await response.text();
      return { status: response.status, html };
    };
    const first = await requestPage('native-private-id-sentinel');
    expect(first.status).toBe(200);
    await writeFile(path.join(evidenceDir, 'synthetic-response.html'), first.html);
    await expect
      .poll(() => spans.filter((s) => s.name === 'next.render').length, { timeout: 12_000 })
      .toBe(1);
    const firstTrace = spans.find((s) => s.name === 'next.render')!.traceId;
    expect(
      spans
        .filter((s) => s.traceId === firstTrace)
        .map((s) => s.name)
        .sort()
    ).toEqual(['next.fetch', 'next.render', 'next.request']);
    expect((await requestPage('native-private-id-sentinel')).status).toBe(200);
    await expect.poll(() => spans.filter((s) => s.name === 'next.render').length).toBe(2);
    const pageTraces = new Set(spans.filter((s) => s.name === 'next.render').map((s) => s.traceId));
    const roots = spans.filter((s) => s.name === 'next.request' && pageTraces.has(s.traceId));
    expect(roots).toHaveLength(2);
    expect(new Set(roots.map((s) => s.traceId)).size).toBe(2);
    expect(roots.every((s) => !s.parentSpanId)).toBe(true);
    expect(
      roots.every(
        (s) =>
          Buffer.from(s.traceId, 'base64').toString('hex') !== 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      )
    ).toBe(true);
    for (const rootSpan of roots) {
      const family = spans.filter((s) => s.traceId === rootSpan.traceId);
      const ids = new Set(family.map((s) => s.spanId));
      for (const span of family) {
        expect(BigInt(span.endTimeUnixNano)).toBeGreaterThan(BigInt(span.startTimeUnixNano));
        if (span !== rootSpan) expect(ids.has(span.parentSpanId!)).toBe(true);
      }
    }
    expect(
      upstreamHeaders.every(
        (headers) => !headers.traceparent && !headers.tracestate && !headers.baggage
      )
    ).toBe(true);
    // The existing identity gate can defer the page's form DOM while Next still
    // serializes its real compiled Action reference in the Flight payload.
    // Parse JSON data only; never evaluate inline scripts.
    const flight = [...first.html.matchAll(/<script>self\.__next_f\.push\((.*?)\)<\/script>/gs)]
      .map((match) => JSON.parse(match[1]) as [number, string?])
      .filter((part) => part[0] === 1)
      .map((part) => part[1] ?? '')
      .join('');
    const actionId =
      first.html.match(/name="\$ACTION_ID_([^\"]+)"/)?.[1] ??
      flight.match(/:\{"id":"([a-f0-9]+)","bound":null\}/)?.[1];
    expect(actionId, 'real compiled telemetry Server Action is present').toBeTruthy();
    const beforeAction = spans.length;
    const form = new FormData();
    form.set('$ACTION_ID_' + actionId, '');
    const action = await fetch(origin + '/welcome/native-fixture/native-private-id-sentinel', {
      method: 'POST',
      headers: { ...hostile, origin },
      body: form,
    });
    expect(action.status).toBe(200);
    await action.text();
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(spans).toHaveLength(beforeAction);
    expect((await requestPage('head', 'HEAD')).status).toBe(200);
    await expect
      .poll(() =>
        spans.some(
          (span) => span.name === 'next.request' && attrs(span)['http.request.method'] === 'HEAD'
        )
      )
      .toBe(true);
    // A streamed App Router response can retain 200 after its fetch/render fails.
    // Native ERROR status is checked independently of response headers.
    expect([200, 500]).toContain((await requestPage('failure')).status);
    await expect.poll(() => spans.some((s) => s.status?.code === 2)).toBe(true);
    await stop();
    origin = await start({ WFS_NATIVE_FIXTURE_UNSAMPLED: 'true' });
    const beforeUnsampled = spans.length;
    expect((await requestPage('unsampled')).status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(spans).toHaveLength(beforeUnsampled);
    await stop();
    origin = await start({ WFS_TELEMETRY_ENABLED: 'false' });
    expect((await requestPage('disabled')).status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(spans).toHaveLength(beforeUnsampled);
    await stop();
    origin = await start();
    receiverMode = 'reject';
    const beforeFailure = requests;
    expect((await requestPage('rejected')).status).toBe(200);
    await expect.poll(() => requests).toBe(beforeFailure + 1);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(requests).toBe(beforeFailure + 1); // terminal refusal produces no recursive telemetry
    receiverMode = 'stall';
    const beforePressure = requests;
    const started = performance.now();
    expect((await requestPage('pressure')).status).toBe(200);
    expect(performance.now() - started).toBeLessThan(5000);
    await expect.poll(() => requests).toBe(beforePressure + 1);
    await new Promise((resolve) => setTimeout(resolve, 2300));
    expect(requests).toBeLessThanOrEqual(beforePressure + 2);
    for (const resource of resources) {
      expect(attrs(resource.resource)).toEqual({
        'service.name': 'wfs-pwa-server',
        'service.version': credentials.version,
      });
      for (const scope of resource.scopeSpans) {
        expect(scope.scope.name).toBe('next.js');
        for (const span of scope.spans) {
          expect(['next.request', 'next.render', 'next.fetch']).toContain(span.name);
          expect(span.events ?? []).toEqual([]);
          expect(span.links ?? []).toEqual([]);
          expect(span.traceState).toBeUndefined();
          expect(span.status?.message).toBeUndefined();
          expect(
            Object.keys(attrs(span)).every((key) =>
              ['http.request.method', 'http.response.status_code'].includes(key)
            )
          ).toBe(true);
        }
      }
    }
    expect(JSON.stringify(resources)).not.toMatch(
      /native-private-|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbb/
    );
    expect(
      batches.filter((batch) => batch.mode === 'forward').every((batch) => batch.status === 200)
    ).toBe(true);
    const forwardedBatches = batches.filter((batch) => batch.mode === 'forward');
    const forwardedSpans = forwardedBatches.flatMap((batch) =>
      decode(batch.wire).resourceSpans.flatMap((resource) =>
        resource.scopeSpans.flatMap((scope) => scope.spans)
      )
    );
    manifest = {
      ...manifest,
      root,
      sourceHashes,
      copiedCompositionSha256: sha(await readFile(serverFile)),
      idGenerator:
        'fixture-only sampled/unsampled trace IDs; unchanged production ParentBased 0.1 sampler',
      forwardBatchCount: forwardedBatches.length,
      forwardedSpanCount: forwardedSpans.length,
      forwardedTraceIds: [
        ...new Set(
          forwardedSpans.map((span) => Buffer.from(span.traceId, 'base64').toString('hex'))
        ),
      ],
      forwardedSpanIds: forwardedSpans.map((span) => ({
        traceId: Buffer.from(span.traceId, 'base64').toString('hex'),
        spanId: Buffer.from(span.spanId, 'base64').toString('hex'),
      })),
      traceIds: roots.map((s) => Buffer.from(s.traceId, 'base64').toString('hex')),
      protectedRetention:
        'pending caller-owned protected read/exact replay/reopen; HTTP success is not retention evidence',
      signalShutdown: 'standalone best effort; no queued-tail delivery assertion',
      host: 'generated Next standalone server.js with traced production dependencies',
    };
  } finally {
    await stop();
    receiver.closeAllConnections();
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
    for (const [index, batch] of batches.entries())
      await writeFile(path.join(evidenceDir, `batch-${index}.protobuf`), batch.wire);
    await writeFile(
      path.join(evidenceDir, 'emitted.json'),
      JSON.stringify(
        {
          ...manifest,
          spans,
          batches: batches.map(({ wire, status, mode }, index) => ({
            file: `batch-${index}.protobuf`,
            sha256: sha(wire),
            status,
            mode,
          })),
        },
        null,
        2
      ) + '\n'
    );
    await writeFile(path.join(evidenceDir, 'next.log'), logs.join(''));
    await rm(root, { recursive: true, force: true });
  }
});
