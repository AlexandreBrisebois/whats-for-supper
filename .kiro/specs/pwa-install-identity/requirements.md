# PWA Install Identity — Requirements

**Kind:** Feature specification
**Derivation:** Behavior-first, accelerated cadence
**Source:** User request: distinguish production, demo, and beta installations; retain the demo name and branding; enable demo identity through the existing DEMO_MODE environment variable.
**Status:** Proposed specification; implementation is not authorized by this document.
**Baseline:** main at 44dcd91dd987b46f3612c6942db886e82fb75613.

## Outcome and scope

People can distinguish installed releases on their phone while the demo retains the production name, branding, and feel. Scope includes PWA install metadata, icon assets, a subtle in-app identity hint, configuration propagation, and beta image publication metadata.

**User decision:** This feature is not gated by a feature flag. Once implemented, install identity is always resolved from the existing runtime DEMO_MODE and the image's release channel. No preview, opt-in, or rollout flag controls its availability.

No native app bundle work, backend demo behavior changes, database changes, new demo switch, app-wide recoloring, or production rebranding. Existing managed demo behavior remains governed by [PLAT-06](../plat-06-managed-demo-mode/requirements.md).

## Verified baseline

- pwa/public/manifest.json uses id "/", name and short_name "What's for Supper?", and one icon set.
- pwa/src/app/layout.tsx independently sets the Apple app title and touch icon.
- pwa/src/components/common/Header.tsx provides the common authenticated header.
- DemoModeOptions parses DEMO_MODE; missing/invalid values disable demo, with a warning for invalid input.
- docker/compose/apps.yml and release-template/synology/compose.yaml pass DEMO_MODE to the API but not the PWA.
- The Docker Hub workflow accepts dockerhub/vX.Y.Z-beta.N but does not propagate a release channel to the PWA build.
- The PWA's local /api/health returns demoMode: false; it is not a suitable authority for install branding.

## Requirements and acceptance

### ID-R1 — Production compatibility

With demo disabled and a stable image, the installed name, artwork, manifest id, start URL, scope behavior, app colors, and typography remain unchanged. No environment hint appears. Existing production installations continue to identify the same app.

### ID-R2 — Existing demo switch

Only a valid true DEMO_MODE enables demo identity. Parsing matches the API's boolean semantics, including case and surrounding whitespace. Missing, blank, false, and invalid values disable demo identity; invalid input produces a safe configuration warning. No separate demo branding variable is introduced.

The same configured value reaches API and PWA in supported deployments. Restarting the same Docker image with a different DEMO_MODE changes freshly served identity without rebuilding that image. A frontend identity mismatch must be diagnosable in deployment verification.

### ID-R3 — Demo visual treatment

Demo name, short_name, Apple title, browser title, and visible brand wording stay exactly as production. The demo icon uses the current artwork and colors with only a small readable DEMO corner ribbon. The app retains its existing palette, typography, layout, and interactions.

An unobtrusive, non-interactive Demo corner hint appears on welcome and main app surfaces. It must not introduce a banner, popup, extra navigation step, layout shift, or obscure controls.

### ID-R4 — Beta identity

A beta image uses "What's for Supper?" as installed name, short_name, Apple title, and browser title, matching every other version. Its icon retains the original artwork and background, with a prominent BETA marking distinguishing the channel. Beta identity must survive deployment without a manually supplied runtime beta flag. Stable images must not inherit beta identity.

The application keeps the existing brand and palette; a quiet Beta hint confirms the channel.

### ID-R5 — Demo on a beta image

Demo mode and release channel are separate facts. If DEMO_MODE=true on a beta image, use the production/demo name and the beta icon with an additional small DEMO corner marking. Show Demo as the primary in-app hint and make Beta channel information available through its accessible description. Never hide the beta release channel or change backend demo semantics.

This overlap policy is a proposed routine design decision for review.

### ID-R6 — Complete install metadata

Every effective identity selects consistent manifest icons (including shortcuts and maskable assets), Apple touch icon, and browser favicon. No selected icon URL is missing. The manifest is public and available before authentication; Apple metadata is present in initial HTML.

Masks, rounded corners, and small phone labels preserve the distinguishing marks. Icons include textual cues so color alone is not the distinction.

### ID-R7 — Install coexistence and caching

Separate production, demo, and beta deployment origins allow installations to coexist while all versions share a name. Preserve production id "/" and use stable per-origin manifest identity; toggling demo on the same origin must not create a new app identity on every restart or version.

Distinct, versioned asset paths prevent the wrong variant being reused. Fresh metadata reflects runtime configuration without cross-deployment cache leakage. Previously installed home-screen icons may require OS refresh or removal/reinstallation; document that limitation rather than promising immediate replacement.

### ID-R8 — Preserved behavior and accessibility

The hint is localized using the existing English/French infrastructure, accessible to screen readers, and readable without animation or interaction. Existing routes, authentication, meal workflows, share target, shortcuts, splash branding, and demo restore/AI bypass remain intact. Identity is informational and grants no authorization.

## Success and failure scenarios

| Image | DEMO_MODE | Installed name | Icon | Hint |
|---|---|---|---|---|
| Stable | unset/false/invalid | What's for Supper? | Current | None |
| Stable | true | What's for Supper? | Current + DEMO corner | Demo |
| Beta | unset/false/invalid | What's for Supper? | Original + BETA | Beta |
| Beta | true | What's for Supper? | Original + BETA + DEMO corner | Demo; Beta accessible description |

Verify true/TRUE/whitespace true and false/blank/invalid parsing; verify fresh initial HTML and manifest agree; verify stable and beta images across runtime restart; verify install coexistence on separate origins and real-device icon cropping.

## Decisions and open questions

User decisions: preserve production icon; all versions use the same app name "What's for Supper?"; demo icon alteration small; in-app demo hint unobtrusive; demo branding and feel identical; existing DEMO_MODE controls demo identity; beta visually distinct through its icon and hint.

Proposed details: original icon background with prominent BETA marking, overlap behavior in ID-R5, separate origins, and a static non-interactive corner hint. Badge geometry is chosen through small-size icon review during implementation. No blocking question prevents this spec from being reviewed.
