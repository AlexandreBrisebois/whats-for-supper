'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { reportBrowserAppOpened } from '@/lib/telemetry/actions';
import { observeOpening } from '@/lib/telemetry/opening';

export function OpeningObserver({
  enabled,
  readyPathname,
}: {
  enabled: boolean;
  readyPathname: string | null;
}) {
  const pathname = usePathname();
  useEffect(() => {
    const observe = () =>
      observeOpening(
        document,
        enabled,
        readyPathname === pathname ? pathname : null,
        reportBrowserAppOpened
      );
    observe();
    document.addEventListener('visibilitychange', observe);
    return () => document.removeEventListener('visibilitychange', observe);
  }, [enabled, pathname, readyPathname]);
  return null;
}
