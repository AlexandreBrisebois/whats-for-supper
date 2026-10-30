'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { reportBrowserObservation } from '@/lib/telemetry/actions';
import { observeOpening, presentationChanged } from '@/lib/telemetry/opening';

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
        reportBrowserObservation
      );
    observe();
    document.addEventListener('visibilitychange', observe);
    document.addEventListener(presentationChanged, observe);
    return () => {
      document.removeEventListener('visibilitychange', observe);
      document.removeEventListener(presentationChanged, observe);
    };
  }, [enabled, pathname, readyPathname]);
  return null;
}
