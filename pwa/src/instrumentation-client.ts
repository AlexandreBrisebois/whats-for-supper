import { registerNativeErrors } from './lib/telemetry/errors';

// Registration is synchronous; the existing server-derived document handoff gates
// admission. No buffering, context initialization or asynchronous config read.
try {
  registerNativeErrors(window);
} catch {
  /* Best effort. */
}
