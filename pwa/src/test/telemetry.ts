import { expect } from 'vitest';

// Synthetic envelope used only by telemetry boundary tests.
import type { BrowserObservation, NavigationObservation } from '@/lib/telemetry/navigation';
export function observation(
  screen: BrowserObservation['screen'] = 'search',
  eventName: NavigationObservation['eventName'] = 'pwa.app.opened'
): NavigationObservation {
  return {
    eventName,
    screen,
    sessionId: '12345678-1234-4234-8234-123456789012',
    tabId: '22345678-1234-4234-8234-123456789012',
    eventId: '32345678-1234-4234-8234-123456789012',
    sequence: 1,
    timestamp: Date.now(),
  };
}
export const envelopeAttributes = (screen: string) => [
  { key: 'stage.name', value: { stringValue: screen } },
  { key: 'session.id', value: { stringValue: expect.any(String) } },
  { key: 'tab.id', value: { stringValue: expect.any(String) } },
  { key: 'event.id', value: { stringValue: expect.any(String) } },
  { key: 'source.sequence', value: { intValue: '1' } },
];
