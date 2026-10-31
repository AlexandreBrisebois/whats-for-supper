import { describe, expect, it, vi } from 'vitest';
import {
  observeOpening,
  presentationChanged,
  registerLoadedPresentation,
  observeOriginalRequest,
} from './opening';
import { registerSurfacePresentation } from './surfaces';
import { parseBrowserObservation, type BrowserObservation } from './navigation';

function fixture() {
  const owner = document.implementation.createHTMLDocument();
  let visible = true;
  vi.spyOn(owner, 'visibilityState', 'get').mockImplementation(() =>
    visible ? 'visible' : 'hidden'
  );
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  let route = '/home';
  const observe = () => observeOpening(owner, true, route, submit);
  owner.addEventListener(presentationChanged, observe);
  observe();
  return {
    owner,
    submit,
    observe,
    stop: () => owner.removeEventListener(presentationChanged, observe),
    hide: () => {
      visible = false;
    },
    show: () => {
      visible = true;
      observe();
    },
    navigate: () => {
      route = '/recipes';
      observe();
    },
  };
}
const surfaces = (f: ReturnType<typeof fixture>) =>
  f.submit.mock.calls.map(([e]) => [e.eventName, e.screen]).slice(2);

describe('shared surface presentation', () => {
  it('deduplicates declarations/replay and observes distinct close/reopen cycles in the whole stream', async () => {
    const f = fixture();
    const close = registerSurfacePresentation(f.owner, '/home', 'quick.find', true);
    close();
    const closeAgain = registerSurfacePresentation(f.owner, '/home', 'quick.find', true);
    await Promise.resolve();
    f.observe();
    expect(surfaces(f)).toEqual([['pwa.surface.opened', 'quick.find']]);
    closeAgain();
    await Promise.resolve();
    registerSurfacePresentation(f.owner, '/home', 'quick.find', true);
    expect(surfaces(f)).toEqual([
      ['pwa.surface.opened', 'quick.find'],
      ['pwa.surface.closed', 'quick.find'],
      ['pwa.surface.opened', 'quick.find'],
    ]);
    const stream = f.submit.mock.calls.map(([e]) => e);
    expect(stream.map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(stream.map((e) => e.sessionId)).size).toBe(1);
    expect(new Set(stream.map((e) => e.eventId)).size).toBe(5);
  });
  it('discards hidden intermediate cycles and reconciles the current state on resume', async () => {
    const f = fixture();
    f.hide();
    registerSurfacePresentation(f.owner, '/home', 'quick.find', true)();
    await Promise.resolve();
    f.show();
    expect(surfaces(f)).toEqual([]);
    const close = registerSurfacePresentation(f.owner, '/home', 'quick.find', true);
    f.hide();
    close();
    await Promise.resolve();
    expect(surfaces(f)).toHaveLength(1);
    f.show();
    f.show();
    expect(surfaces(f)).toEqual([
      ['pwa.surface.opened', 'quick.find'],
      ['pwa.surface.closed', 'quick.find'],
    ]);
  });
  it('uses presented false and navigation as visible closures, never a teardown flush', async () => {
    const f = fixture();
    registerSurfacePresentation(f.owner, '/home', 'quick.find', false);
    expect(surfaces(f)).toEqual([]);
    const close = registerSurfacePresentation(f.owner, '/home', 'quick.find', true);
    f.navigate();
    close();
    await Promise.resolve();
    expect(surfaces(f)).toEqual([
      ['pwa.surface.opened', 'quick.find'],
      ['pwa.surface.closed', 'quick.find'],
      ['pwa.screen.presented', 'search'],
    ]);
    const g = fixture();
    const unmount = registerSurfacePresentation(g.owner, '/home', 'quick.find', true);
    g.stop();
    unmount();
    await Promise.resolve();
    expect(surfaces(g)).toEqual([['pwa.surface.opened', 'quick.find']]);
  });
  it('shares document admission, and allocates neither scope nor events while disabled', () => {
    const f = fixture();
    const instance = {};
    for (let i = 0; i < 40; i++) {
      registerSurfacePresentation(f.owner, '/home', 'quick.find', true, instance);
      registerSurfacePresentation(f.owner, '/home', 'quick.find', false, instance);
    }
    expect(f.submit).toHaveBeenCalledTimes(61); // opening plus 60 screen/surface records
    const owner = document.implementation.createHTMLDocument();
    vi.spyOn(owner, 'visibilityState', 'get').mockReturnValue('visible');
    const submit = vi.fn().mockResolvedValue(undefined);
    observeOpening(owner, false, '/home', submit);
    registerSurfacePresentation(owner, '/home', 'quick.find', true);
    observeOpening(owner, true, '/home', submit);
    expect(submit).not.toHaveBeenCalled();
  });
  it('rejects injected identities but admits only the reviewed quick.find surface envelope', () => {
    const f = fixture();
    registerSurfacePresentation(f.owner, '/home', 'private-title' as 'quick.find', true);
    expect(surfaces(f)).toEqual([]);
    const input = {
      ...f.submit.mock.calls[0][0],
      eventName: 'pwa.surface.opened',
      screen: 'quick.find',
    };
    expect(parseBrowserObservation(input, input.timestamp)).toEqual(input);
    expect(
      parseBrowserObservation({ ...input, screen: 'private-title' }, input.timestamp)
    ).toBeNull();
    expect(
      parseBrowserObservation({ ...input, eventName: 'pwa.screen.presented' }, input.timestamp)
    ).toBeNull();
  });
});

it('keeps overlapping same-identity instances open until the last true instance leaves', async () => {
  const f = fixture();
  const first = registerSurfacePresentation(f.owner, '/home', 'quick.find', true);
  const second = registerSurfacePresentation(f.owner, '/home', 'quick.find', true);
  registerSurfacePresentation(f.owner, '/home', 'quick.find', false);
  second();
  await Promise.resolve();
  expect(surfaces(f)).toEqual([['pwa.surface.opened', 'quick.find']]);
  first();
  await Promise.resolve();
  expect(surfaces(f)).toEqual([
    ['pwa.surface.opened', 'quick.find'],
    ['pwa.surface.closed', 'quick.find'],
  ]);
});

it('independently reconciles nested static detail and original surfaces', async () => {
  const f = fixture();
  const detail = registerSurfacePresentation(
    f.owner,
    '/home',
    'recipe.detail' as 'quick.find',
    true
  );
  const viewer = registerSurfacePresentation(
    f.owner,
    '/home',
    'original.photos' as 'quick.find',
    true
  );
  viewer();
  await Promise.resolve();
  expect(surfaces(f)).toEqual([
    ['pwa.surface.opened', 'recipe.detail'],
    ['pwa.surface.opened', 'original.photos'],
    ['pwa.surface.closed', 'original.photos'],
  ]);
  detail();
  await Promise.resolve();
  expect(surfaces(f).at(-1)).toEqual(['pwa.surface.closed', 'recipe.detail']);
});

it('claims loaded entries once across replay and shares nonrefillable detail/original caps', async () => {
  const f = fixture();
  const entry = {},
    instance = {};
  const release = registerLoadedPresentation(
    f.owner,
    '/home',
    'pwa.recipe_detail.presented',
    entry,
    true,
    instance
  );
  release();
  registerLoadedPresentation(
    f.owner,
    '/home',
    'pwa.recipe_detail.presented',
    entry,
    true,
    instance
  );
  await Promise.resolve();
  for (let i = 0; i < 25; i++) {
    registerLoadedPresentation(f.owner, '/home', 'pwa.recipe_detail.presented', {}, true, {});
    if (i % 2) observeOriginalRequest(f.owner, f.submit);
    else registerLoadedPresentation(f.owner, '/home', 'pwa.original.presented', {}, true, {});
  }
  const events = f.submit.mock.calls.map(([e]) => e);
  expect(events.filter((e) => e.eventName === 'pwa.recipe_detail.presented')).toHaveLength(20);
  expect(events.filter((e) => e.eventName.startsWith('pwa.original.'))).toHaveLength(20);
  expect(
    events.filter((e) => e.eventName.startsWith('pwa.original.')).every((e) => e.screen === 'home')
  ).toBe(true);
  expect(new Set(events.map((e) => e.eventId)).size).toBe(events.length);
  expect(new Set(events.map((e) => e.sessionId)).size).toBe(1);
  expect(events.map((e) => e.sequence)).toEqual([...events].map((_, i) => i + 1));
  f.stop();
});

it('waits for current visible loaded content and ignores hidden intermediate/released/native-closed declarations', async () => {
  const f = fixture();
  f.hide();
  const obsolete = registerLoadedPresentation(
    f.owner,
    '/home',
    'pwa.recipe_detail.presented',
    {},
    true,
    {}
  );
  obsolete();
  await Promise.resolve();
  const instance = {};
  registerLoadedPresentation(f.owner, '/home', 'pwa.original.presented', {}, false, instance);
  f.show();
  expect(f.submit.mock.calls.filter(([e]) => e.eventName.startsWith('pwa.original.'))).toHaveLength(
    0
  );
  expect(
    f.submit.mock.calls.filter(([e]) => e.eventName === 'pwa.recipe_detail.presented')
  ).toHaveLength(0);
  const current = {};
  f.hide();
  registerLoadedPresentation(f.owner, '/home', 'pwa.original.presented', current, true, instance);
  observeOriginalRequest(f.owner, f.submit); // Hidden launch has no delayed evidence.
  f.show();
  f.show();
  expect(
    f.submit.mock.calls.filter(([e]) => e.eventName === 'pwa.original.presented')
  ).toHaveLength(1);
  expect(
    f.submit.mock.calls.filter(([e]) => e.eventName === 'pwa.original.requested')
  ).toHaveLength(0);
});

it('uses explicit native-open/CSS visibility predicates and survives stale same-instance cleanup', async () => {
  const f = fixture();
  const native = f.owner.createElement('dialog');
  const instance = {};
  const mounted = registerSurfacePresentation(
    f.owner,
    '/home',
    'recipe.plan',
    native.open,
    instance
  );
  expect(surfaces(f)).toEqual([]); // mounted native dialog has not opened
  native.open = true; // actual native consumer supplies its successful open state
  const shown = registerSurfacePresentation(f.owner, '/home', 'recipe.plan', native.open, instance);
  mounted();
  await Promise.resolve();
  expect(surfaces(f)).toEqual([['pwa.surface.opened', 'recipe.plan']]);
  native.hidden = true;
  registerSurfacePresentation(
    f.owner,
    '/home',
    'recipe.plan',
    native.open && !native.hidden,
    instance
  );
  shown();
  await Promise.resolve();
  expect(surfaces(f).at(-1)).toEqual(['pwa.surface.closed', 'recipe.plan']);
  native.hidden = false;
  native.open = false;
  registerSurfacePresentation(
    f.owner,
    '/home',
    'recipe.plan',
    native.open && !native.hidden,
    instance
  );
  expect(surfaces(f)).toHaveLength(2);
});

it('reconciles a committed loaded entry declared before root readiness without allocating early scope', () => {
  const owner = document.implementation.createHTMLDocument();
  vi.spyOn(owner, 'visibilityState', 'get').mockReturnValue('visible');
  const submit = vi.fn().mockResolvedValue(undefined);
  observeOpening(owner, true, null, submit);
  registerLoadedPresentation(owner, '/recipes', 'pwa.recipe_detail.presented', {}, true, {});
  expect(submit).not.toHaveBeenCalled();
  observeOpening(owner, true, '/recipes', submit);
  expect(submit.mock.calls.map(([e]) => [e.eventName, e.screen])).toEqual([
    ['pwa.app.opened', 'search'],
    ['pwa.screen.presented', 'search'],
    ['pwa.recipe_detail.presented', 'search'],
  ]);
  observeOpening(owner, false, '/recipes', submit);
  observeOriginalRequest(owner, submit);
  expect(submit).toHaveBeenCalledTimes(3);
});

it.each(['detail', 'surface'] as const)(
  'does not admit a released unobserved %s when root readiness changes before cleanup',
  (kind) => {
    const owner = document.implementation.createHTMLDocument();
    vi.spyOn(owner, 'visibilityState', 'get').mockReturnValue('visible');
    const submit = vi.fn().mockResolvedValue(undefined);
    observeOpening(owner, true, null, submit);
    const release =
      kind === 'detail'
        ? registerLoadedPresentation(owner, '/recipes', 'pwa.recipe_detail.presented', {}, true, {})
        : registerSurfacePresentation(owner, '/recipes', 'recipe.detail', true, {});
    release();
    observeOpening(owner, true, '/recipes', submit); // Root effect precedes deferred removal.
    expect(submit.mock.calls.map(([e]) => [e.eventName, e.screen])).toEqual([
      ['pwa.app.opened', 'search'],
      ['pwa.screen.presented', 'search'],
    ]);
  }
);

it('does not close an observed surface when sibling dispatch interleaves cleanup and replay setup', async () => {
  const f = fixture();
  const instance = {};
  const release = registerSurfacePresentation(f.owner, '/home', 'recipe.detail', true, instance);
  release();
  registerSurfacePresentation(f.owner, '/home', 'original.photos', true, {});
  registerSurfacePresentation(f.owner, '/home', 'recipe.detail', true, instance);
  await Promise.resolve();
  expect(surfaces(f)).toEqual([
    ['pwa.surface.opened', 'recipe.detail'],
    ['pwa.surface.opened', 'original.photos'],
  ]);
});

it.each([
  'planning.pivot',
  'planning.non_cooking',
  'planning.recovery',
  'discovery.nudge',
  'invite.share',
  'profile.members',
  'demo.introduction',
  'demo.dialog',
  'capture.image_review',
  'capture.bundle_review',
  'capture.upload',
  'capture.queued',
  'capture.ready',
] as const)(
  'admits only the fixed M5 %s presentation in the shared document stream',
  async (identity) => {
    const f = fixture();
    const input = {
      ...f.submit.mock.calls[0][0],
      eventName: 'pwa.surface.opened',
      screen: identity,
    };
    expect(parseBrowserObservation(input, input.timestamp)).toEqual(input);
    const first = registerSurfacePresentation(f.owner, '/home', identity as 'quick.find', true);
    const second = registerSurfacePresentation(f.owner, '/home', identity as 'quick.find', true);
    first();
    await Promise.resolve();
    expect(surfaces(f)).toEqual([['pwa.surface.opened', identity]]);
    second();
    await Promise.resolve();
    expect(surfaces(f)).toEqual([
      ['pwa.surface.opened', identity],
      ['pwa.surface.closed', identity],
    ]);
    expect(
      parseBrowserObservation({ ...input, screen: identity + '.private-title' }, input.timestamp)
    ).toBeNull();
    expect(
      parseBrowserObservation({ ...input, eventName: 'pwa.screen.presented' }, input.timestamp)
    ).toBeNull();
    f.stop();
  }
);
