import { afterEach, expect, it, vi } from 'vitest';
import { parseBrowserObservation } from './navigation';
import { observation } from '@/test/telemetry';
import { registerPlannerPresentation, observeOpening } from './opening';

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

it('reconciles Planner primary and companion cycles in the document stream', () => {
  const { doc, visibility } = owner();
  const submit = vi.fn().mockResolvedValue(undefined);
  observeOpening(doc, true, '/planner', submit);
  expect(submit).not.toHaveBeenCalled(); // Composition must be declared, not guessed.
  let release = registerPlannerPresentation(doc, 'planner.grocery', false);
  observeOpening(doc, true, '/planner', submit);
  release();
  release = registerPlannerPresentation(doc, 'planner', true);
  observeOpening(doc, true, '/planner', submit);
  observeOpening(doc, true, '/planner', submit);
  release(); // Effect replay with the same composition adds nothing.
  release = registerPlannerPresentation(doc, 'planner', true);
  observeOpening(doc, true, '/planner', submit);
  visibility(false);
  release();
  release = registerPlannerPresentation(doc, 'planner.grocery', false);
  observeOpening(doc, true, '/planner', submit);
  release();
  release = registerPlannerPresentation(doc, 'planner', true);
  observeOpening(doc, true, '/planner', submit);
  visibility(true);
  observeOpening(doc, true, '/planner', submit); // unchanged resume
  release();
  release = registerPlannerPresentation(doc, 'planner.grocery', false);
  observeOpening(doc, true, '/planner', submit);
  release();
  registerPlannerPresentation(doc, 'planner', true);
  observeOpening(doc, true, '/planner', submit);
  observeOpening(doc, true, '/home', submit); // actual route departure closes companion
  const stream = submit.mock.calls.map(([event]) => event);
  expect(stream.map((e) => [e.eventName, e.screen])).toEqual([
    ['pwa.app.opened', 'planner'],
    ['pwa.screen.presented', 'planner.grocery'],
    ['pwa.screen.presented', 'planner'],
    ['pwa.surface.opened', 'planner.grocery'],
    ['pwa.surface.closed', 'planner.grocery'],
    ['pwa.screen.presented', 'planner.grocery'],
    ['pwa.screen.presented', 'planner'],
    ['pwa.surface.opened', 'planner.grocery'],
    ['pwa.surface.closed', 'planner.grocery'],
    ['pwa.screen.presented', 'home'],
  ]);
  expect(stream.map((e) => e.sequence)).toEqual(stream.map((_, i) => i + 1));
  expect(new Set(stream.map((e) => e.sessionId)).size).toBe(1);
  expect(new Set(stream.map((e) => e.tabId)).size).toBe(1);
  expect(new Set(stream.map((e) => e.eventId)).size).toBe(stream.length);
});

it('waits for visible composition and reconciles only the final hidden change', () => {
  const { doc, visibility } = owner();
  const submit = vi.fn().mockResolvedValue(undefined);
  const release = registerPlannerPresentation(doc, 'planner', true);
  observeOpening(doc, true, '/planner', submit);
  visibility(false);
  release();
  registerPlannerPresentation(doc, 'planner.grocery', false);
  observeOpening(doc, true, '/planner', submit);
  expect(submit).toHaveBeenCalledTimes(3);
  visibility(true);
  observeOpening(doc, true, '/planner', submit);
  observeOpening(doc, true, '/planner', submit);
  expect(submit.mock.calls.slice(3).map(([e]) => [e.eventName, e.screen])).toEqual([
    ['pwa.surface.closed', 'planner.grocery'],
    ['pwa.screen.presented', 'planner.grocery'],
  ]);
});

it('admits only the adopted surface and primary identities at the real forwarding boundary', () => {
  for (const eventName of ['pwa.surface.opened', 'pwa.surface.closed'] as const) {
    expect(
      parseBrowserObservation(observation('planner.grocery', eventName), Date.now())
    ).not.toBeNull();
    expect(parseBrowserObservation(observation('home', eventName), Date.now())).toBeNull();
    expect(
      parseBrowserObservation(
        { ...observation('planner.grocery', eventName), week: 'private' },
        Date.now()
      )
    ).toBeNull();
  }
  expect(
    parseBrowserObservation(observation('planner.grocery', 'pwa.screen.presented'), Date.now())
  ).not.toBeNull();
  expect(
    parseBrowserObservation(observation('planner.grocery', 'pwa.app.opened'), Date.now())
  ).toBeNull();
});

it('orders an initial wide companion after opening and screen, with one shared admission budget', () => {
  const { doc } = owner();
  const submit = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
  let release = registerPlannerPresentation(doc, 'planner', true);
  observeOpening(doc, true, '/planner', submit);
  expect(submit.mock.calls.map(([e]) => [e.eventName, e.screen])).toEqual([
    ['pwa.app.opened', 'planner'],
    ['pwa.screen.presented', 'planner'],
    ['pwa.surface.opened', 'planner.grocery'],
  ]);
  for (let i = 0; i < 65; i++) {
    release();
    release = registerPlannerPresentation(doc, i % 2 ? 'planner' : 'planner.grocery', !!(i % 2));
    observeOpening(doc, true, '/planner', submit);
  }
  expect(submit).toHaveBeenCalledTimes(61); // opening plus 60 screens/surfaces total
});

it('admits only the exact additional loaded-detail/original vocabulary on a primary stage', () => {
  const base = observation('search');
  const detail = { ...base, eventName: 'pwa.recipe_detail.presented' };
  const image = { ...base, eventName: 'pwa.original.presented', reason: 'image' };
  const request = { ...base, eventName: 'pwa.original.requested', reason: 'external' };
  for (const input of [detail, image, request]) {
    expect(parseBrowserObservation(input, Date.now())).toEqual(input);
    expect(parseBrowserObservation({ ...input, recipeId: 'private' }, Date.now())).toBeNull();
    expect(parseBrowserObservation({ ...input, screen: 'recipe.detail' }, Date.now())).toBeNull();
  }
  for (const input of [
    { ...detail, reason: 'image' },
    { ...image, reason: 'external' },
    { ...request, reason: 'image' },
    { ...request, reason: 'private' },
    { ...base, eventName: 'pwa.original.presented' },
    { ...base, reason: 'external' },
  ])
    expect(parseBrowserObservation(input, Date.now())).toBeNull();
});

it('accepts only four exact issue results with a current primary stage', () => {
  const base = { ...observation('search'), eventName: 'pwa.recipe_issue.save_result' };
  for (const reason of [
    'saved_manual',
    'processing_acknowledged',
    'saved_launch_failed',
    'unconfirmed',
  ]) {
    const input = { ...base, reason };
    expect(parseBrowserObservation(input, Date.now())).toEqual(input);
    for (const extra of [
      { recipeId: 'private' },
      { producer: 'server' },
      { importId: 'private' },
      { screen: 'recipe.detail' },
    ])
      expect(parseBrowserObservation({ ...input, ...extra }, Date.now())).toBeNull();
  }
  for (const reason of [undefined, 'image', 'ready', 'private', null, true, [], {}])
    expect(parseBrowserObservation({ ...base, reason }, Date.now())).toBeNull();
  const getter = vi.fn(() => 'saved_manual');
  expect(
    parseBrowserObservation(
      Object.defineProperty({ ...base, reason: '' }, 'reason', { get: getter }),
      Date.now()
    )
  ).toBeNull();
  expect(getter).not.toHaveBeenCalled();
  expect(
    parseBrowserObservation({ ...base, reason: 'saved_manual', note: 'x'.repeat(2048) }, Date.now())
  ).toBeNull();
});
