import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveAppIdentity } from './app-identity';
import { resolveWelcomeDemoPrefill } from './welcome-demo';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe('public Welcome guard', () => {
  for (const demo of ['true', 'false', undefined, 'invalid']) {
    for (const secret of [
      'Swipe-Match-Cook',
      'Private-canary',
      undefined,
      '',
      ' ',
      'swipe-match-cook',
      ' Swipe-Match-Cook ',
    ]) {
      it(`returns only constant or null for Demo ${demo} and configured ${secret}`, () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.stubEnv('DEMO_MODE', demo);
        vi.stubEnv('HEARTH_SECRET', secret);
        expect(resolveWelcomeDemoPrefill(resolveAppIdentity())).toBe(
          demo === 'true' && secret === 'Swipe-Match-Cook' ? 'Swipe-Match-Cook' : null
        );
      });
    }
  }
});
