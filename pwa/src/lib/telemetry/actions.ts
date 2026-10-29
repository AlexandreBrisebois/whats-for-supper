'use server';

import { sendBrowserCheck } from './server';

// Next.js checks Server Action origins. Accept no client-controlled payload or URL.
// Intentionally unwired: a future browser integration can call this for qualification.
export async function reportBrowserTelemetryCheck(): Promise<void> {
  await sendBrowserCheck();
}
