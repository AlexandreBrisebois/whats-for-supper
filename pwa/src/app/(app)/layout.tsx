'use client';

import { Layout } from '@/components/common/Layout';
import { usePathname, useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants/routes';
import { t } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';
import { useScheduleStream } from '@/hooks/useScheduleStream';
import { WeekStoreInitializer } from '@/components/WeekStoreInitializer';
import { useEffect } from 'react';
import { useVisualViewportOffset } from '@/hooks/useVisualViewportOffset';
import { useLibraryStore } from '@/store/libraryStore';
import { useCaptureStore } from '@/store/captureStore';
import { ToastContainer } from '@/components/ui';
import { LanguageSwitchProposal } from '@/components/common/LanguageSwitchProposal';
import { FeatureFlagProvider } from '@/components/featureFlags/FeatureFlagProvider';
import { DemoResetBoundary } from '@/components/demo/DemoResetBoundary';
import { DemoModeProvider } from '@/components/demo/DemoModeProvider';
import { useFamily } from '@/hooks/useFamily';
import { clearHandoffLock, useHandoffLock } from '@/lib/discovery/passThePhone';

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useLocale();
  const visualViewportOffset = useVisualViewportOffset();
  const handoffLock = useHandoffLock();
  const { familyMembers, hasLoaded } = useFamily();

  // Mount SSE stream once at layout level — survives page navigation within the app shell
  useScheduleStream();

  // Enforce locked Pass the phone Discovery navigation & self-heal missing origin
  useEffect(() => {
    if (!handoffLock) return;
    if (hasLoaded) {
      const originExists = familyMembers.some(
        (m) => m.id.toLowerCase() === handoffLock.originMemberId.toLowerCase()
      );
      if (!originExists) {
        clearHandoffLock();
        if (pathname !== ROUTES.PROFILE) {
          router.replace(ROUTES.PROFILE);
        }
        return;
      }
    }
    if (pathname !== ROUTES.DISCOVERY) {
      router.replace(ROUTES.DISCOVERY);
    }
  }, [handoffLock, hasLoaded, familyMembers, pathname, router]);

  // Expose stores on window for E2E test access (Playwright page.evaluate).
  useEffect(() => {
    (window as any).__libraryStore = useLibraryStore;
    (window as any).__captureStore = useCaptureStore;
  }, []);

  // Capture owns its open-cream Era 3 header and universal cancel control.
  const isCapture = pathname.startsWith(ROUTES.CAPTURE);

  // Map pathnames to titles
  const getHeaderProps = (path: string) => {
    if (path === ROUTES.HOME) return { title: t('navigation.home', 'Home', locale) };
    if (path === '/recipes') return { title: t('navigation.recipes', 'Recipes', locale) };
    if (path === ROUTES.PLANNER) return { title: t('navigation.planner', 'Planner', locale) };
    if (path === ROUTES.DISCOVERY) return { title: t('navigation.discover', 'Discovery', locale) };
    if (path === ROUTES.PROFILE) return { title: t('navigation.profile', 'Profile', locale) };
    return {};
  };

  const headerProps = getHeaderProps(pathname);

  // Hide legacy glass header for main app routes and Capture (each owns its Era 3 header)
  const mainAppRoutes = [
    ROUTES.HOME,
    '/recipes',
    ROUTES.PLANNER,
    ROUTES.DISCOVERY,
    ROUTES.PROFILE,
    '/profile/settings',
  ];
  const hideHeader = isCapture || mainAppRoutes.includes(pathname as any);

  const isDiscovery = pathname === ROUTES.DISCOVERY;
  const isHome = pathname === ROUTES.HOME;
  const isPlanner = pathname === ROUTES.PLANNER;

  const usesStackBackground =
    isHome ||
    isDiscovery ||
    isCapture ||
    pathname === ROUTES.PROFILE ||
    pathname === '/recipes' ||
    pathname === '/profile/settings';

  return (
    <DemoResetBoundary>
      <FeatureFlagProvider>
        <DemoModeProvider>
          {/* Pre-seed weekStore for weekOffset=0 on app load (BS-2 fix) */}
          <WeekStoreInitializer />
          {/* Notification layer — fixed at the top, stackable flex column */}
          <div
            data-testid="notification-zone"
            style={{ top: `calc(1rem + env(safe-area-inset-top) + ${visualViewportOffset}px)` }}
            className="fixed left-4 right-4 top-[calc(1rem+env(safe-area-inset-top))] z-[200] flex flex-col items-center gap-2 pointer-events-none"
          >
            <LanguageSwitchProposal />
            <ToastContainer />
          </div>
          <Layout
            {...headerProps}
            hideNavigation={isCapture}
            hideHeader={hideHeader}
            isFluid={
              isHome ||
              isDiscovery ||
              isPlanner ||
              isCapture ||
              pathname === ROUTES.PROFILE ||
              pathname === '/recipes'
            }
            className={usesStackBackground ? 'cookbook-bg' : ''}
            showBackgroundBlobs={isHome || isDiscovery}
          >
            {children}
          </Layout>
        </DemoModeProvider>
      </FeatureFlagProvider>
    </DemoResetBoundary>
  );
}
