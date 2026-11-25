import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  pathname: '/home',
  layoutProps: null as null | Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
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

vi.mock('@/components/capture/LibraryToast', () => ({
  LibraryToast: () => <div data-testid="library-toast-mock" />,
}));

vi.mock('@/components/capture/RecipeFailureBanner', () => ({
  RecipeFailureBanner: () => <div data-testid="recipe-failure-banner-mock" />,
}));

vi.mock('@/store/libraryStore', () => ({
  useLibraryStore: {},
}));

vi.mock('@/store/captureStore', () => ({
  useCaptureStore: {},
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/common/Layout', () => ({
  Layout: ({ children, ...props }: any) => {
    mocks.layoutProps = props;
    return <div data-testid="app-layout">{children}</div>;
  },
}));

import AppRouteLayout from './layout';

describe('AppRouteLayout', () => {
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

    expect(screen.queryByTestId('library-toast-mock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recipe-failure-banner-mock')).not.toBeInTheDocument();
  });
});
