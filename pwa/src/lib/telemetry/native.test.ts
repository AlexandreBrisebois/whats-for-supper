import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, it, vi } from 'vitest';
import {
  ROOT_CONTEXT,
  SpanKind,
  TraceFlags,
  context,
  propagation,
  trace,
} from '@opentelemetry/api';
import { suppressTracing } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, SamplingDecision, type ReadableSpan } from '@opentelemetry/sdk-trace';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { createNativeDelivery, nativeSampler, projectNativeSpan } from './native';

const config = {
  base: 'http://127.0.0.1:1',
  browser: 'synthetic-browser',
  server: 'synthetic-server',
  version: 'native-test',
};
const rootAttrs = { 'next.span_type': 'BaseServer.handleRequest', 'http.method': 'GET' };
const sampled = '00000000000000000000000000000001';
const unsampled = '000000000000000000000000ffffffff';
const safeResource = resourceFromAttributes({
  'service.name': 'wfs-pwa-server',
  'service.version': config.version,
});
const ids = {
  generateTraceId: () => sampled,
  generateSpanId: () => crypto.randomUUID().replaceAll('-', '').slice(0, 16),
};
let receiver: Server | undefined;
let delivery: ReturnType<typeof createNativeDelivery> | undefined;
afterEach(async () => {
  receiver?.closeAllConnections();
  if (receiver) await new Promise<void>((r) => receiver!.close(() => r()));
  await delivery?.shutdown().catch(() => {});
  receiver = undefined;
  delivery = undefined;
  vi.restoreAllMocks();
});
function source(): ReadableSpan {
  return {
    name: 'GET /private-sentinel?token=private-sentinel',
    kind: SpanKind.SERVER,
    spanContext: () => ({
      traceId: sampled,
      spanId: '0000000000000001',
      traceFlags: TraceFlags.SAMPLED,
      traceState: { serialize: () => 'private-sentinel' } as never,
    }),
    parentSpanContext: undefined,
    startTime: [1, 2],
    endTime: [2, 3],
    duration: [1, 1],
    ended: true,
    attributes: {
      ...rootAttrs,
      'http.status_code': 503,
      'http.target': 'private-sentinel',
      'user.id': 'private-sentinel',
    },
    status: { code: 2, message: 'private-sentinel' },
    events: [
      { name: 'private-sentinel', time: [1, 3], attributes: { private: 'private-sentinel' } },
    ],
    links: [
      {
        context: { traceId: unsampled, spanId: '0000000000000002', traceFlags: 1 },
        attributes: { private: 'private-sentinel' },
      },
    ],
    resource: resourceFromAttributes({ 'host.name': 'private-sentinel' }),
    instrumentationScope: {
      name: 'next.js',
      version: 'private-sentinel',
      schemaUrl: 'private-sentinel',
      attributes: { private: 'private-sentinel' },
    } as ReadableSpan['instrumentationScope'],
    droppedAttributesCount: 1,
    droppedEventsCount: 1,
    droppedLinksCount: 1,
  };
}
it('projects an explicit safe view before batching without retaining raw fields or closures', () => {
  const input = source(),
    safe = projectNativeSpan(input, safeResource)!;
  expect(safe).not.toBeNull();
  expect(safe.name).toBe('next.request');
  expect(safe.attributes).toEqual({
    'http.request.method': 'GET',
    'http.response.status_code': 503,
  });
  expect(safe.status).toEqual({ code: 2 });
  expect(safe.events).toEqual([]);
  expect(safe.links).toEqual([]);
  expect(safe.resource.attributes).toEqual(safeResource.attributes);
  expect(safe.instrumentationScope).toEqual({ name: 'next.js' });
  expect(safe.spanContext()).toEqual({
    traceId: sampled,
    spanId: '0000000000000001',
    traceFlags: 1,
  });
  expect(safe.startTime).toEqual([1, 2]);
  expect(safe.endTime).toEqual([2, 3]);
  expect(safe.kind).toBe(SpanKind.SERVER);
  input.attributes['http.method'] = 'DELETE';
  input.startTime[0] = 9;
  expect(safe.attributes['http.request.method']).toBe('GET');
  expect(safe.startTime).toEqual([1, 2]);
  expect(JSON.stringify(safe)).not.toContain('private-sentinel');
});
it.each([
  ['AppRender.getBodyResult', 'next.render'],
  ['AppRender.fetch', 'next.fetch'],
])('maps reviewed native operation %s to %s', (type, name) => {
  const input = source();
  input.attributes['next.span_type'] = type;
  expect(projectNativeSpan(input, safeResource)?.name).toBe(name);
});
it('drops unsupported scope, operation and remote-parent spans', () => {
  expect(
    projectNativeSpan({ ...source(), instrumentationScope: { name: 'private' } }, safeResource)
  ).toBeNull();
  const input = source();
  input.attributes['next.span_type'] = 'private';
  expect(projectNativeSpan(input, safeResource)).toBeNull();
  expect(
    projectNativeSpan(
      {
        ...source(),
        parentSpanContext: {
          traceId: sampled,
          spanId: '0000000000000002',
          traceFlags: 1,
          isRemote: true,
        },
      },
      safeResource
    )
  ).toBeNull();
});
it('uses the standard 10% local-root sampler and inherits only local parent decisions', () => {
  const sampler = nativeSampler();
  let count = 0;
  for (let i = 1; i <= 10000; i++) {
    const id = Math.floor((i / 10001) * 0xffffffff)
      .toString(16)
      .padStart(32, '0');
    if (
      sampler.shouldSample(ROOT_CONTEXT, id, 'private', SpanKind.SERVER, rootAttrs, []).decision ===
      SamplingDecision.RECORD_AND_SAMPLED
    )
      count++;
  }
  expect(count).toBeGreaterThanOrEqual(999);
  expect(count).toBeLessThanOrEqual(1001);
  for (const flags of [TraceFlags.NONE, TraceFlags.SAMPLED])
    for (const isRemote of [false, true]) {
      const parent = trace.setSpanContext(ROOT_CONTEXT, {
        traceId: sampled,
        spanId: '0000000000000001',
        traceFlags: flags,
        isRemote,
      });
      expect(
        sampler.shouldSample(
          parent,
          unsampled,
          'private',
          SpanKind.INTERNAL,
          { 'next.span_type': 'AppRender.fetch' },
          []
        ).decision
      ).toBe(
        !isRemote && flags === TraceFlags.SAMPLED
          ? SamplingDecision.RECORD_AND_SAMPLED
          : SamplingDecision.NOT_RECORD
      );
    }
});
it.each(['POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'CONNECT', 'TRACE', 'unknown', ''])(
  'suppresses %s roots and their entire child tree',
  (method) => {
    const sampler = nativeSampler();
    expect(
      sampler.shouldSample(
        ROOT_CONTEXT,
        sampled,
        'private',
        SpanKind.SERVER,
        { ...rootAttrs, 'http.method': method },
        []
      ).decision
    ).toBe(0);
    delivery = createNativeDelivery(config, () => config, { idGenerator: ids });
    const tracer = delivery.provider.getTracer('next.js');
    const root = tracer.startSpan(
      'private',
      { kind: SpanKind.SERVER, attributes: { ...rootAttrs, 'http.method': method } },
      ROOT_CONTEXT
    );
    expect(root.isRecording()).toBe(false);
    const child = tracer.startSpan(
      'private',
      { attributes: { 'next.span_type': 'AppRender.fetch' } },
      trace.setSpan(ROOT_CONTEXT, root)
    );
    expect(child.isRecording()).toBe(false);
    child.end();
    root.end();
  }
);
it('fails closed for unknown root classification and accepts HEAD', () => {
  const sampler = nativeSampler();
  expect(
    sampler.shouldSample(
      ROOT_CONTEXT,
      sampled,
      'GET',
      SpanKind.SERVER,
      { 'http.method': 'GET' },
      []
    ).decision
  ).toBe(0);
  expect(
    sampler.shouldSample(ROOT_CONTEXT, sampled, 'GET', SpanKind.INTERNAL, rootAttrs, []).decision
  ).toBe(0);
  expect(
    sampler.shouldSample(
      ROOT_CONTEXT,
      sampled,
      'HEAD',
      SpanKind.SERVER,
      { ...rootAttrs, 'http.method': 'HEAD' },
      []
    ).decision
  ).toBe(2);
});
it('keeps async context local and ignores hostile inbound/outbound propagation and baggage', async () => {
  let enabled = true;
  delivery = createNativeDelivery(config, () => (enabled ? config : null), { idGenerator: ids });
  delivery.register();
  const carrier = {
    traceparent: '00-ffffffffffffffffffffffffffffffff-ffffffffffffffff-01',
    tracestate: 'private=sentinel',
    baggage: 'private=sentinel',
  };
  const extracted = propagation.extract(ROOT_CONTEXT, carrier);
  expect(trace.getSpanContext(extracted)).toBeUndefined();
  expect(propagation.getBaggage(extracted)).toBeUndefined();
  const tracer = delivery.provider.getTracer('next.js');
  const roots = [0, 1].map(() =>
    tracer.startSpan('private', { kind: SpanKind.SERVER, attributes: rootAttrs }, extracted)
  );
  await Promise.all(
    roots.map((root) =>
      context.with(trace.setSpan(ROOT_CONTEXT, root), async () => {
        await new Promise<void>((r) => setTimeout(r, 1));
        expect(trace.getSpan(context.active())).toBe(root);
        const outbound = {};
        propagation.inject(context.active(), outbound);
        expect(outbound).toEqual({});
        root.end();
      })
    )
  );
  enabled = false;
});
it('passes only minimized detached views to the real batch queue and suppresses exporter tracing', async () => {
  const received: Buffer[] = [];
  receiver = createServer(async (req, res) => {
    const b: Buffer[] = [];
    for await (const part of req) b.push(part);
    received.push(Buffer.concat(b));
    res.end();
  });
  await new Promise<void>((r) => receiver!.listen(0, '127.0.0.1', r));
  const enabled = {
    ...config,
    base: `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`,
  };
  const queued: ReadableSpan[] = [];
  const original = BatchSpanProcessor.prototype.onEnd;
  vi.spyOn(BatchSpanProcessor.prototype, 'onEnd').mockImplementation(function (
    this: BatchSpanProcessor,
    span
  ) {
    queued.push(span);
    return original.call(this, span);
  });
  const exporter = OTLPTraceExporter.prototype.export;
  let recursiveRecording = true;
  vi.spyOn(OTLPTraceExporter.prototype, 'export').mockImplementation(function (
    this: OTLPTraceExporter,
    spans,
    cb
  ) {
    const span = delivery!.provider
      .getTracer('next.js')
      .startSpan('private', { kind: SpanKind.SERVER, attributes: rootAttrs });
    recursiveRecording = span.isRecording();
    span.end();
    return exporter.call(this, spans, cb);
  });
  delivery = createNativeDelivery(enabled, () => enabled, { idGenerator: ids });
  delivery.register();
  const tracer = delivery.provider.getTracer('next.js');
  const root = tracer.startSpan('private-sentinel', {
    kind: SpanKind.SERVER,
    attributes: { ...rootAttrs, 'http.target': 'private-sentinel' },
  });
  const child = tracer.startSpan(
    'private-sentinel',
    { attributes: { 'next.span_type': 'AppRender.fetch', 'http.url': 'private-sentinel' } },
    trace.setSpan(ROOT_CONTEXT, root)
  );
  child.recordException(new Error('private-sentinel'));
  child.setStatus({ code: 2, message: 'private-sentinel' });
  child.end();
  root.end();
  expect(queued.map((s) => s.name)).toEqual(['next.fetch', 'next.request']);
  expect(JSON.stringify(queued)).not.toContain('private-sentinel');
  await delivery.flush();
  expect(received.length).toBe(1);
  expect(recursiveRecording).toBe(false);
  expect(received[0].includes(Buffer.from('private-sentinel'))).toBe(false);
  const suppressed = tracer.startSpan(
    'private',
    { kind: SpanKind.SERVER, attributes: rootAttrs },
    suppressTracing(ROOT_CONTEXT)
  );
  expect(suppressed.isRecording()).toBe(false);
  suppressed.end();
});
it('keeps a separate trace queue at 256 waiting spans plus one 64-span batch', async () => {
  const wires: Buffer[] = [];
  let release: (() => void) | undefined;
  const attempts: number[] = [];
  const exportBatch = OTLPTraceExporter.prototype.export;
  vi.spyOn(OTLPTraceExporter.prototype, 'export').mockImplementation(function (
    this: OTLPTraceExporter,
    spans,
    cb
  ) {
    attempts.push(spans.length);
    return exportBatch.call(this, spans, cb);
  });
  receiver = createServer(async (req, res) => {
    const b: Buffer[] = [];
    for await (const part of req) b.push(part);
    wires.push(Buffer.concat(b));
    if (wires.length === 1) release = () => res.end();
    else res.end();
  });
  await new Promise<void>((r) => receiver!.listen(0, '127.0.0.1', r));
  const enabled = {
    ...config,
    base: `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`,
  };
  delivery = createNativeDelivery(enabled, () => enabled, { idGenerator: ids });
  const tracer = delivery.provider.getTracer('next.js');
  for (let i = 0; i < 1000; i++)
    tracer
      .startSpan('private', { kind: SpanKind.SERVER, attributes: rootAttrs }, ROOT_CONTEXT)
      .end();
  await vi.waitFor(() => expect(wires.length).toBe(1));
  release!();
  await vi.waitFor(() => expect(attempts.length).toBe(5), { timeout: 2500 });
  await delivery.flush();
  expect(attempts).toEqual([64, 64, 64, 64, 64]);
  // Each full queued batch has exactly64 spans. Decode using official OTLP schema.
  const { Root } = await import('protobufjs');
  const path = await import('node:path');
  const schema = new Root();
  schema.resolvePath = (_origin, target) =>
    path.resolve(process.cwd(), 'src/test/otlp-proto', target);
  schema.loadSync('opentelemetry/proto/collector/trace/v1/trace_service.proto');
  const request = schema.lookupType(
    'opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest'
  );
  const sizes = wires.map((wire) => {
    const value = request.toObject(request.decode(wire)) as {
      resourceSpans: Array<{ scopeSpans: Array<{ spans: unknown[] }> }>;
    };
    return value.resourceSpans.flatMap((r) => r.scopeSpans.flatMap((s) => s.spans)).length;
  });
  // A busy concurrencyLimit=1 exporter may reject a drained batch; bounded
  // queue capacity does not guarantee all admitted spans reach the socket.
  expect(sizes.length).toBeGreaterThan(0);
  expect(sizes.length).toBeLessThanOrEqual(5);
  expect(sizes.every((size) => size === 64)).toBe(true);
});
it('keeps a streaming trace socket bounded after caller timeout and isolates log capacity/opt-out', async () => {
  let active = 0,
    maximum = 0,
    traceRequests = 0,
    logRequests = 0;
  const timers: ReturnType<typeof setInterval>[] = [];
  receiver = createServer(async (req, res) => {
    for await (const _part of req) {
      /* read */
    }
    if (req.url === '/v1/logs') {
      logRequests++;
      res.end();
      return;
    }
    traceRequests++;
    active++;
    maximum = Math.max(maximum, active);
    res.writeHead(200);
    res.write(Buffer.from([1]));
    const timer = setInterval(() => res.write(Buffer.from([1])), 50);
    timers.push(timer);
    res.on('close', () => {
      active--;
      clearInterval(timer);
    });
  });
  await new Promise<void>((r) => receiver!.listen(0, '127.0.0.1', r));
  const enabled = {
    ...config,
    base: `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`,
  };
  let current: typeof enabled | null = enabled;
  delivery = createNativeDelivery(enabled, () => current, { idGenerator: ids });
  const tracer = delivery.provider.getTracer('next.js');
  const emit = () =>
    tracer
      .startSpan('private', { kind: SpanKind.SERVER, attributes: rootAttrs }, ROOT_CONTEXT)
      .end();
  emit();
  const start = performance.now();
  await delivery.flush();
  expect(performance.now() - start).toBeLessThan(2600);
  expect(traceRequests).toBe(1);
  expect(active).toBe(1);
  for (let i = 0; i < 200; i++) emit();
  await delivery.flush();
  expect(traceRequests).toBe(1);
  expect(maximum).toBe(1);
  const { createLogDelivery } = await import('./sdk');
  const logs = createLogDelivery(enabled, () => enabled);
  try {
    logs.emit('browser', { eventName: 'pwa.telemetry.check' });
    await logs.flush();
    expect(logRequests).toBe(1);
  } finally {
    await logs.shutdown();
  }
  current = null;
  expect(
    tracer.startSpan('private', { kind: SpanKind.SERVER, attributes: rootAttrs }).isRecording()
  ).toBe(false);
  // The queued snapshot is discarded at export entry after opt-out, not replayed.
  await delivery.flush();
  expect(traceRequests).toBe(1);
  for (const timer of timers) clearInterval(timer);
});
