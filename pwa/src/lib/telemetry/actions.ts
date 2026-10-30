'use server';

import { after } from 'next/server';
import { sendBrowserCheck, sendBrowserAppOpened } from './server';
import { isOpeningScreen } from './opening';

// Next.js checks Server Action origins. Accept no client-controlled payload or URL.
// Intentionally unwired: a future browser integration can call this for qualification.
export async function reportBrowserTelemetryCheck(): Promise<void> {
  after(() => sendBrowserCheck());
}

// Untrusted browser observation: no event, producer or destination selection.
// Public entry (Welcome/invite) needs no household identity. Runtime opt-in and
// the browser budget authorize this fixed operation, never business access.
export async function reportBrowserAppOpened(input: unknown): Promise<void> {
  let screen: unknown;
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return;
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return;
    if (Reflect.ownKeys(input).length !== 1) return;
    // Inspect a data field without invoking a getter on malformed input.
    const field = Object.getOwnPropertyDescriptor(input, 'screen');
    if (!field || !Object.hasOwn(field, 'value')) return;
    screen = field.value;
  } catch {
    // Invalid object inspection must be as inert as an invalid classification.
    return;
  }
  if (!isOpeningScreen(screen)) return;
  // Keep receiver latency out of the response and the client Server Action queue.
  after(() => sendBrowserAppOpened(screen));
}
