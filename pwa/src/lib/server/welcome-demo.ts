import 'server-only';
import type { AppIdentity } from './app-identity';

// Deliberately public. Never return the configured secret to the client.
const PUBLIC_DEMO_PASSPHRASE = 'Swipe-Match-Cook';

export function resolveWelcomeDemoPrefill(identity: Pick<AppIdentity, 'demo'>): string | null {
  return identity.demo && process.env.HEARTH_SECRET === PUBLIC_DEMO_PASSPHRASE
    ? PUBLIC_DEMO_PASSPHRASE
    : null;
}
