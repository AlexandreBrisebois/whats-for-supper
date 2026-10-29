import 'server-only';
import type { OpeningScreen } from './opening';

function configuration() {
  if (process.env.WFS_TELEMETRY_ENABLED !== 'true') return null;
  const browser = process.env.SENTRAME_BROWSER_TOKEN?.trim();
  const server = process.env.SENTRAME_SERVER_TOKEN?.trim();
  // Producer credentials must be nonempty visible ASCII header values. Reject
  // control/whitespace and Unicode before exposing an enabled boolean.
  if (!browser || !server || browser === server || !/^[\x21-\x7e]+$/.test(browser + server))
    return null;
  try {
    const url = new URL(process.env.SENTRAME_OTLP_BASE ?? '');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    return { base: url.origin, browser, server };
  } catch {
    return null;
  }
}

export function telemetryEnabled() {
  return configuration() !== null;
}

// Independent budgets preserve capacity for trusted server records.
const budgets = {
  browser: { start: 0, count: 0, active: 0 },
  server: { start: 0, count: 0, active: 0 },
};

async function exportLog(producer: 'browser' | 'server', screen?: OpeningScreen) {
  const config = configuration();
  if (!config) return;
  const budget = budgets[producer];
  const now = Date.now();
  if (now - budget.start >= 60_000) {
    budget.start = now;
    budget.count = 0;
  }
  if (budget.count >= 120 || budget.active >= 4) return;
  budget.count++;
  budget.active++;
  try {
    const response = await fetch(`${config.base}/v1/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config[producer]}` },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
      body: JSON.stringify({
        resourceLogs: [
          {
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: `wfs-pwa-${producer}` } },
                {
                  key: 'service.version',
                  value: { stringValue: process.env.WFS_VERSION?.trim() || 'unknown' },
                },
              ],
            },
            scopeLogs: [
              {
                scope: { name: 'wfs.anonymous' },
                logRecords: [
                  {
                    timeUnixNano: `${BigInt(now) * 1_000_000n}`,
                    eventName: screen ? 'pwa.app.opened' : 'pwa.telemetry.check',
                    severityNumber: 9,
                    body: {
                      stringValue: screen
                        ? 'WFS opening observed'
                        : 'Synthetic telemetry integration check',
                    },
                    ...(screen
                      ? { attributes: [{ key: 'stage.name', value: { stringValue: screen } }] }
                      : {}),
                  },
                ],
              },
            ],
          },
        ],
      }),
    });
    // Never retain receiver output or log endpoint/credential-bearing failures.
    await response.body?.cancel();
  } catch {
    /* Best effort: telemetry must not interrupt the application. */
  } finally {
    budget.active--;
  }
}

// Fixed entry points share transport while preserving producer authority.
export async function sendBrowserCheck(): Promise<void> {
  await exportLog('browser');
}
export async function sendServerCheck(): Promise<void> {
  await exportLog('server');
}

export async function sendBrowserAppOpened(screen: OpeningScreen): Promise<void> {
  await exportLog('browser', screen);
}
