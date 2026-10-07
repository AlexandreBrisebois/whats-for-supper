# PWA Install Identity — Design

**Status:** Proposed; no implementation performed.
**Source:** [requirements.md](requirements.md). Behavior-first, accelerated cadence.
**Dependencies:** [Managed Demo Mode](../plat-06-managed-demo-mode/design.md).

## Ownership and integration map

Release tag → Docker build channel → immutable PWA image channel
DEMO_MODE deployment configuration → server identity resolver
Resolver → public manifest + initial HTML metadata + small UI hint
Identity → variant icon assets in public/icons/

Verified affected owners:

| Owner | Responsibility |
|---|---|
| pwa/public/manifest.json | Current static manifest |
| pwa/src/app/layout.tsx | Manifest link, Apple title/icon, browser metadata |
| pwa/src/components/common/Header.tsx | Main app hint placement |
| pwa/src/app/(auth)/welcome/page.tsx | Welcome hint placement |
| pwa/Dockerfile | Persist release channel in the final image |
| .github/workflows/publish-dockerhub.yml | Derive stable/beta from validated release version |
| docker/compose/apps.yml | Pass existing DEMO_MODE to PWA |
| release-template/synology/compose.yaml | Same runtime configuration for published images |
| infrastructure/aws/src/Aws/FrontendConstruct.cs | Amplify environment/build propagation |
| api/src/RecipeApi/Services/DemoModeOptions.cs | Existing parsing semantics; preserve implementation |
| pwa/public/sw.js | Inspect metadata caching compatibility; no general cache rewrite |

## D1 — One server-owned identity resolver (ID-R1–R5)

Install identity is always active and is not gated by a feature flag. DEMO_MODE selects demo identity and the immutable image release channel selects stable/beta identity; neither is an additional feature-enable switch. Do not add a preview, opt-in, or rollout flag around the resolver, metadata, icon selection, or UI hint. Preserve independently gated existing behavior, including PDF share-target configuration.

Proposed new pwa/src/lib/server/app-identity.ts resolves two inputs: runtime DEMO_MODE and immutable image release channel. Use a server-only module. Return only public fields: demo boolean, channel, install name, icon paths, hint, and accessible channel description. Do not send environment objects or secrets to clients.

Match DemoModeOptions boolean semantics and safe warning behavior. All versions use "What's for Supper?" as the manifest name/short_name, Apple title, and browser title; icons and hints distinguish the variants. Pass resolved public identity to client UI from server layout/props; do not read process.env dynamically in browser code and do not poll /api/health for branding.

Use a build argument WFS_RELEASE_CHANNEL=stable|beta, validated before build and persisted in the final image via generated server-readable metadata. The workflow determines it from the already validated version suffix. A label alone is insufficient because the Next.js server cannot reliably read Docker labels. Default local builds to stable; reject unsupported explicit channel values. Runtime configuration must not silently replace baked beta channel metadata.

## D2 — Runtime metadata (ID-R1, ID-R2, ID-R6, ID-R7)

Replace the public static manifest with a public request-time Route Handler at pwa/src/app/manifest.json/route.ts, preserving the /manifest.json URL. Remove the old static file only as part of that slice; avoid duplicate route/public-file ownership.

Use request-time generateMetadata in pwa/src/app/layout.tsx with the same resolver. Explicitly prevent static build evaluation and cross-runtime caching using the installed Next.js documentation; read pwa/AGENTS.md before implementation. Preserve all unrelated layout metadata and viewport settings.

Serve the manifest with application/manifest+json and revalidation/no-store behavior suitable for runtime changes. Verify infrastructure cache behavior for both initial HTML and manifest. Do not infer request-time evaluation merely from an env read. Keep id "/", start_url "/", standalone behavior, share target, shortcut destinations, and existing production asset references.

Manifest metadata and server HTML must work without an API response, authentication, or delayed client fetch. Preserve auth behavior while checking the manifest route is publicly reachable.

## D3 — Assets and unobtrusive hint (ID-R3–R6, ID-R8)

Keep production assets byte-for-byte unchanged. Create demo, beta, and beta-demo icon families under versioned public/icons/ paths. Supply 32px favicon, 180px Apple, 192/512px normal and maskable PNGs, and the favicon formats actually referenced by the app. Inspect current artwork before deriving assets.

Demo: retain production colors and artwork; add one small DEMO corner ribbon. Beta: retain the original textured cream background, artwork and shadow; add prominent BETA marking. This follows the user’s October 4, 2026 correction to the earlier violet-background proposal. Beta-demo: preserve the beta cue while adding the demo corner. Keep badge positions within reviewed maskable safe areas; normal and maskable geometry may differ.

Proposed common IdentityHint component receives resolved identity and renders a compact muted corner label using existing Solar Earth tokens. Place it in the shared header and welcome container without replacing the logo, shifting controls, or covering safe areas. No interaction, new tooltip, or modal is needed. Use localized accessible text and stable test IDs; show nothing in stable non-demo mode. If a selected main route does not use Header, inspect its existing layout and use that same shared hint without broad layout refactoring.

## D4 — Deployment and release wiring (ID-R2, ID-R4, ID-R5)

Pass DEMO_MODE from the same deployment source to API and PWA. Update shared Compose and Synology template; verify merged Compose configurations before claiming coverage.

For AWS, inspect BackendConstruct's existing demo configuration and propagate the same source to FrontendConstruct. Confirm Amplify makes server runtime DEMO_MODE available in deployed Next.js SSR output; an Amplify build variable alone does not prove SSR runtime availability. Use supported server environment packaging if required, containing only this non-secret configuration. AWS may require redeployment to apply config; the same-image/no-rebuild requirement applies to Docker deployment.

Docker Hub publication passes a derived channel only to the PWA build and persists it in the final image. Both amd64 and arm64 outputs must agree. Update release/deployment documentation to describe existing DEMO_MODE behavior and install refresh limitations, without creating a separate demo identity setting.

## Alternatives and tradeoffs

A build-only demo flag would require a separate image/rebuild and violate ID-R2. Deriving branding from client health adds a network dependency and cannot produce correct initial Apple metadata; the local health route also hardcodes false. A hostname heuristic introduces hidden deployment naming constraints. Server runtime DEMO_MODE with immutable release-channel metadata meets the existing configuration contract directly.

## Failure, compatibility, and security

Invalid demo values resolve to non-demo identity with a warning, matching API behavior. Backend unavailability does not alter identity. Missing local channel metadata defaults to stable; published beta verification must catch missing channel metadata before release. Do not log credentials or household details.

No OpenAPI/schema change is planned. Preserve the local health route's ownership; fixing its unrelated diagnostic semantics is outside this spec. Branding grants no privileges and does not change authentication. Keep production manifest identity stable; separate origins isolate service workers/storage. Cache headers cannot force an OS to refresh an existing icon.

## Verification

Unit tests cover the full decision table, parsing parity, immutable channel resolution, and manifest/metadata field agreement. Component tests prove hint visibility, localization, accessible text, and unchanged brand wording.

Playwright checks initial HTML and public manifest/icons for both channels with runtime demo on/off, welcome/main hint behavior, and retained shortcut/share behavior. Mock network data follows repository builders/MOCK_IDS; no paid AI calls.

Build and restart the same stable and beta images with demo on/off; inspect response metadata and image channel on supported architectures. Verify merged deployment env propagation and supported AWS SSR availability. Real iOS/Android installs separately verify names, coexistence, small-size legibility, crop safety, and refresh limitations. Automated browser tests do not establish real OS install behavior.
