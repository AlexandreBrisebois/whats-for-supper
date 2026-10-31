import { observation } from '@/test/telemetry';
import { afterEach, expect, it, vi } from 'vitest';
import {
  reportBrowserError,
  reportBrowserObservation,
  reportBrowserTelemetryCheck,
} from './actions';

const { callbacks, opening, check, error, scheduling } = vi.hoisted(() => ({
  scheduling: { fail: false },
  callbacks: [] as Array<() => Promise<void>>,
  opening: vi.fn<() => Promise<void>>(),
  check: vi.fn<() => Promise<void>>(),
  error: vi.fn<() => Promise<void>>(),
}));
vi.mock('next/server', () => ({
  after: (callback: () => Promise<void>) => {
    if (scheduling.fail) throw new Error('private-scheduler');
    callbacks.push(callback);
  },
}));
vi.mock('./server', () => ({
  sendBrowserObservation: opening,
  sendBrowserCheck: check,
  sendBrowserError: error,
}));
afterEach(() => {
  callbacks.length = 0;
  scheduling.fail = false;
  vi.resetAllMocks();
});

it.each(['opening', 'check'])(
  'returns the %s action before starting a stalled receiver export',
  async (kind) => {
    let release!: () => void;
    const stalled = new Promise<void>((resolve) => {
      release = resolve;
    });
    opening.mockReturnValue(stalled);
    check.mockReturnValue(stalled);
    const action =
      kind === 'opening'
        ? reportBrowserObservation(observation('search'))
        : reportBrowserTelemetryCheck();
    const result = await Promise.race([action, Promise.resolve('pending')]);
    expect(result).toBeUndefined();
    expect(opening).not.toHaveBeenCalled();
    expect(check).not.toHaveBeenCalled();
    expect(callbacks).toHaveLength(1);
    const exportWork = callbacks[0]();
    if (kind === 'opening')
      expect(opening).toHaveBeenCalledWith(
        expect.objectContaining({ ...observation('search'), timestamp: expect.any(Number) }),
        expect.any(Number)
      );
    else expect(check).toHaveBeenCalledOnce();
    release();
    await exportWork;
  }
);

it('does not schedule rejected browser input', async () => {
  await reportBrowserObservation({ screen: 'search', destination: 'private' });
  expect(callbacks).toHaveLength(0);
  expect(opening).not.toHaveBeenCalled();
});

it('captures forwarding observation before deferred export', async () => {
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  const input = observation();
  await reportBrowserObservation(input);
  clock.mockReturnValue(now + 90_000);
  expect(callbacks).toHaveLength(1);
  await callbacks[0]();
  expect(opening).toHaveBeenCalledWith(input, now);
  clock.mockRestore();
});

it.each([-86_400_001, 300_001, NaN, Infinity, 0.5])(
  'rejects invalid browser time %s',
  async (offset) => {
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const timestamp = Number.isInteger(offset) ? now + offset : offset;
    await reportBrowserObservation({ ...observation(), timestamp });
    expect(callbacks).toHaveLength(0);
    clock.mockRestore();
  }
);
it.each([-86_400_000, 300_000])('accepts exact clock boundary %s', async (offset) => {
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  await reportBrowserObservation({ ...observation(), timestamp: now + offset });
  expect(callbacks).toHaveLength(1);
  clock.mockRestore();
});
it.each([
  { eventName: 'business.saved' },
  { screen: '/private' },
  { sessionId: 'person' },
  { tabId: null },
  { eventId: [] },
  { sequence: 0 },
  { sequence: 1.5 },
  { sequence: Number.MAX_SAFE_INTEGER + 1 },
  { url: 'private-sentinel' },
  { attributes: {} },
  { producer: 'server' },
  { timestamp: 0 },
])('rejects closed-envelope violation %#', async (extra) => {
  await reportBrowserObservation({ ...observation(), ...extra });
  expect(callbacks).toHaveLength(0);
});

it.each(['eventName', 'screen', 'sessionId', 'tabId', 'eventId', 'sequence', 'timestamp'])(
  'rejects accessors on otherwise complete %s without invoking them',
  async (key) => {
    const getter = vi.fn(() => 'private-sentinel');
    const input = Object.defineProperty(observation(), key, { enumerable: true, get: getter });
    await reportBrowserObservation(input);
    expect(getter).not.toHaveBeenCalled();
    expect(callbacks).toHaveLength(0);
  }
);
it.each([
  (input: object) => Object.assign(Object.create({ private: 'sentinel' }), input),
  (input: object) => ({ ...input, [Symbol('private')]: true }),
  () => [],
])('rejects non-data object shapes %#', async (shape) => {
  await reportBrowserObservation(shape(observation()));
  expect(callbacks).toHaveLength(0);
});
it('accepts the same closed envelope for subsequent screen evidence', async () => {
  await reportBrowserObservation(observation('home', 'pwa.screen.presented'));
  expect(callbacks).toHaveLength(1);
});

it('snapshots error acceptance before deferred forwarding and contains scheduler/export failures', async () => {
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  const input = {
    reason: 'browser.script',
    timestamp: now,
    eventId: crypto.randomUUID(),
    occurrenceId: crypto.randomUUID(),
  };
  await reportBrowserError(input);
  expect(error).not.toHaveBeenCalled();
  clock.mockReturnValue(now + 90000);
  await callbacks[0]();
  expect(error).toHaveBeenCalledWith(input, now);
  error.mockRejectedValueOnce(new Error('private'));
  await expect(callbacks[0]()).resolves.toBeUndefined();
  await reportBrowserError({ ...input, message: 'private' });
  expect(callbacks).toHaveLength(1);
  clock.mockRestore();
});

it('contains error scheduling failure without exposing rejected input or starting export', async () => {
  scheduling.fail = true;
  await expect(
    reportBrowserError({
      reason: 'browser.script',
      eventId: crypto.randomUUID(),
      occurrenceId: crypto.randomUUID(),
      timestamp: Date.now(),
    })
  ).resolves.toBeUndefined();
  expect(callbacks).toHaveLength(0);
  expect(error).not.toHaveBeenCalled();
});
it('keeps boundary forwarding deferred and rejects boundary-supplied server authority', async () => {
  const input = {
    reason: 'browser.render',
    timestamp: Date.now(),
    eventId: crypto.randomUUID(),
    occurrenceId: crypto.randomUUID(),
  };
  await reportBrowserError(input);
  expect(error).not.toHaveBeenCalled();
  expect(callbacks).toHaveLength(1);
  await callbacks[0]();
  expect(error).toHaveBeenCalledWith(input, expect.any(Number));
  await reportBrowserError({ ...input, reason: 'server.render' });
  await reportBrowserError({ ...input, digest: 'private-digest' });
  expect(callbacks).toHaveLength(1);
});

it.each(['saved_manual', 'processing_acknowledged', 'saved_launch_failed', 'unconfirmed'])(
  'defers exact issue result %s while preserving its accepted clocks and browser context',
  async (reason) => {
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const input = { ...observation('search'), eventName: 'pwa.recipe_issue.save_result', reason };
    await reportBrowserObservation(input);
    expect(opening).not.toHaveBeenCalled();
    expect(callbacks).toHaveLength(1);
    clock.mockReturnValue(now + 90000);
    await callbacks[0]();
    expect(opening).toHaveBeenCalledWith(input, now);
    await reportBrowserObservation({ ...input, importId: 'private' });
    await reportBrowserObservation({ ...input, reason: 'completed' });
    expect(callbacks).toHaveLength(1);
    clock.mockRestore();
  }
);
