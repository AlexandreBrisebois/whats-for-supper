import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { reportBrowserAppOpened } from './actions';
import { classifyScreen, observeOpening } from './opening';

const fetchMock = vi.fn().mockResolvedValue({ ok: true });
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('WFS_VERSION', '1.4.2-beta.1');
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', 'https://sentrame.example');
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'browser-test');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'server-test');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('forwards the approved Search opening as a fixed browser log', async () => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('WFS_TELEMETRY_ENABLED', 'true');
  vi.stubEnv('SENTRAME_OTLP_BASE', 'https://sentrame.example');
  vi.stubEnv('SENTRAME_BROWSER_TOKEN', 'browser-test');
  vi.stubEnv('SENTRAME_SERVER_TOKEN', 'server-test');
  await reportBrowserAppOpened({ screen: 'search' });
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('https://sentrame.example/v1/logs');
  expect(options.headers).toEqual({
    'Content-Type': 'application/json',
    Authorization: 'Bearer browser-test',
  });
  expect(JSON.parse(options.body)).toEqual({
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'wfs-pwa-browser' } },
            { key: 'service.version', value: { stringValue: '1.4.2-beta.1' } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: 'wfs.anonymous' },
            logRecords: [
              {
                timeUnixNano: expect.stringMatching(/^\d{19}$/),
                eventName: 'pwa.app.opened',
                severityNumber: 9,
                body: { stringValue: 'WFS opening observed' },
                attributes: [{ key: 'stage.name', value: { stringValue: 'search' } }],
              },
            ],
          },
        ],
      },
    ],
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
  expect(submit.mock.calls).toEqual([[{ screen: 'search' }]]);
  const second = document.implementation.createHTMLDocument();
  Object.defineProperty(second, 'visibilityState', { value: 'visible' });
  observeOpening(second, true, '/recipes', submit);
  expect(submit.mock.calls).toEqual([[{ screen: 'search' }], [{ screen: 'search' }]]);
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
  expect(submit.mock.calls).toEqual([[{ screen: 'welcome' }]]);
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
  await expect(reportBrowserAppOpened(input)).resolves.toBeUndefined();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('rejects accessor input without invoking browser-controlled code', async () => {
  const read = vi.fn(() => {
    throw new Error('private accessor');
  });
  const input = Object.defineProperty({}, 'screen', { enumerable: true, get: read });
  await expect(reportBrowserAppOpened(input)).resolves.toBeUndefined();
  expect(read).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('contains malformed object inspection failures', async () => {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  await expect(reportBrowserAppOpened(proxy)).resolves.toBeUndefined();
  expect(fetchMock).not.toHaveBeenCalled();
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
])('accepts only fixed browser authority for approved %s', async (screen) => {
  await reportBrowserAppOpened({ screen });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const options = fetchMock.mock.calls[0][1];
  expect(options.headers.Authorization).toBe('Bearer browser-test');
  const record = JSON.parse(options.body).resourceLogs[0].scopeLogs[0].logRecords[0];
  expect(record.eventName).toBe('pwa.app.opened');
  expect(record.attributes).toEqual([{ key: 'stage.name', value: { stringValue: screen } }]);
});

it.each(['reject', 'throw', 'hang'])(
  'never rearms a claimed %s after navigation, resume or a cooking pause',
  async (failure) => {
    const owner = document.implementation.createHTMLDocument();
    let visible = true;
    Object.defineProperty(owner, 'visibilityState', {
      get: () => (visible ? 'visible' : 'hidden'),
    });
    const submit = vi.fn((): Promise<void> => {
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
    expect(submit.mock.calls).toEqual([[{ screen: 'search' }]]);
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
