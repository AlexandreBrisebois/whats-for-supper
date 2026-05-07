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
}));

vi.mock('@/hooks/useScheduleStream', () => ({
  useScheduleStream: () => undefined,
}));

vi.mock('@/components/WeekStoreInitializer', () => ({
  WeekStoreInitializer: () => null,
}));

vi.mock('@/components/capture/LibraryToast', () => ({
  LibraryToast: () => null,
}));

vi.mock('@/components/capture/RecipeFailureBanner', () => ({
  RecipeFailureBanner: () => null,
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
});
