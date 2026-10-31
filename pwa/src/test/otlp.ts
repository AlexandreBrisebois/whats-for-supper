// Test-only decoder using protobufjs and unmodified official OTLP v1.9.0 schemas.
import { Root } from 'protobufjs';
import path from 'node:path';

// Task/Vitest/Playwright all execute these fixtures from pwa/.
const schemas = path.resolve(process.cwd(), 'src/test/otlp-proto');
const root = new Root();
root.resolvePath = (_origin, target) => path.resolve(schemas, target);
root.loadSync('opentelemetry/proto/collector/logs/v1/logs_service.proto');
const request = root.lookupType('opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest');

export interface WireAttribute {
  key: string;
  value: { stringValue?: string; intValue?: string; boolValue?: boolean };
}
export interface WireLog {
  eventName: string;
  severityNumber: number;
  body: { stringValue: string };
  timeUnixNano: string;
  observedTimeUnixNano: string;
  attributes?: WireAttribute[];
  traceId?: string;
  spanId?: string;
}
export interface WireResourceLogs {
  resource: { attributes: WireAttribute[] };
  scopeLogs: Array<{ scope: { name: string }; logRecords: WireLog[] }>;
}
export function decodeLogs(bytes: Uint8Array): { resourceLogs: WireResourceLogs[] } {
  return request.toObject(request.decode(bytes), {
    longs: String,
    enums: Number,
    bytes: String,
  }) as { resourceLogs: WireResourceLogs[] };
}
// Used only for receiver-negative/synthetic fixture cases, never WFS delivery.
export function encodeLogs(value: Record<string, unknown>): Buffer {
  return Buffer.from(request.encode(request.fromObject(value)).finish());
}
export function logAttributes(record: { attributes?: WireAttribute[] }) {
  return Object.fromEntries(
    (record.attributes ?? []).map(({ key, value }) => [
      key,
      value.stringValue ?? value.intValue ?? value.boolValue,
    ])
  );
}
