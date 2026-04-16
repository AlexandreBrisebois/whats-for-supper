'use client';

import { useMediaQuery } from './useMediaQuery';

/**
 * Detects the current device type and orientation.
 *
 * Breakpoints:
 *   mobile  < 768 px
 *   tablet  768 – 1023 px
 *   desktop ≥ 1024 px
 */
export function useDevice() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isPortrait = useMediaQuery('(orientation: portrait)');

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isPortrait,
    isLandscape: !isPortrait,
  };
}
