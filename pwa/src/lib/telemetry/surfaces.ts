// Closed, source-declared identities. No content, DOM labels or dismissal causes.
export const surfaceIdentities = [
  'quick.find',
  'planner.grocery',
  'recipe.detail',
  'recipe.plan',
  'recipe.actions',
  'recipe.filters',
  'recipe.issue',
  'recipe.bin',
  'recipe.purge',
  'original.photos',
  'cooking.reader',
  'planning.pivot',
  'planning.non_cooking',
  'planning.recovery',
  'discovery.nudge',
  'invite.share',
  'profile.members',
  'demo.introduction',
  'demo.dialog',
  'capture.image_review',
  'capture.bundle_review',
  'capture.upload',
  'capture.queued',
  'capture.ready',
] as const;
export type SurfaceIdentity = (typeof surfaceIdentities)[number];
export function isSurfaceIdentity(value: unknown): value is SurfaceIdentity {
  return typeof value === 'string' && (surfaceIdentities as readonly string[]).includes(value);
}
export const presentationChanged = 'wfs:telemetry-presentation';
const declarations = new WeakMap<
  Document,
  Map<
    object,
    { pathname: string; identity: SurfaceIdentity; presented: boolean; released: boolean }
  >
>();

export function registerSurfacePresentation(
  owner: Document,
  pathname: string,
  identity: SurfaceIdentity,
  presented: boolean,
  instance: object = {}
): () => void {
  if (!isSurfaceIdentity(identity)) return () => {};
  let current = declarations.get(owner);
  if (!current) {
    current = new Map();
    declarations.set(owner, current);
  }
  const declaration = { pathname, identity, presented, released: false };
  current.set(instance, declaration);
  owner.dispatchEvent(new Event(presentationChanged));
  return () => {
    declaration.released = true;
    // Reconcile after synchronous effect replay/replacement. A stale cleanup can
    // release only its own generation, never another instance of the same surface.
    queueMicrotask(() => {
      if (current.get(instance) !== declaration) return;
      current.delete(instance);
      owner.dispatchEvent(new Event(presentationChanged));
    });
  };
}

export function presentedSurfaces(
  owner: Document,
  pathname: string,
  observed: ReadonlySet<SurfaceIdentity> = new Set()
): Set<SurfaceIdentity> {
  return new Set(
    [...(declarations.get(owner)?.values() ?? [])]
      .filter(
        (declaration) =>
          declaration.presented &&
          declaration.pathname === pathname &&
          (!declaration.released || observed.has(declaration.identity))
      )
      .map(({ identity }) => identity)
  );
}
