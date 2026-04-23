'use client';

import { Layout } from '@/components/common/Layout';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/lib/constants/routes';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Determine if we should hide navigation (e.g., for Capture flow)
  const isCapture = pathname.startsWith(ROUTES.CAPTURE);

  // Map pathnames to titles
  const getHeaderProps = (path: string) => {
    if (path === ROUTES.HOME) return { title: 'Home' };
    if (path === '/recipes') return { title: 'Search' };
    if (path === ROUTES.PLANNER) return { title: 'Weekly Planner' };
    if (path === ROUTES.DISCOVERY) return { title: 'Discovery' };
    if (path === ROUTES.PROFILE) return { title: 'Profile' };
    if (path.startsWith(ROUTES.CAPTURE)) {
      return {
        title: 'Add a Recipe',
        leftAction: (
          <Link
            href={ROUTES.HOME}
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
  const mainAppRoutes = [ROUTES.HOME, '/recipes', ROUTES.PLANNER, ROUTES.DISCOVERY, ROUTES.PROFILE];
  const hideHeader = mainAppRoutes.includes(pathname as any);

  const isDiscovery = pathname === ROUTES.DISCOVERY;

  return (
    <Layout
      {...headerProps}
      hideNavigation={isCapture}
      hideHeader={hideHeader}
      isFluid={isDiscovery || isCapture}
      className={
        pathname === ROUTES.HOME ? 'solar-earth-bg' : isDiscovery ? 'vibrant-discovery-bg' : ''
      }
    >
      {children}
    </Layout>
  );
}
