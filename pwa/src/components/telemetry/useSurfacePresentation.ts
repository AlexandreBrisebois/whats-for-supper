'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { registerSurfacePresentation, type SurfaceIdentity } from '@/lib/telemetry/surfaces';
import { registerLoadedPresentation, type LoadedPresentationName } from '@/lib/telemetry/opening';

export function useSurfacePresentation(identity: SurfaceIdentity | undefined, presented: boolean) {
  const pathname = usePathname();
  const [instance] = useState(() => ({}));
  useEffect(() => {
    if (!identity || !pathname) return;
    return registerSurfacePresentation(document, pathname, identity, presented, instance);
  }, [pathname, identity, presented, instance]);
}

// Entry is an opaque, component-local lifetime token. Recipe/image identity never
// enters the document stream. The root owns readiness, visibility and shared caps.
export function useLoadedPresentation(
  name: LoadedPresentationName,
  entry: object,
  presented: boolean
) {
  const pathname = usePathname();
  const [instance] = useState(() => ({}));
  useEffect(() => {
    if (!pathname) return;
    return registerLoadedPresentation(document, pathname, name, entry, presented, instance);
  }, [pathname, name, entry, presented, instance]);
}
