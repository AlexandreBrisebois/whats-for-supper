import type { BrowserObservation } from './navigation';
import { observation, envelopeAttributes } from '@/test/telemetry';
import { shutdownTelemetry } from './server';
import type { LogRecord } from '@opentelemetry/api';
// Transport assertions run deferred work inline; action scheduling is tested separately.
vi.mock('next/server', () => ({ after: (callback: () => Promise<void>) => callback() }));
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { reportBrowserObservation } from './actions';
import { classifyScreen, observeOpening } from './opening';

const { emitMock } = vi.hoisted(() => ({
  emitMock: vi.fn<(producer: string, record: LogRecord) => void>(),
}));
vi.mock('./sdk', () => ({
  createLogDelivery: () => ({ emit: emitMock, flush: async () => {}, shutdown: async () => {} }),
}));
// Opening adapter tests isolate delivery; native capture has independent coverage.
vi.mock('./native', () => ({
  createNativeDelivery: () => ({ register() {}, flush: async () => {}, shutdown: async () => {} }),
}));
const expectedAttributes = (screen: Parameters<typeof envelopeAttributes>[0]) =>
  Object.fromEntries(
    envelopeAttributes(screen).map(({ key, value }) => [
      key,
      'intValue' in value ? Number(value.intValue) : value.stringValue,
    ])
  );
beforeEach(() => {
  vi.stubEnv('WFS_VERSION', '1.4.2-beta.1');
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', 'https://sentrame.example');
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'browser-test');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'server-test');
});
afterEach(async () => {
  await shutdownTelemetry();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('forwards the approved Search opening as a fixed browser log', async () => {
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', 'https://sentrame.example');
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'browser-test');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'server-test');
  await reportBrowserObservation(observation('search'));
  expect(emitMock).toHaveBeenCalledWith('browser', {
    timestamp: expect.any(Number),
    observedTimestamp: expect.any(Number),
    eventName: 'pwa.app.opened',
    severityNumber: 9,
    attributes: expectedAttributes('search'),
  });
});

it('classifies Search exactly, with no dynamic path content', () => {
  expect(classifyScreen('/recipes')).toBe('search');
  expect(classifyScreen('/recipes/private')).toBe('other');
});

it('claims once per document before submission, while a fresh document can claim again', () => {
  const submit = vi.fn().mockReturnValue(new Promise(() => {}));
  const first = document.implementation.createHTMLDocument();
  Object.defineProperty(first, 'visibilityState', { value: 'visible' });
  observeOpening(first, true, '/recipes', submit);
  observeOpening(first, true, '/home', submit);
  observeOpening(first, true, '/recipes', submit);
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'search' }]]);
  const second = document.implementation.createHTMLDocument();
  Object.defineProperty(second, 'visibilityState', { value: 'visible' });
  observeOpening(second, true, '/recipes', submit);
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'search' }], [{ screen: 'search' }]]);
});

it.each([
  ['/welcome', 'welcome'],
  ['/onboarding', 'onboarding'],
  ['/invite', 'invite'],
  ['/capture', 'capture'],
  ['/capture/confirm', 'capture.confirm'],
  ['/profile/settings', 'profile.settings'],
  ['/browse-all-stack', 'browse.stack'],
  ['/private/arbitrary-value', 'other'],
  ['/recipes/private', 'other'],
])('classifies exact registry path %s as %s', (pathname, expected) => {
  expect(classifyScreen(pathname)).toBe(expected);
});

it('keeps a hidden or unready document waiting without manufacturing a root opening', () => {
  const submit = vi.fn().mockResolvedValue(undefined);
  const owner = document.implementation.createHTMLDocument();
  Object.defineProperty(owner, 'visibilityState', { value: 'visible' });
  observeOpening(owner, true, null, submit);
  observeOpening(owner, true, '/', submit);
  expect(submit).not.toHaveBeenCalled();
  observeOpening(owner, true, '/welcome', submit);
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'welcome' }]]);
});

it.each([
  null,
  undefined,
  [],
  ['search'],
  'search',
  42,
  {},
  { screen: null },
  { screen: ['search'] },
  { screen: 1 },
  { screen: 'Search' },
  { screen: '/recipes' },
  { screen: 'private-' + 'x'.repeat(10000) },
  ...[
    'url',
    'destination',
    'eventName',
    'producer',
    'attributes',
    'timestamp',
    'service.version',
    'token',
    '__proto__',
  ].map((key) => ({ screen: 'search', [key]: 'injected-private-value' })),
  { screen: 'search', [Symbol('extra')]: true },
  Object.assign(Object.create({ inherited: true }), { screen: 'search' }),
])('rejects malformed or extended input %# without export', async (input) => {
  await expect(reportBrowserObservation(input)).resolves.toBeUndefined();
  expect(emitMock).not.toHaveBeenCalled();
});

it('rejects accessor input without invoking browser-controlled code', async () => {
  const read = vi.fn(() => {
    throw new Error('private accessor');
  });
  const input = Object.defineProperty({}, 'screen', { enumerable: true, get: read });
  await expect(reportBrowserObservation(input)).resolves.toBeUndefined();
  expect(read).not.toHaveBeenCalled();
  expect(emitMock).not.toHaveBeenCalled();
});

it('contains malformed object inspection failures', async () => {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  await expect(reportBrowserObservation(proxy)).resolves.toBeUndefined();
  expect(emitMock).not.toHaveBeenCalled();
});

it.each([
  'welcome',
  'onboarding',
  'invite',
  'home',
  'search',
  'capture',
  'capture.confirm',
  'planner',
  'discovery',
  'profile',
  'profile.settings',
  'browse.stack',
  'error',
  'not.found',
  'other',
] as const)('accepts only fixed browser authority for approved %s', async (screen) => {
  await reportBrowserObservation(observation(screen));
  expect(emitMock).toHaveBeenCalledTimes(1);
  const [producer, record] = emitMock.mock.calls[0];
  expect(producer).toBe('browser');
  expect(record.eventName).toBe('pwa.app.opened');
  expect(record.attributes).toEqual(expectedAttributes(screen));
});

it.each(['reject', 'throw', 'hang'])(
  'never rearms a claimed %s after navigation, resume or a cooking pause',
  async (failure) => {
    const owner = document.implementation.createHTMLDocument();
    let visible = true;
    Object.defineProperty(owner, 'visibilityState', {
      get: () => (visible ? 'visible' : 'hidden'),
    });
    const submit = vi.fn<(input: BrowserObservation) => Promise<void>>(() => {
      if (failure === 'throw') throw new Error('private failure');
      if (failure === 'reject') return Promise.reject(new Error('private failure'));
      return new Promise(() => {});
    });
    observeOpening(owner, true, '/recipes', submit);
    await Promise.resolve();
    visible = false;
    observeOpening(owner, true, '/home', submit);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 24 * 60 * 60 * 1000);
    visible = true;
    observeOpening(owner, true, '/home', submit);
    observeOpening(owner, true, '/recipes', submit);
    expect(
      submit.mock.calls
        .filter(([e]) => e.eventName === 'pwa.app.opened')
        .map(([e]) => [{ screen: e.screen }])
    ).toEqual([[{ screen: 'search' }]]);
    vi.restoreAllMocks();
  }
);

it('initial opt-out consumes the opportunity even if later enabled', () => {
  const owner = document.implementation.createHTMLDocument();
  Object.defineProperty(owner, 'visibilityState', { value: 'visible' });
  const submit = vi.fn().mockResolvedValue(undefined);
  observeOpening(owner, false, null, submit);
  observeOpening(owner, true, '/recipes', submit);
  expect(submit).not.toHaveBeenCalled();
});

it('serializes the browser clock and separately captured forwarding clock exactly', async () => {
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  const input = {
    ...observation('home', 'pwa.screen.presented'),
    timestamp: now - 1234,
    sequence: 7,
  };
  await reportBrowserObservation(input);
  const record = emitMock.mock.calls[0][1];
  expect(record.timestamp).toBe(input.timestamp);
  expect(record.observedTimestamp).toBe(now);
  expect(record.eventName).toBe('pwa.screen.presented');
  expect(record.attributes?.['source.sequence']).toBe(7);
  clock.mockRestore();
});
