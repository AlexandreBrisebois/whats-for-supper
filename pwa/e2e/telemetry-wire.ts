import { decodeLogs } from '../src/test/otlp';

export interface CapturedLog {
  // Point projection for assertions only. Never use this derived JSON for replay.
  body: string;
  // Exact SDK-produced HTTP Protobuf batch, including when it contains other points.
  wire: Buffer;
}
export function captureLogs(wire: Buffer): CapturedLog[] {
  return decodeLogs(wire).resourceLogs.flatMap((resource) =>
    resource.scopeLogs.flatMap((scope) =>
      scope.logRecords.map((record) => {
        const order =
          record.severityNumber === 17
            ? [
                'reason',
                'event.id',
                'exception.occurrence.id',
                'stage.name',
                'session.id',
                'tab.id',
                'source.sequence',
              ]
            : ['stage.name', 'session.id', 'tab.id', 'event.id', 'source.sequence'];
        const attributes = [...(record.attributes ?? [])].sort(
          (a, b) => order.indexOf(a.key) - order.indexOf(b.key)
        );
        return {
          wire,
          body: JSON.stringify({
            resourceLogs: [
              {
                resource: resource.resource,
                scopeLogs: [
                  {
                    scope: scope.scope,
                    logRecords: [{ ...record, ...(attributes.length ? { attributes } : {}) }],
                  },
                ],
              },
            ],
          }),
        };
      })
    )
  );
}
// Semantic assertions count source records, not SDK retransmissions. Every row
// retains its original exact batch for receiver replay; unit transport tests count
// actual HTTP attempts independently.
export function captureOnce<T extends CapturedLog>(rows: T[], item: T): T {
  const id = (value: CapturedLog) =>
    JSON.parse(value.body).resourceLogs[0].scopeLogs[0].logRecords[0].attributes?.find(
      (a: { key: string }) => a.key === 'event.id'
    )?.value.stringValue;
  const key = id(item);
  const previous = key ? rows.find((row) => id(row) === key) : undefined;
  if (previous) {
    if (!previous.wire.equals(item.wire))
      throw new Error('SDK retry changed its exact captured batch');
    return previous;
  }
  rows.push(item);
  return item;
}
