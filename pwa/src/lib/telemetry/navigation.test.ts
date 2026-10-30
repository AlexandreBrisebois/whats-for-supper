import { afterEach, expect, it, vi } from 'vitest';
import { observeOpening } from './opening';

function owner() {
  const doc = document.implementation.createHTMLDocument();
  let visible = true;
  Object.defineProperty(doc, 'visibilityState', { get: () => (visible ? 'visible' : 'hidden') });
  return {
    doc,
    visibility: (value: boolean) => {
      visible = value;
    },
  };
}
afterEach(() => vi.restoreAllMocks());

it('allocates opening then initial and subsequent screens in one anonymous stream', () => {
  const { doc } = owner();
  const submit = vi.fn().mockResolvedValue(undefined);
  for (const path of ['/home', '/home', '/recipes', '/recipes', '/home'])
    observeOpening(doc, true, path, submit);
  const stream = submit.mock.calls.map(([input]) => input);
  expect(stream.map((event) => [event.eventName, event.screen])).toEqual([
    ['pwa.app.opened', 'home'],
    ['pwa.screen.presented', 'home'],
    ['pwa.screen.presented', 'search'],
    ['pwa.screen.presented', 'home'],
  ]);
  expect(stream.map((event) => event.sequence)).toEqual([1, 2, 3, 4]);
  expect(new Set(stream.map((event) => event.sessionId)).size).toBe(1);
  expect(new Set(stream.map((event) => event.tabId)).size).toBe(1);
  expect(new Set(stream.map((event) => event.eventId)).size).toBe(4);
  for (const event of stream) {
    expect(event.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.tabId).not.toBe(event.sessionId);
    expect(event.timestamp).toBeGreaterThan(0);
    expect(Object.keys(event).sort()).toEqual([
      'eventId',
      'eventName',
      'screen',
      'sequence',
      'sessionId',
      'tabId',
      'timestamp',
    ]);
  }
});

it('reconciles current visible presentation and does not replay hidden routes or unchanged resume', () => {
  const { doc, visibility } = owner();
  const submit = vi.fn().mockResolvedValue(undefined);
  observeOpening(doc, true, '/home', submit);
  visibility(false);
  observeOpening(doc, true, '/capture', submit);
  observeOpening(doc, true, '/recipes', submit);
  expect(submit).toHaveBeenCalledTimes(2);
  visibility(true);
  observeOpening(doc, true, '/recipes', submit);
  visibility(false);
  visibility(true);
  observeOpening(doc, true, '/recipes', submit);
  expect(submit.mock.calls.map(([event]) => event.screen)).toEqual(['home', 'home', 'search']);
});

it('generates independent scopes per document and no scope for initially disabled documents', () => {
  const random = vi.spyOn(crypto, 'randomUUID');
  const submit = vi.fn().mockResolvedValue(undefined);
  const disabled = owner().doc;
  observeOpening(disabled, false, null, submit);
  observeOpening(disabled, true, '/home', submit);
  expect(random).not.toHaveBeenCalled();
  observeOpening(owner().doc, true, '/home', submit);
  observeOpening(owner().doc, true, '/home', submit);
  expect(submit).toHaveBeenCalledTimes(4);
  expect(submit.mock.calls[0][0].sessionId).not.toBe(submit.mock.calls[2][0].sessionId);
  expect(submit.mock.calls[0][0].tabId).not.toBe(submit.mock.calls[2][0].tabId);
});

it('consumes sequence before document admission and never retries a lost observation', () => {
  vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
  const { doc } = owner();
  const submit = vi.fn().mockRejectedValue(new Error('private sentinel'));
  for (let i = 0; i < 66; i++) observeOpening(doc, true, i % 2 ? '/recipes' : '/home', submit);
  expect(submit).toHaveBeenCalledTimes(61); // one opening and 60 screens
  vi.mocked(Date.now).mockReturnValue(1_800_000_060_001);
  observeOpening(doc, true, '/home', submit);
  expect(submit.mock.calls.at(-1)?.[0].sequence).toBe(68);
  observeOpening(doc, true, '/home', submit);
  expect(submit).toHaveBeenCalledTimes(62);
});

it('keeps correlation entirely in memory without reading or writing browser storage', () => {
  const read = vi.spyOn(Storage.prototype, 'getItem');
  const write = vi.spyOn(Storage.prototype, 'setItem');
  const submit = vi.fn().mockResolvedValue(undefined);
  const { doc } = owner();
  observeOpening(doc, true, '/home', submit);
  observeOpening(doc, true, '/recipes', submit);
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect(submit).toHaveBeenCalledTimes(3);
});
