import 'server-only';
import { ROOT_CONTEXT, SeverityNumber, logs, type LogRecord } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base';
import { ExportResultCode } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  type LogRecordExporter,
  type LogRecordProcessor,
  type ReadWriteLogRecord,
} from '@opentelemetry/sdk-logs';
import { isOpeningScreen } from './opening';
import { isPrimaryScreen } from './navigation';
import { isSurfaceIdentity } from './surfaces';
import { isIssueResultReason } from './issue-results';

export interface TelemetryConfiguration {
  base: string;
  browser: string;
  server: string;
  version: string;
}
export type Producer = 'browser' | 'server';
export const deliveryBounds = {
  maxQueueSize: 256,
  maxExportBatchSize: 64,
  scheduledDelayMillis: 1000,
  exportTimeoutMillis: 2000,
} as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const browserNames = new Set([
  'pwa.telemetry.check',
  'pwa.app.opened',
  'pwa.screen.presented',
  'pwa.surface.opened',
  'pwa.surface.closed',
  'pwa.browser.error',
  'pwa.recipe_detail.presented',
  'pwa.original.presented',
  'pwa.original.requested',
  'pwa.recipe_issue.save_result',
]);
const serverNames = new Set(['pwa.telemetry.check', 'pwa.server.error']);
const reasons = new Set([
  'browser.script',
  'browser.rejection',
  'browser.render',
  'server.render',
  'server.route',
  'server.action',
  'server.proxy',
  'server.unknown',
]);

// Policy precedes the standard queue, including for calls through the global logger.
function minimize(record: ReadWriteLogRecord, producer: Producer): boolean {
  const name = record.eventName;
  if (!name || !(producer === 'browser' ? browserNames : serverNames).has(name)) return false;
  const scope = record.instrumentationScope;
  if (
    scope.name !== 'wfs.anonymous' ||
    scope.version ||
    scope.schemaUrl ||
    ('attributes' in scope && scope.attributes)
  )
    return false;
  const error = name.endsWith('.error');
  const attrs = record.attributes;
  const safe: Record<string, string | number> = {};
  if (
    name !== 'pwa.telemetry.check' &&
    (typeof attrs['event.id'] !== 'string' || !uuid.test(attrs['event.id']))
  )
    return false;
  if (
    error &&
    (typeof attrs['exception.occurrence.id'] !== 'string' ||
      !uuid.test(attrs['exception.occurrence.id']))
  )
    return false;
  if (error) {
    if (
      typeof attrs.reason !== 'string' ||
      !reasons.has(attrs.reason) ||
      !attrs.reason.startsWith(producer + '.')
    )
      return false;
    safe.reason = attrs.reason;
  }
  if (
    name === 'pwa.recipe_detail.presented' ||
    name === 'pwa.original.presented' ||
    name === 'pwa.original.requested'
  ) {
    if (!isPrimaryScreen(attrs['stage.name'])) return false;
    if (name !== 'pwa.recipe_detail.presented') {
      const reason = name === 'pwa.original.presented' ? 'image' : 'external';
      if (attrs.reason !== reason) return false;
      safe.reason = reason;
    } else if (attrs.reason !== undefined) return false;
  }
  if (name === 'pwa.recipe_issue.save_result') {
    if (
      !isPrimaryScreen(attrs['stage.name']) ||
      !isIssueResultReason(attrs.reason) ||
      attrs['session.id'] === undefined ||
      attrs['tab.id'] === undefined ||
      attrs['source.sequence'] === undefined
    )
      return false;
    safe.reason = attrs.reason;
  }
  for (const key of [
    'event.id',
    ...(error ? ['exception.occurrence.id'] : []),
    ...(producer === 'browser' ? ['session.id', 'tab.id'] : []),
  ]) {
    if (attrs[key] !== undefined) {
      if (typeof attrs[key] !== 'string' || !uuid.test(attrs[key])) return false;
      safe[key] = attrs[key];
    }
  }
  if (producer === 'browser') {
    if (attrs['stage.name'] !== undefined) {
      const stage = attrs['stage.name'];
      if (!isOpeningScreen(stage) && !isSurfaceIdentity(stage)) return false;
      safe['stage.name'] = stage;
    }
    const sequence = attrs['source.sequence'];
    if (sequence !== undefined) {
      if (typeof sequence !== 'number' || !Number.isSafeInteger(sequence) || sequence <= 0)
        return false;
      safe['source.sequence'] = sequence;
    }
  }
  // Keep approved existing keys: deleting/re-adding them consumes the SDK's
  // attribute budget again and can drop required context after hostile input.
  for (const key of Object.keys(attrs)) if (!Object.hasOwn(safe, key)) delete attrs[key];
  for (const [key, value] of Object.entries(safe)) record.setAttribute(key, value);
  record.spanContext = undefined;
  record.body = error
    ? 'WFS unexpected error observed'
    : name === 'pwa.telemetry.check'
      ? 'Synthetic telemetry integration check'
      : name === 'pwa.recipe_issue.save_result'
        ? 'WFS recipe issue result observed'
        : name === 'pwa.app.opened'
          ? 'WFS opening observed'
          : name === 'pwa.original.presented' || name === 'pwa.original.requested'
            ? 'WFS original observation'
            : 'WFS presentation observed';
  record.severityNumber = error ? SeverityNumber.ERROR : SeverityNumber.INFO;
  record.severityText = undefined;
  return true;
}

export function createLogDelivery(
  config: TelemetryConfiguration,
  current: () => TelemetryConfiguration | null
) {
  const providers = {} as Record<Producer, LoggerProvider>;
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
  for (const producer of ['browser', 'server'] as const) {
    const processors: LogRecordProcessor[] = [];
    for (const errorCategory of [false, true]) {
      // Every supported entry point, including the global logger, shares this
      // category's admission budget at the only pre-batch boundary.
      let windowStart = 0;
      let admitted = 0;
      const exporter = new OTLPLogExporter({
        url: config.base + '/v1/logs',
        headers: { Authorization: `Bearer ${config[producer]}` },
        compression: CompressionAlgorithm.NONE,
        timeoutMillis: 2000,
        concurrencyLimit: 1,
        httpAgentOptions: { keepAlive: false, maxSockets: 1, maxTotalSockets: 1 },
      });
      // Config gate only: standard SDK still owns serialization, HTTP and retries.
      const gated: LogRecordExporter = {
        export(records, callback) {
          if (matches()) exporter.export(records, callback);
          else callback({ code: ExportResultCode.SUCCESS }); // intentional best-effort policy drop
        },
        forceFlush: () => exporter.forceFlush(),
        shutdown: () => exporter.shutdown(),
      };
      const batch = new BatchLogRecordProcessor({ exporter: gated, ...deliveryBounds });
      processors.push({
        onEmit(record) {
          if (record.eventName?.endsWith('.error') !== errorCategory) return;
          if (!matches() || !minimize(record, producer)) return;
          const now = Date.now();
          if (now - windowStart >= 60_000) {
            windowStart = now;
            admitted = 0;
          }
          if (admitted >= (errorCategory ? 20 : 100)) return;
          admitted++;
          batch.onEmit(record);
        },
        forceFlush: () => batch.forceFlush(),
        shutdown: () => batch.shutdown(),
      });
    }
    providers[producer] = new LoggerProvider({
      resource: resourceFromAttributes({
        'service.name': `wfs-pwa-${producer}`,
        'service.version': config.version,
      }),
      logRecordLimits: { attributeCountLimit: 16, attributeValueLengthLimit: 256 },
      loggerConfigurator: (scope) => ({
        enabled: scope.name === 'wfs.anonymous',
        minimumSeverity: SeverityNumber.UNSPECIFIED,
        traceBased: false,
      }),
      processors,
    });
  }
  logs.setGlobalLoggerProvider(providers.server);
  return {
    emit(producer: Producer, record: LogRecord) {
      if (matches())
        providers[producer].getLogger('wfs.anonymous').emit({ ...record, context: ROOT_CONTEXT });
    },
    async flush(timeoutMillis = 2000) {
      await Promise.all(
        Object.values(providers).map((provider) =>
          provider.forceFlush({ timeoutMillis }).catch(() => {})
        )
      );
    },
    async shutdown() {
      await Promise.all(Object.values(providers).map((provider) => provider.shutdown()));
      logs.disable();
    },
  };
}
