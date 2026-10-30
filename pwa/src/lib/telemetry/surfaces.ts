// Closed, source-declared identities. No content, DOM labels or dismissal causes.
export type SurfaceIdentity = 'quick.find' | 'planner.grocery';
export function isSurfaceIdentity(value: unknown): value is SurfaceIdentity {
  return value === 'quick.find' || value === 'planner.grocery';
}
export const presentationChanged = 'wfs:telemetry-presentation';
const declarations = new WeakMap<
  Document,
  Map<SurfaceIdentity, { pathname: string; presented: boolean }>
>();

export function registerSurfacePresentation(
  owner: Document,
  pathname: string,
  identity: SurfaceIdentity,
  presented: boolean
): () => void {
  if (!isSurfaceIdentity(identity)) return () => {};
  let current = declarations.get(owner);
  if (!current) {
    current = new Map();
    declarations.set(owner, current);
  }
  const declaration = { pathname, presented };
  current.set(identity, declaration);
  owner.dispatchEvent(new Event(presentationChanged));
  return () => {
    // React replays setup/cleanup synchronously. Reconcile only after a replacement
    // declaration has had a chance to claim the same presentation. No unload flush.
    queueMicrotask(() => {
      if (current.get(identity) !== declaration) return;
      current.delete(identity);
      owner.dispatchEvent(new Event(presentationChanged));
    });
  };
}

export function presentedSurfaces(owner: Document, pathname: string): Set<SurfaceIdentity> {
  return new Set(
    [...(declarations.get(owner) ?? [])]
      .filter(([, declaration]) => declaration.presented && declaration.pathname === pathname)
      .map(([identity]) => identity)
  );
}
