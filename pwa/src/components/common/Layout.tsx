import type { ReactNode } from 'react';

import { Header } from './Header';
import { Navigation } from './Navigation';

interface LayoutProps {
  children: ReactNode;
  /** Page title shown in the Header */
  title?: string;
  /** Optional action element rendered on the left of the Header */
  leftAction?: ReactNode;
  /** Optional action element rendered on the right of the Header */
  rightAction?: ReactNode;
  /** Whether to hide the bottom navigation (e.g. for modal screens) */
  hideNavigation?: boolean;
  /** Whether to hide the top header */
  hideHeader?: boolean;
  /** Whether the main content should be full-width without default padding/max-width */
  isFluid?: boolean;
  /** Additional classes for the main element */
  mainClassName?: string;
  /** Additional classes for the root container */
  className?: string;
}

export function Layout({
  children,
  title,
  leftAction,
  rightAction,
  hideNavigation = false,
  hideHeader = false,
  isFluid = false,
  mainClassName = '',
  className = ''
}: LayoutProps) {
  return (
    <div className={`relative flex min-h-dvh flex-col bg-cream overflow-x-hidden ${className}`}>
      {/* Organic Background Elements */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(225,173,1,0.05),transparent_40%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(205,93,69,0.05),transparent_40%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(138,154,91,0.03),transparent_60%)] pointer-events-none" />

      {/* Header */}
      {!hideHeader && (
        <Header
          title={title}
          leftAction={leftAction}
          rightAction={rightAction}
        />
      )}

      <main className={`relative flex flex-col flex-1 ${hideHeader ? 'safe-top' : ''} ${isFluid ? '' : 'px-4 py-8 md:px-6'} ${hideNavigation ? 'safe-bottom' : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'} ${mainClassName}`}>
        <div className={isFluid ? 'flex-1 flex flex-col' : 'mx-auto max-w-7xl'}>
          {children}
        </div>
      </main>

      {/* Mobile & Tablet Navigation */}
      {!hideNavigation && <Navigation className={hideHeader ? '' : 'md:hidden'} />}
    </div>
  );
}
