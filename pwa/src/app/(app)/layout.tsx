'use client';

import { Layout } from '@/components/common/Layout';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/lib/constants/routes';
import Link from 'next/link';
import { X } from 'lucide-react';
import { t } from '@/locales';
import { useScheduleStream } from '@/hooks/useScheduleStream';
import { WeekStoreInitializer } from '@/components/WeekStoreInitializer';
import { LibraryToast } from '@/components/capture/LibraryToast';
import { RecipeFailureBanner } from '@/components/capture/RecipeFailureBanner';
import { useEffect } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { useCaptureStore } from '@/store/captureStore';

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Mount SSE stream once at layout level — survives page navigation within the app shell
  useScheduleStream();

  // Expose stores on window for E2E test access (Playwright page.evaluate).
  useEffect(() => {
    (window as any).__libraryStore = useLibraryStore;
    (window as any).__captureStore = useCaptureStore;
  }, []);

  // Determine if we should hide navigation (e.g., for Capture flow or Browse All Stack)
  const isCapture = pathname.startsWith(ROUTES.CAPTURE);
  const isBrowseAllStack = pathname.startsWith('/browse-all-stack');

  // Map pathnames to titles
  const getHeaderProps = (path: string) => {
    if (path === ROUTES.HOME) return { title: t('navigation.home', 'Home') };
    if (path === '/recipes') return { title: t('navigation.search', 'Search') };
    if (path === ROUTES.PLANNER) return { title: t('navigation.planner', 'Weekly Planner') };
    if (path === ROUTES.DISCOVERY) return { title: t('navigation.discover', 'Discovery') };
    if (path === ROUTES.PROFILE) return { title: t('navigation.profile', 'Profile') };
    if (path.startsWith(ROUTES.CAPTURE)) {
      return {
        title: t('capture.addRecipe', 'Add a Recipe'),
        rightAction: (
          <Link
            href={ROUTES.HOME}
            data-testid="capture-cancel-btn"
            aria-label="Cancel capture"
            className="flex h-10 w-10 items-center justify-center rounded-full text-charcoal/60 hover:bg-terracotta/5 active:scale-95 transition-all"
          >
            <X size={20} />
          </Link>
        ),
      };
    }
    return {};
  };

  const headerProps = getHeaderProps(pathname);

  // Hide header for main app routes, keep for Capture (modal)
  const mainAppRoutes = [
    ROUTES.HOME,
    '/recipes',
    ROUTES.PLANNER,
    ROUTES.DISCOVERY,
    ROUTES.PROFILE,
    '/profile/settings',
  ];
  const hideHeader = mainAppRoutes.includes(pathname as any);

  const usesStackBackground =
    pathname === ROUTES.HOME ||
    pathname === ROUTES.DISCOVERY ||
    pathname === ROUTES.PROFILE ||
    pathname === '/recipes' ||
    pathname === '/profile/settings';
  const isDiscovery = pathname === ROUTES.DISCOVERY;
  const isHome = pathname === ROUTES.HOME;
  const isPlanner = pathname === ROUTES.PLANNER;

  return (
    <>
      {/* Pre-seed weekStore for weekOffset=0 on app load (BS-2 fix) */}
      <WeekStoreInitializer />
      {/* Notification layer — mounted at layout level, same as useScheduleStream */}
      <LibraryToast />
      <RecipeFailureBanner />
      <Layout
        {...headerProps}
        hideNavigation={isCapture || isBrowseAllStack}
        hideHeader={hideHeader || isBrowseAllStack}
        isFluid={isHome || isDiscovery || isPlanner || isCapture || isBrowseAllStack}
        className={usesStackBackground ? 'solar-earth-bg' : ''}
      >
        {children}
      </Layout>
    </>
  );
}
