'use server';

import { after } from 'next/server';
import { sendBrowserCheck, sendBrowserObservation } from './server';
import { parseBrowserObservation } from './navigation';

// Next.js checks Server Action origins. Accept no client-controlled payload or URL.
// Intentionally unwired: a future browser integration can call this for qualification.
export async function reportBrowserTelemetryCheck(): Promise<void> {
  after(() => sendBrowserCheck());
}

// Public entry needs no household identity. Next checks same-origin Action calls;
// runtime opt-in, closed vocabulary and the browser budget bound collection.
export async function reportBrowserObservation(input: unknown): Promise<void> {
  const observedAt = Date.now();
  const observation = parseBrowserObservation(input, observedAt);
  if (!observation) return;
  // Capture the forwarding clock now, before deferred export, and retain browser authority.
  after(() => sendBrowserObservation(observation, observedAt));
}
