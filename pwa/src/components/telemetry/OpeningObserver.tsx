'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { reportBrowserError, reportBrowserObservation } from '@/lib/telemetry/actions';
import { registerNativeErrors } from '@/lib/telemetry/errors';
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
    const releaseErrors = registerNativeErrors(window, reportBrowserError);
    observe();
    document.addEventListener('visibilitychange', observe);
    document.addEventListener(presentationChanged, observe);
    return () => {
      releaseErrors();
      document.removeEventListener('visibilitychange', observe);
      document.removeEventListener(presentationChanged, observe);
    };
  }, [enabled, pathname, readyPathname]);
  return null;
}
