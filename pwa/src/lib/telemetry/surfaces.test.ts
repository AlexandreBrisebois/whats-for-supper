import { describe, expect, it, vi } from 'vitest';
import { observeOpening, presentationChanged } from './opening';
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
    for (let i = 0; i < 40; i++) {
      registerSurfacePresentation(f.owner, '/home', 'quick.find', true);
      registerSurfacePresentation(f.owner, '/home', 'quick.find', false);
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
