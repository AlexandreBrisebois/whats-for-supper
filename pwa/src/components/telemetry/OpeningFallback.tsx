'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { registerOpeningFallback } from '@/lib/telemetry/opening';

// Only shared framework fallbacks declare an override. Ordinary pages and
// navigation handlers need no observation calls or registration.
export function OpeningFallback({ screen }: { screen: 'error' | 'not.found' }) {
  const pathname = usePathname();
  // Establish fallback identity during commit, before the shared observer's
  // passive effect can claim the ordinary route. Cleanup invalidates departures.
  useLayoutEffect(() => registerOpeningFallback(document, pathname, screen), [pathname, screen]);
  return null;
}
