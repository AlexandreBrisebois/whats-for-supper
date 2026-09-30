# Installable PWA and Device Integration — Requirements

**Kind:** Current-capability feature specification

**Derivation:** Behavior-first, accelerated cadence

**Source:** `PREF-02` in [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), verified against current non-archived source, contract, and tests

**Status:** Baseline proposal for future change control; this specification does not authorize implementation

## Outcome

WFS installs as a recognizable standalone household app and accepts recipe links or text from device sharing without compromising API freshness.

## Scope

### In scope

- web app manifest and install metadata
- icons, portrait standalone presentation, splash metadata
- Capture and Quick Find shortcuts
- GET share-target handoff to Capture
- service-worker registration and non-API caching boundary

### Non-goals

- guaranteed offline meal mutation support
- native push notifications
- background sync of writes

## Verified current baseline

- `pwa/public/manifest.json` defines standalone portrait display, icons, shortcuts, and the `/capture` share target.
- `pwa/src/app/layout.tsx` declares manifest/iOS metadata and registers `pwa/public/sw.js`.
- The service worker caches successful non-API GET responses on demand and deliberately bypasses `/api/`, including SSE.
- `pwa/src/components/capture/MinimalCapture.tsx` consumes shared `url`, `text`, and `title` query parameters.

The baseline records current ownership; it is evidence to review, not a requirement
that every implementation detail remain unchanged.

## Requirements

### PREF-02-R1 — Install metadata

The manifest shall provide stable identity, name, theme/background colors, start URL, supported icons, and standalone portrait display metadata.

### PREF-02-R2 — Shortcuts

Installed-app shortcuts shall lead to valid Capture and recipe-finding entry points with usable labels and icons.

### PREF-02-R3 — Share target

Shared URL/text/title input shall open Capture and preserve enough source context to review before submission.

### PREF-02-R4 — Network boundary

The service worker shall never intercept API or SSE requests and shall not serve stale mutation results as current household state.

### PREF-02-R5 — Failure safety

Install, cache, or share-target unavailability shall leave the browser application and manual Capture paths usable.

### PREF-02-R6 — Compatibility

Manifest, icons, splash assets, and registration shall be validated for supported mobile browsers without promising unsupported native capabilities.

## Preserved behavior

- Existing household meal workflows remain usable when this capability is degraded,
  except where the capability is the explicit security or persistence prerequisite.
- Changes preserve household/member boundaries and do not broaden collection of
  recipe, identity, or secret data.
- OpenAPI remains authoritative for any affected API operation.

## Acceptance scenarios

1. The primary success path satisfies every `PREF-02-R*` requirement with the
   selected household/member context.
2. Missing, stale, invalid, or unavailable dependencies produce the specified safe
   fallback or explicit failure rather than false success.
3. A second device, late response, retry, or identity change cannot silently replace
   newer authoritative state.
4. The affected behavior is operable with its required non-pointer alternative and
   exposes meaningful state to assistive technology where a UI exists.
5. Contract, persistence, and workflow changes are proven at their actual seams,
   not inferred from a static or mocked check alone.

## Decisions retained by this baseline

- Current public behavior is the starting compatibility boundary, not immutable
  architecture.
- Household data remains self-hosted and the least-privilege/least-data behavior is
  preferred.
- Background work must report accepted, completed, and failed states distinctly.

## Open questions before a future change

1. Which requirement is being changed, and what current behavior must remain
   backward compatible during rollout?
2. Does the change alter OpenAPI, persistence, deployment configuration, event
   delivery, or another feature spec? If so, approve those handshakes first.
3. What production or real-device evidence is required beyond repository automation
   for the selected change?
