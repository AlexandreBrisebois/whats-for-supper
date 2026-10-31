import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { sendServerError } from './server';

// Only this exporter branch is guarded: concurrent independent requests keep
// their own invocation/identity. No request data or anonymous propagation.
const exporting = new AsyncLocalStorage<boolean>();
export async function reportNextError(routeType: unknown, timestamp: number): Promise<void> {
  if (exporting.getStore()) return;
  await exporting.run(true, () => sendServerError(routeType, timestamp));
}
