'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { registerSurfacePresentation, type SurfaceIdentity } from '@/lib/telemetry/surfaces';

export function useSurfacePresentation(identity: SurfaceIdentity, presented: boolean) {
  const pathname = usePathname();
  useEffect(
    () => registerSurfacePresentation(document, pathname, identity, presented),
    [pathname, identity, presented]
  );
}
