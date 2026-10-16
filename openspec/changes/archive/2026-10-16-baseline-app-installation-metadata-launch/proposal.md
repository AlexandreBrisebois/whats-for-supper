# Proposal

## Why

The repository exposes install metadata and household launch routes without an app-installation baseline. Record only source-supported ordinary stable, non-demo behavior under AI-D01 and A34.

## What Changes

- Document manifest identity, icons, shortcuts, presentation metadata and launch entry.
- Reference accepted household page-gate and hydrated landing requirements rather than redefining identity.
- Exclude device install success, offline availability, demo/beta variants and runtime qualification.

## Capabilities

### New Capabilities

- `app-installation`: install-facing metadata and household entry behavior.

### Modified Capabilities

None.

## Impact

Documentation only: this change, the app-installation capability plan and main spec. Evidence: `pwa/src/app/manifest.json/route.ts`, `pwa/src/lib/baseManifest.json`, `pwa/src/lib/server/app-identity.ts`, `pwa/src/app/layout.tsx`, `pwa/src/proxy.ts`, `pwa/e2e/install-identity.spec.ts`. No application, contract or deployment edits. No consequential question blocks the supported subset.
