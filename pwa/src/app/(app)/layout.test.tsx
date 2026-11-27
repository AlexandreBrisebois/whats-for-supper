import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { clearHandoffLock, getHandoffLock, setHandoffLock } from '@/lib/discovery/passThePhone';

const mocks = vi.hoisted(() => ({
  pathname: '/home',
  replace: vi.fn(),
  layoutProps: null as null | Record<string, unknown>,
  familyMembers: [
    { id: 'member-alex', name: 'Alex' },
    { id: 'member-jordan', name: 'Jordan' },
  ],
  hasLoaded: true,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: (...args: unknown[]) => mocks.replace(...args) }),
}));

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({
    familyMembers: mocks.familyMembers,
    hasLoaded: mocks.hasLoaded,
  }),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  getLocale: () => 'en',
  setLocale: vi.fn(),
}));

vi.mock('@/hooks/useScheduleStream', () => ({
  useScheduleStream: () => undefined,
}));

vi.mock('@/components/WeekStoreInitializer', () => ({
  WeekStoreInitializer: () => null,
}));

vi.mock('@/store/libraryStore', () => ({
  useLibraryStore: {},
}));

vi.mock('@/store/captureStore', () => ({
  useCaptureStore: {},
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/common/Layout', () => ({
  Layout: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => {
    mocks.layoutProps = props;
    return <div data-testid="app-layout">{children}</div>;
  },
}));

import AppRouteLayout from './layout';

describe('AppRouteLayout', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearHandoffLock();
    mocks.replace.mockReset();
    mocks.pathname = '/home';
    mocks.familyMembers = [
      { id: 'member-alex', name: 'Alex' },
      { id: 'member-jordan', name: 'Jordan' },
    ];
    mocks.hasLoaded = true;
  });

  it('uses the fluid shell on the home route', () => {
    mocks.pathname = '/home';
    mocks.layoutProps = null;

    render(
      <AppRouteLayout>
        <div>Home</div>
      </AppRouteLayout>
    );

    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(mocks.layoutProps).toMatchObject({
      hideHeader: true,
      isFluid: true,
    });
  });

  it('uses the fluid shell on the planner route', () => {
    mocks.pathname = '/planner';
    mocks.layoutProps = null;

    render(
      <AppRouteLayout>
        <div>Planner</div>
      </AppRouteLayout>
    );

    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(mocks.layoutProps).toMatchObject({
      hideHeader: true,
      isFluid: true,
    });
  });

  it('gives Recipes the fluid shell used by the other primary destinations', () => {
    mocks.pathname = '/recipes';
    mocks.layoutProps = null;

    render(
      <AppRouteLayout>
        <div>Recipes</div>
      </AppRouteLayout>
    );

    expect(mocks.layoutProps).toMatchObject({ hideHeader: true, isFluid: true });
  });

  it('does not mount global LibraryToast or RecipeFailureBanner overlays in notification-zone', () => {
    mocks.pathname = '/recipes';
    render(
      <AppRouteLayout>
        <div>Recipes</div>
      </AppRouteLayout>
    );

    expect(screen.getByTestId('notification-zone')).toBeInTheDocument();
    expect(screen.queryByTestId('library-toast-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId(/^recipe-failure-banner-/)).not.toBeInTheDocument();
  });

  it('redirects stray routes back to /discovery while handoff lock is active', () => {
    setHandoffLock({ originMemberId: 'member-alex', participantName: 'Jordan' });
    mocks.pathname = '/planner';

    render(
      <AppRouteLayout>
        <div>Planner</div>
      </AppRouteLayout>
    );

    expect(mocks.replace).toHaveBeenCalledExactlyOnceWith('/discovery');
    expect(getHandoffLock()).toEqual({
      originMemberId: 'member-alex',
      participantName: 'Jordan',
    });
  });

  it('clears lock and routes to /profile when locked origin member no longer exists', () => {
    setHandoffLock({ originMemberId: 'deleted-origin', participantName: 'Jordan' });
    mocks.pathname = '/discovery';
    mocks.familyMembers = [{ id: 'member-jordan', name: 'Jordan' }];
    mocks.hasLoaded = true;

    render(
      <AppRouteLayout>
        <div>Discovery</div>
      </AppRouteLayout>
    );

    expect(getHandoffLock()).toBeNull();
    expect(mocks.replace).toHaveBeenCalledExactlyOnceWith('/profile');
  });
});
