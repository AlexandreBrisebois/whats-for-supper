import { afterEach, expect, it, vi } from 'vitest';
import * as errors from './errors';
import * as opening from './opening';
import type { BrowserErrorObservation } from './errors';
import type { BrowserObservation } from './navigation';
type Observation = BrowserErrorObservation | BrowserObservation;

const owner = () => {
  const doc = document.implementation.createHTMLDocument();
  Object.defineProperty(doc, 'visibilityState', { value: 'visible' });
  return doc;
};
const input = () => ({
  reason: 'browser.script',
  eventId: crypto.randomUUID(),
  occurrenceId: crypto.randomUUID(),
  timestamp: Date.now(),
});
afterEach(() => vi.restoreAllMocks());
it('snapshots Home before deferred submission and shares opening/Home/error/Search sequence', async () => {
  const doc = owner();
  const records: Record<string, unknown>[] = [];
  const pending: Array<() => void> = [];
  const submit = vi.fn(async (e: Observation) => {
    pending.push(() => {
      records.push({ ...e });
    });
  });
  opening.observeOpening(doc, true, '/home', submit);
  const at = Date.now();
  vi.spyOn(Date, 'now').mockReturnValue(at);
  errors.observeBrowserError(doc, 'browser.script', submit);
  opening.observeOpening(doc, true, '/recipes', submit);
  vi.spyOn(Date, 'now').mockReturnValue(at + 90000);
  pending.splice(0).forEach((work) => work());
  expect(records.map((e) => e.sequence)).toEqual([1, 2, 3, 4]);
  expect(records[2]).toMatchObject({ reason: 'browser.script', screen: 'home', timestamp: at });
  expect(new Set(records.map((e) => e.sessionId)).size).toBe(1);
  expect(new Set(records.map((e) => e.tabId)).size).toBe(1);
  expect(new Set(records.map((e) => e.eventId)).size).toBe(4);
  expect(records[2].occurrenceId).not.toBe(records[2].eventId);
  opening.observeOpening(doc, true, '/recipes', submit);
  errors.observeBrowserError(doc, 'browser.rejection', submit);
  pending.splice(0).forEach((work) => work());
  expect(records[4]).toMatchObject({ sequence: 5, screen: 'search' });
});
it('does not create scope for errors; enabled early is standalone, disabled/preinit never buffers', () => {
  const doc = owner(),
    submit = vi.fn(async (_input: Observation) => {});
  errors.observeBrowserError(doc, 'browser.script', submit);
  expect(submit).not.toHaveBeenCalled();
  opening.observeOpening(doc, true, null, submit);
  errors.observeBrowserError(doc, 'browser.rejection', submit);
  expect(submit.mock.calls).toHaveLength(1);
  expect(Object.keys(submit.mock.calls[0][0]).sort()).toEqual([
    'eventId',
    'occurrenceId',
    'reason',
    'timestamp',
  ]);
  opening.observeOpening(doc, true, '/home', submit);
  expect(submit.mock.calls[1][0]).toMatchObject({ sequence: 1, eventName: 'pwa.app.opened' });
  const disabled = owner();
  opening.observeOpening(disabled, false, null, submit);
  opening.observeOpening(disabled, true, '/home', submit);
  errors.observeBrowserError(disabled, 'browser.script', submit);
  expect(submit.mock.calls).toHaveLength(3);
});
it('existing context without a screen allocates sequence without inventing a stage', () => {
  const doc = owner();
  opening.observeOpening(doc, true, null, async () => {});
  // The same allocator used by presentation can exist before a presented screen.
  opening.allocateDocumentContext(doc);
  const submit = vi.fn(async (_input: Observation) => {});
  errors.observeBrowserError(doc, 'browser.script', submit);
  expect(submit.mock.calls[0][0]).toMatchObject({
    sequence: 1,
    sessionId: expect.any(String),
    tabId: expect.any(String),
  });
  expect(submit.mock.calls[0][0]).not.toHaveProperty('screen');
});
it('ten attempts per document survive minute rollover/remount; independent documents have their own caps', () => {
  const submit = vi.fn(async (_input: Observation) => {}),
    a = owner(),
    b = owner();
  opening.observeOpening(a, true, null, submit);
  opening.observeOpening(b, true, null, submit);
  for (let i = 0; i < 10000; i++) errors.observeBrowserError(a, 'browser.script', submit);
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60001);
  opening.observeOpening(a, true, null, submit);
  errors.observeBrowserError(a, 'browser.rejection', submit);
  for (let i = 0; i < 12; i++) errors.observeBrowserError(b, 'browser.rejection', submit);
  expect(submit).toHaveBeenCalledTimes(20);
});
it('one native owner suppresses overlapping registrations but preserves distinct dispatch episodes with reused errors/events', async () => {
  const submit = vi.fn(async (_input: Observation) => {});
  opening.observeOpening(document, true, null, submit);
  const dispose = errors.registerNativeErrors(window, submit);
  const duplicate = errors.registerNativeErrors(window, submit);
  const error = new Error('private-sentinel');
  const event = new ErrorEvent('error', {
    error,
    message: 'private-sentinel',
    filename: 'https://private.example',
  });
  window.dispatchEvent(event);
  window.dispatchEvent(event);
  expect(submit).toHaveBeenCalledTimes(2);
  expect(submit.mock.calls[0][0].eventId).not.toBe(submit.mock.calls[1][0].eventId);
  expect((submit.mock.calls[0][0] as BrowserErrorObservation).occurrenceId).not.toBe(
    (submit.mock.calls[1][0] as BrowserErrorObservation).occurrenceId
  );
  expect(JSON.stringify(submit.mock.calls)).not.toContain('private');
  duplicate();
  dispose();
});
it('contains synchronous recursion, throwing submission and rejected telemetry promises', async () => {
  const doc = owner();
  opening.observeOpening(doc, true, null, async () => {});
  const submit = vi.fn(() => {
    errors.observeBrowserError(doc, 'browser.script', submit);
    throw new Error('private');
  });
  expect(() => errors.observeBrowserError(doc, 'browser.script', submit)).not.toThrow();
  expect(submit).toHaveBeenCalledOnce();
  errors.observeBrowserError(doc, 'browser.rejection', async () => {
    throw new Error('private');
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
});
it('admits only exact safe data, complete optional context and browser clocks', () => {
  const valid = input(),
    now = Date.now();
  expect(errors.parseBrowserError(valid, now)).toEqual(valid);
  const context = {
    ...valid,
    sessionId: crypto.randomUUID(),
    tabId: crypto.randomUUID(),
    sequence: 1,
  };
  expect(errors.parseBrowserError(context, now)).toEqual(context);
  expect(errors.parseBrowserError({ ...context, screen: 'home' }, now)).toEqual({
    ...context,
    screen: 'home',
  });
  const getter = vi.fn(() => 'private');
  for (const bad of [
    null,
    [],
    { ...valid, raw: 'private' },
    { ...valid, producer: 'server' },
    { ...valid, reason: 'server.render' },
    { ...valid, eventId: 'bad' },
    { ...valid, occurrenceId: 'bad' },
    { ...valid, timestamp: 0 },
    { ...valid, timestamp: NaN },
    { ...valid, timestamp: Infinity },
    { ...valid, timestamp: 1.5 },
    { ...valid, timestamp: now - 86400001 },
    { ...valid, timestamp: now + 300001 },
    { ...valid, screen: 'home' },
    { ...valid, sessionId: crypto.randomUUID() },
    { ...context, sequence: 0 },
    { ...context, sequence: Number.MAX_SAFE_INTEGER + 1 },
    { ...context, screen: 'quick.find' },
    { ...valid, [Symbol()]: true },
    Object.defineProperty({ ...valid }, 'reason', { get: getter }),
    Object.assign(Object.create({ private: true }), valid),
    { ...valid, reason: 'x'.repeat(3000) },
  ]) {
    expect(errors.parseBrowserError(bad, now)).toBeNull();
  }
  expect(getter).not.toHaveBeenCalled();
  for (const offset of [-86400000, 300000])
    expect(errors.parseBrowserError({ ...valid, timestamp: now + offset }, now)).not.toBeNull();
});

it('observes primitive script throws/rejections without reading payloads, excluding resource/cross-origin detail and preserving default handling', () => {
  const submit = vi.fn(async (_input: BrowserErrorObservation) => {});
  opening.observeOpening(document, true, null, async () => {});
  const dispose = errors.registerNativeErrors(window, submit);
  const reason = vi.fn(() => {
    throw new Error('private');
  });
  const rejection = Object.defineProperty(
    new Event('unhandledrejection', { cancelable: true }),
    'reason',
    { get: reason }
  );
  const script = new ErrorEvent('error', {
    message: 'Uncaught null',
    error: null,
    cancelable: true,
  });
  window.dispatchEvent(script);
  window.dispatchEvent(rejection);
  window.dispatchEvent(new Event('error'));
  window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.', error: null }));
  expect(submit.mock.calls.map(([e]) => e.reason)).toEqual(['browser.script', 'browser.rejection']);
  expect(reason).not.toHaveBeenCalled();
  expect(script.defaultPrevented).toBe(false);
  expect(rejection.defaultPrevented).toBe(false);
  dispose();
});

it.each([
  'reason',
  'eventId',
  'occurrenceId',
  'timestamp',
  'sessionId',
  'tabId',
  'sequence',
  'screen',
])('rejects an accessor at %s without reading it', (key) => {
  const getter = vi.fn(() => {
    throw new Error('private');
  });
  const candidate = Object.defineProperty(
    {
      ...input(),
      sessionId: crypto.randomUUID(),
      tabId: crypto.randomUUID(),
      sequence: 1,
      screen: 'home',
    },
    key,
    { get: getter }
  );
  expect(errors.parseBrowserError(candidate, Date.now())).toBeNull();
  expect(getter).not.toHaveBeenCalled();
});

it('admits the closed render category', () => {
  const candidate = { ...input(), reason: 'browser.render' };
  expect(errors.parseBrowserError(candidate, Date.now())).toEqual(candidate);
});
it('retains context without an observer; boundary replay/native overlap are one episode and reset is fresh', () => {
  const doc = owner(),
    submit = vi.fn(async (_input: Observation) => {});
  opening.observeOpening(doc, true, '/home', async () => {});
  const failure = new Error('private');
  const episode = {};
  errors.observeBoundaryError(doc, failure, episode, submit);
  errors.observeBoundaryError(doc, failure, episode, submit);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit.mock.calls[0][0]).toMatchObject({
    screen: 'home',
    sequence: 3,
    reason: 'browser.render',
  });
  errors.retireBoundaryError(doc, episode);
  errors.observeBoundaryError(doc, failure, {}, submit);
  expect(submit).toHaveBeenCalledTimes(2);
  expect(submit.mock.calls[0][0].eventId).not.toBe(submit.mock.calls[1][0].eventId);
});
it('suppresses native/boundary overlap in both orders, retaining independent native dispatch identities', async () => {
  const submit = vi.fn(async (_input: Observation) => {});
  opening.observeOpening(document, true, null, async () => {});
  const dispose = errors.registerNativeErrors(window, submit);
  const error = new Error('private');
  window.dispatchEvent(new ErrorEvent('error', { error }));
  const episode = {};
  errors.observeBoundaryError(document, error, episode, submit);
  window.dispatchEvent(new ErrorEvent('error', { error }));
  expect(submit).toHaveBeenCalledTimes(1);
  errors.retireBoundaryError(document, episode);
  window.dispatchEvent(new ErrorEvent('error', { error }));
  expect(submit).toHaveBeenCalledTimes(2);
  dispose();
});
it('does not invoke digest accessors or serialize marker values', () => {
  const doc = owner(),
    submit = vi.fn(async (_input: Observation) => {});
  opening.observeOpening(doc, true, null, async () => {});
  errors.observeBoundaryError(
    doc,
    Object.assign(new Error('private'), { digest: 'private-digest' }),
    {},
    submit
  );
  expect(submit).not.toHaveBeenCalled();
  const getter = vi.fn(() => {
    throw new Error('private');
  });
  errors.observeBoundaryError(
    doc,
    Object.defineProperty(new Error(), 'digest', { get: getter }),
    {},
    submit
  );
  expect(getter).not.toHaveBeenCalled();
  expect(JSON.stringify(submit.mock.calls)).not.toContain('private');
});
it('captures the preceding screen before an actually committed fallback, without creating a visit for an early fallback', () => {
  const doc = owner(),
    submit = vi.fn(async (_input: Observation) => {});
  opening.observeOpening(doc, true, '/home', submit);
  errors.observeBoundaryError(doc, new Error('private'), {}, submit);
  opening.observeErrorPresentation(doc, submit);
  expect(
    submit.mock.calls.map(([e]) =>
      'reason' in e ? [e.reason, e.screen, e.sequence] : [e.eventName, e.screen, e.sequence]
    )
  ).toEqual([
    ['pwa.app.opened', 'home', 1],
    ['pwa.screen.presented', 'home', 2],
    ['browser.render', 'home', 3],
    ['pwa.screen.presented', 'error', 4],
  ]);
  const early = owner();
  opening.observeOpening(early, true, null, submit);
  opening.observeErrorPresentation(early, submit);
  expect(submit).toHaveBeenCalledTimes(4);
});
it('does not mistake a later independent native dispatch for an active boundary episode', async () => {
  const doc = owner(),
    submit = vi.fn(async (_input: Observation) => {});
  opening.observeOpening(doc, true, null, async () => {});
  // Native target uses this fresh Document; no React/provider lifetime is identity.
  const target = new EventTarget() as Window;
  Object.defineProperty(target, 'document', { value: doc });
  const dispose = errors.registerNativeErrors(target, submit);
  const error = new Error('private');
  errors.observeBoundaryError(doc, error, {}, submit);
  target.dispatchEvent(new ErrorEvent('error', { error }));
  expect(submit).toHaveBeenCalledTimes(1);
  await Promise.resolve();
  target.dispatchEvent(new ErrorEvent('error', { error }));
  expect(submit).toHaveBeenCalledTimes(2);
  dispose();
});
it('keeps an initially absent context standalone if opt-in resolution finishes after presentation initializes context', () => {
  const doc = owner(),
    submit = vi.fn(async (_input: Observation) => {});
  opening.observeOpening(doc, true, '/home', async () => {});
  const at = Date.now() - 100;
  errors.observeBoundaryError(doc, new Error('private'), {}, submit, at, true);
  expect(submit.mock.calls[0][0]).toMatchObject({ reason: 'browser.render', timestamp: at });
  expect(submit.mock.calls[0][0]).not.toHaveProperty('sessionId');
  expect(submit.mock.calls[0][0]).not.toHaveProperty('screen');
  opening.observeOpening(doc, true, '/recipes', submit);
  expect(submit.mock.calls[1][0]).toMatchObject({ sequence: 3, screen: 'search' });
});
it('keeps native suppression cleanup bounded to one microtask per document turn during a storm', () => {
  const doc = owner(),
    submit = vi.fn(async (_input: Observation) => {});
  opening.observeOpening(doc, true, null, async () => {});
  const target = new EventTarget() as Window;
  Object.defineProperty(target, 'document', { value: doc });
  const release = errors.registerNativeErrors(target, submit);
  const scheduled: VoidFunction[] = [];
  vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((work) => {
    scheduled.push(work);
  });
  for (let i = 0; i < 1000; i++)
    target.dispatchEvent(new ErrorEvent('error', { error: new Error('private') }));
  expect(submit).toHaveBeenCalledTimes(10);
  expect(scheduled).toHaveLength(1);
  scheduled.forEach((work) => work());
  release();
});
it('suppresses demonstrable native/boundary overlap for multiple episodes in the same turn', () => {
  const doc = owner(),
    submit = vi.fn(async (_input: Observation) => {});
  opening.observeOpening(doc, true, null, async () => {});
  const target = new EventTarget() as Window;
  Object.defineProperty(target, 'document', { value: doc });
  const release = errors.registerNativeErrors(target, submit);
  const first = new Error('private'),
    second = new Error('private');
  target.dispatchEvent(new ErrorEvent('error', { error: first }));
  target.dispatchEvent(new ErrorEvent('error', { error: second }));
  errors.observeBoundaryError(doc, first, {}, submit);
  errors.observeBoundaryError(doc, second, {}, submit);
  expect(submit).toHaveBeenCalledTimes(2);
  release();
});
