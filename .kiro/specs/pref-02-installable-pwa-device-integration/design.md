# Installable PWA and Device Integration — Design

**Status:** Baseline design for future change control; implementation is not authorized

**Requirements:** [requirements.md](requirements.md)

## Design intent

This document maps the verified current ownership needed to reason about future
changes to `PREF-02`. A selected change may replace an internal pattern, but it
must preserve or deliberately revise the observable requirements first.

## Integration map

```text
OS install/share surface → manifest/share target → Next.js route → Capture review; browser navigation → service worker → cache or network, while `/api/` bypasses interception
```

## Current ownership and interfaces

- `pwa/public/manifest.json`
- `pwa/public/sw.js`
- `pwa/src/app/layout.tsx`
- `pwa/src/components/capture/MinimalCapture.tsx`
- `pwa/src/app/(app)/capture/page.tsx`

`specs/openapi.yaml` is authoritative wherever an HTTP contract is involved. Source
paths above describe current ownership and must be re-verified when a task is
selected because this baseline can age.

## State and data flow

1. Validate household authentication and member context at the boundary that owns
   them; never infer one from the other.
2. Read authoritative persisted/configured state before presenting a confirmed
   outcome. Local or cached state may improve responsiveness but is not a second
   authority.
3. Apply state changes atomically at the narrowest domain boundary, then publish or
   invalidate dependent projections.
4. Treat asynchronous acceptance, completion, retry, and terminal failure as
   separate states. Late results must be correlated to the initiating identity and
   operation.
5. Reconcile clients/projections from authoritative state after interruption or a
   rejected optimistic change.

## Failure and recovery design

- Invalid input fails before side effects where possible and returns the contracted,
  localizable family-facing outcome or an operator-safe diagnostic.
- Transient infrastructure failure is bounded; retries must be idempotent or guarded
  against duplicate externally visible effects.
- Partial persistence is never described as success. Recovery either completes the
  same operation safely or reloads authoritative state.
- Client failures preserve navigation and unrelated supper workflows unless access
  or data integrity requires a hard stop.

## Security, privacy, and compatibility

- Do not log household secrets, raw credentials, unnecessary recipe content, or
  member-facing free text in infrastructure diagnostics.
- Validate identity and eligibility on the server even when the PWA hides or disables
  an action.
- Contract/schema changes follow approved OpenAPI → tests → implementation/client
  generation order and include compatibility for in-flight/older clients where
  required.
- Destructive or operator-only effects require an explicit protected entry point and
  auditable outcome.

## Accessibility, localization, and performance

- Any UI introduced or changed provides semantic controls, visible focus, stable
  loading/error announcements, localized copy, and non-gesture operation.
- Do not block a primary route on optional diagnostics or enhancement infrastructure.
- Bound background work, payload sizes, caches, polling, and retries. Measure the
  selected path before setting a new latency or capacity target.

## Known risks to resolve in a selected change

- **Stale shell assets after version changes**
- **Share payloads containing malformed or unsafe URLs**
- **Platform differences in GET share-target and shortcut support**

## Verification strategy

- manifest JSON/schema inspection
- service-worker boundary unit or browser checks
- capture share-target E2E
- installability audit on selected browsers
- `git diff --check` and local Markdown-link validation for spec-only edits.
- Applicable repository completion checks selected by the changed implementation
  class; live database/deployment/device evidence is recorded separately.

## Change-design rule

Before editing implementation, update [requirements.md](requirements.md) with the
approved behavioral delta, then revise this design and [tasks.md](tasks.md) so
requirement → design → task → check traceability remains exact.
