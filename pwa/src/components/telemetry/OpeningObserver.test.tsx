import { StrictMode, type ComponentType } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const route = vi.hoisted(() => ({ pathname: '/recipes' }));
const family = vi.hoisted(() => ({
  selectedFamilyMemberId: 'fixture-member' as string | null,
  familyMembers: [{ id: 'fixture-member' }],
  _hasHydrated: true,
  hasLoaded: true,
  isLoading: false,
  loadFamily: vi.fn().mockResolvedValue(undefined),
}));
const replace = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useFamily', () => ({ useFamily: () => family }));
vi.mock('@/store/familyStore', () => ({
  useFamilyStore: {
    getState: () => ({
      ...family,
      loadCurrentIdentity: () => new Promise(() => {}),
      selectFamilyMember: vi.fn(),
    }),
  },
}));
vi.mock('@/lib/identity/cookie', () => ({ getFamilyMemberIdCookie: () => null }));
const submit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('next/navigation', () => ({
  usePathname: () => route.pathname,
  useRouter: () => ({ replace }),
}));
vi.mock('@/lib/telemetry/actions', () => ({ reportBrowserObservation: submit }));
let Observer: ComponentType<{ enabled: boolean; readyPathname: string | null }>;
let ErrorFallback: ComponentType<{ error: Error; reset: () => void }>;
let NotFound: ComponentType;
let Gate: ComponentType<{ children: React.ReactNode; telemetryEnabled: boolean }>;
let visible = true;
beforeEach(async () => {
  vi.resetModules();
  submit.mockClear();
  replace.mockClear();
  family.selectedFamilyMemberId = 'fixture-member';
  family.hasLoaded = true;
  family.loadFamily.mockResolvedValue(undefined);
  route.pathname = '/recipes';
  visible = true;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
    visible ? 'visible' : 'hidden'
  );
  Observer = (await import('./OpeningObserver')).OpeningObserver;
  ErrorFallback = (await import('@/app/error')).default;
  Gate = (await import('@/components/identity/IdentityValidator')).IdentityValidator;
  NotFound = (await import('@/app/not-found')).default;
});
function visibility(value: boolean) {
  act(() => {
    visible = value;
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

it('requires current gate readiness, ignoring a stale ready pathname and redirect-only root', () => {
  route.pathname = '/';
  const view = render(<Observer enabled readyPathname="/" />);
  route.pathname = '/capture';
  view.rerender(<Observer enabled readyPathname="/recipes" />);
  expect(submit).not.toHaveBeenCalled();
  route.pathname = '/onboarding';
  view.rerender(<Observer enabled readyPathname="/onboarding" />);
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'onboarding' }]]);
});

it('uses the current visible route, never the departed hidden candidate', () => {
  visible = false;
  const view = render(<Observer enabled readyPathname="/recipes" />);
  route.pathname = '/capture';
  view.rerender(<Observer enabled readyPathname="/capture" />);
  expect(submit).not.toHaveBeenCalled();
  visibility(true);
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'capture' }]]);
});

it('claims once across effect replay, remount and same-document history restoration', () => {
  const view = render(
    <StrictMode>
      <Observer enabled readyPathname="/recipes" />
    </StrictMode>
  );
  view.unmount();
  route.pathname = '/home';
  const restored = render(<Observer enabled readyPathname="/home" />);
  act(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  route.pathname = '/recipes';
  restored.rerender(<Observer enabled readyPathname="/recipes" />);
  visibility(false);
  visibility(true);
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'search' }]]);
});

it('manufactures no opening when a hidden or gated candidate is cancelled', () => {
  visible = false;
  const view = render(<Observer enabled readyPathname="/recipes" />);
  view.unmount();
  visibility(true);
  const gated = render(<Observer enabled readyPathname={null} />);
  gated.unmount();
  visibility(true);
  expect(submit).not.toHaveBeenCalled();
});

it('cannot rearm initial disabled collection on navigation or visibility', () => {
  const view = render(<Observer enabled={false} readyPathname={null} />);
  route.pathname = '/home';
  view.rerender(<Observer enabled readyPathname="/home" />);
  visibility(false);
  visibility(true);
  expect(submit).not.toHaveBeenCalled();
});

it('automatically covers an unregistered page without page telemetry calls', () => {
  route.pathname = '/new-page/private-value';
  function UnregisteredPage() {
    return <main>New page</main>;
  }
  render(
    <>
      <Observer enabled readyPathname={route.pathname} />
      <UnregisteredPage />
    </>
  );
  expect(screen.getByText('New page')).toBeVisible();
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'other' }]]);
});

it('keeps Home classification beneath a context dialog', () => {
  route.pathname = '/home';
  render(
    <>
      <Observer enabled readyPathname="/home" />
      <div role="dialog">Introduction</div>
    </>
  );
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'home' }]]);
});

it.each(['error', 'not.found'] as const)(
  'observes the actual first %s fallback rather than Search',
  (kind) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <>
        <Observer enabled readyPathname="/recipes" />
        {kind === 'error' ? (
          <ErrorFallback error={new Error('private error')} reset={() => {}} />
        ) : (
          <NotFound />
        )}
      </>
    );
    expect(
      submit.mock.calls
        .filter(([e]) => e.eventName === 'pwa.app.opened')
        .map(([e]) => [{ screen: e.screen }])
    ).toEqual([[{ screen: kind }]]);
  }
);

it('cleans a cancelled hidden fallback before the next eligible screen', () => {
  visible = false;
  const view = render(
    <>
      <Observer enabled readyPathname="/recipes" />
      <NotFound />
    </>
  );
  route.pathname = '/home';
  view.rerender(<Observer enabled readyPathname="/home" />);
  visibility(true);
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'home' }]]);
});

it('invalidates hidden readiness when identity changes on the same pathname', async () => {
  visible = false;
  const view = render(
    <Gate telemetryEnabled>
      <main>Protected shell</main>
    </Gate>
  );
  await screen.findByText('Protected shell');
  family.selectedFamilyMemberId = null;
  view.rerender(
    <Gate telemetryEnabled>
      <main>Protected shell</main>
    </Gate>
  );
  visibility(true);
  expect(submit).not.toHaveBeenCalled();
  route.pathname = '/onboarding';
  view.rerender(
    <Gate telemetryEnabled>
      <main>Choose member</main>
    </Gate>
  );
  await waitFor(() =>
    expect(
      submit.mock.calls
        .filter(([e]) => e.eventName === 'pwa.app.opened')
        .map(([e]) => [{ screen: e.screen }])
    ).toEqual([[{ screen: 'onboarding' }]])
  );
});

it('prevents a departed async identity check from tagging the next route ready', async () => {
  visible = false;
  family.hasLoaded = false;
  let complete!: () => void;
  family.loadFamily.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      complete = resolve;
    })
  );
  const view = render(
    <Gate telemetryEnabled>
      <main>Pending</main>
    </Gate>
  );
  expect(submit).not.toHaveBeenCalled();
  route.pathname = '/welcome';
  view.rerender(
    <Gate telemetryEnabled>
      <main>Welcome</main>
    </Gate>
  );
  await screen.findByText('Welcome');
  await act(async () => {
    complete();
  });
  visibility(true);
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'welcome' }]]);
});

it('uses a hidden fallback only while it is still the committed screen', () => {
  visible = false;
  render(
    <>
      <Observer enabled readyPathname="/recipes" />
      <NotFound />
    </>
  );
  expect(submit).not.toHaveBeenCalled();
  visibility(true);
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'not.found' }]]);
});

it('does not replace a claimed opening when a fallback appears later', () => {
  const view = render(<Observer enabled readyPathname="/recipes" />);
  view.rerender(
    <>
      <Observer enabled readyPathname="/recipes" />
      <NotFound />
    </>
  );
  visibility(false);
  visibility(true);
  expect(
    submit.mock.calls
      .filter(([e]) => e.eventName === 'pwa.app.opened')
      .map(([e]) => [{ screen: e.screen }])
  ).toEqual([[{ screen: 'search' }]]);
});

it('deduplicates both opening and screens across effect replay and remount', () => {
  const first = render(
    <StrictMode>
      <Observer enabled readyPathname="/recipes" />
    </StrictMode>
  );
  first.unmount();
  const second = render(<Observer enabled readyPathname="/recipes" />);
  second.rerender(<Observer enabled readyPathname="/recipes" />);
  expect(submit.mock.calls.map(([e]) => [e.eventName, e.screen, e.sequence])).toEqual([
    ['pwa.app.opened', 'search', 1],
    ['pwa.screen.presented', 'search', 2],
  ]);
});
