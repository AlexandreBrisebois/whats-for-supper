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
  className = '',
}: LayoutProps) {
  return (
    <div className={`relative flex min-h-dvh flex-col bg-cream overflow-x-hidden ${className}`}>
      {/* Organic Background Elements */}
      <div className="blob blob-terracotta -top-20 -left-20 animate-[pulse_8s_infinite]" />
      <div className="blob blob-ochre top-1/4 -right-10 animate-[pulse_10s_infinite]" />
      <div className="blob blob-sage -bottom-20 left-1/4 animate-[pulse_12s_infinite]" />

      {/* Header */}
      {!hideHeader && <Header title={title} leftAction={leftAction} rightAction={rightAction} />}

      <main
        className={`relative flex flex-col flex-1 ${hideHeader ? 'safe-top' : ''} ${isFluid ? '' : 'px-4 py-8 md:px-6'} ${hideNavigation ? 'safe-bottom' : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'} ${mainClassName}`}
      >
        <div className={isFluid ? 'flex-1 flex flex-col' : 'mx-auto max-w-7xl'}>{children}</div>
      </main>

      {/* Mobile & Tablet Navigation */}
      {!hideNavigation && <Navigation className={hideHeader ? '' : 'md:hidden'} />}
    </div>
  );
}
