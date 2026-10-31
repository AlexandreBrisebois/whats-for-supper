import 'server-only';
import {
  context,
  propagation,
  trace,
  SpanKind,
  type SpanContext,
  type TextMapPropagator,
} from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { ExportResultCode } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base';
import { resourceFromAttributes, type Resource } from '@opentelemetry/resources';
import {
  AlwaysOffSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
  SamplingDecision,
  TraceIdRatioBasedSampler,
  TracerProvider,
  type IdGenerator,
  type ReadableSpan,
  type Sampler,
  type SpanExporter,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace';
import { deliveryBounds, type TelemetryConfiguration } from './sdk';

const operations = new Map([
  ['BaseServer.handleRequest', 'next.request'],
  ['AppRender.getBodyResult', 'next.render'],
  ['AppRender.fetch', 'next.fetch'],
]);
const methods = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'CONNECT',
  'TRACE',
]);
const noPropagation: TextMapPropagator = {
  inject() {},
  extract: (parent) => parent,
  fields: () => [],
};

// The method is present on native Next roots before sampling. Unknown/non-read
// roots fail closed, and the standard parent sampler suppresses their children.
export function nativeSampler(): Sampler {
  const ratio = new TraceIdRatioBasedSampler(0.1);
  const off = new AlwaysOffSampler();
  return new ParentBasedSampler({
    root: {
      shouldSample(parent, id, name, kind, attrs, links) {
        if (
          kind !== SpanKind.SERVER ||
          attrs['next.span_type'] !== 'BaseServer.handleRequest' ||
          (attrs['http.method'] !== 'GET' && attrs['http.method'] !== 'HEAD')
        )
          return { decision: SamplingDecision.NOT_RECORD };
        return ratio.shouldSample(parent, id);
      },
      toString: () => 'WfsNextReadRoot(0.1)',
    },
    remoteParentSampled: off,
    remoteParentNotSampled: off,
  });
}

function technicalContext(value: SpanContext): SpanContext {
  return { traceId: value.traceId, spanId: value.spanId, traceFlags: value.traceFlags };
}

// Only this detached view reaches the SDK export queue. Never spread the native
// span or close over it: its raw name, events, resource and context are private.
export function projectNativeSpan(span: ReadableSpan, resource: Resource): ReadableSpan | null {
  if (span.instrumentationScope.name !== 'next.js' || span.parentSpanContext?.isRemote) return null;
  const type = span.attributes['next.span_type'];
  const name = typeof type === 'string' ? operations.get(type) : undefined;
  if (!name) return null;
  const attributes: Record<string, string | number> = {};
  const method = span.attributes['http.method'];
  if (typeof method === 'string' && methods.has(method)) attributes['http.request.method'] = method;
  const status = span.attributes['http.status_code'];
  if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599)
    attributes['http.response.status_code'] = status;
  const identity = technicalContext(span.spanContext());
  return {
    name,
    kind: span.kind,
    spanContext: () => identity,
    parentSpanContext: span.parentSpanContext
      ? technicalContext(span.parentSpanContext)
      : undefined,
    startTime: [...span.startTime],
    endTime: [...span.endTime],
    duration: [...span.duration],
    ended: span.ended,
    status: { code: span.status.code === 1 || span.status.code === 2 ? span.status.code : 0 },
    attributes,
    links: [],
    events: [],
    resource,
    instrumentationScope: { name: 'next.js' },
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
  };
}

export function createNativeDelivery(
  config: TelemetryConfiguration,
  current: () => TelemetryConfiguration | null,
  options: { idGenerator?: IdGenerator } = {}
) {
  const matches = () => {
    const value = current();
    return (
      value !== null &&
      value.base === config.base &&
      value.browser === config.browser &&
      value.server === config.server &&
      value.version === config.version
    );
  };
  const resource = resourceFromAttributes({
    'service.name': 'wfs-pwa-server',
    'service.version': config.version,
  });
  const exporter = new OTLPTraceExporter({
    url: config.base + '/v1/traces',
    headers: { Authorization: `Bearer ${config.server}` },
    compression: CompressionAlgorithm.NONE,
    timeoutMillis: 2000,
    concurrencyLimit: 1,
    httpAgentOptions: { keepAlive: false, maxSockets: 1, maxTotalSockets: 1 },
  });
  const gated: SpanExporter = {
    export(spans, callback) {
      if (matches()) exporter.export(spans, callback);
      else callback({ code: ExportResultCode.SUCCESS });
    },
    shutdown: () => exporter.shutdown(),
    forceFlush: () => exporter.forceFlush(),
  };
  const batch = new BatchSpanProcessor({ exporter: gated, ...deliveryBounds });
  const policy: SpanProcessor = {
    onStart() {},
    onEnd(span) {
      if (!matches()) return;
      const safe = projectNativeSpan(span, resource);
      if (safe) batch.onEnd(safe);
    },
    forceFlush: () => batch.forceFlush(),
    shutdown: () => batch.shutdown(),
  };
  const sampler = nativeSampler();
  const provider = new TracerProvider({
    resource,
    sampler: {
      shouldSample: (...args) =>
        matches() ? sampler.shouldSample(...args) : { decision: SamplingDecision.NOT_RECORD },
      toString: () => sampler.toString(),
    },
    idGenerator: options.idGenerator,
    spanLimits: {
      attributeCountLimit: 16,
      attributeValueLengthLimit: 256,
      eventCountLimit: 0,
      linkCountLimit: 0,
      attributePerEventCountLimit: 0,
      attributePerLinkCountLimit: 0,
    },
    spanProcessors: [policy],
  });
  let registered = false;
  let manager: AsyncLocalStorageContextManager | undefined;
  return {
    provider,
    register() {
      if (registered) return;
      const candidate = new AsyncLocalStorageContextManager().enable();
      if (!context.setGlobalContextManager(candidate)) {
        candidate.disable();
        return;
      }
      if (!propagation.setGlobalPropagator(noPropagation)) {
        context.disable();
        candidate.disable();
        return;
      }
      if (!trace.setGlobalTracerProvider(provider)) {
        propagation.disable();
        context.disable();
        candidate.disable();
        return;
      }
      manager = candidate;
      registered = true;
    },
    async flush(timeoutMillis = 2000) {
      await provider.forceFlush({ timeoutMillis }).catch(() => {});
    },
    async shutdown() {
      try {
        await provider.shutdown();
      } finally {
        if (registered) {
          trace.disable();
          propagation.disable();
          context.disable();
          manager?.disable();
          registered = false;
        }
      }
    },
  };
}
