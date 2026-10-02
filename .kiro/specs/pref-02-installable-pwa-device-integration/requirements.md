# Installable PWA and Device Integration — Requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **PREF-02-R1.** `manifest.json` defines standalone/portrait identity, icons, shortcuts, and a Capture GET share target; app layout supplies manifest/iOS metadata and registers `sw.js`.
- **PREF-02-R2.** Shared `url`, `text`, and `title` query values enter `MinimalCapture` for user review.
- **PREF-02-R3.** The worker caches successful non-API GETs on demand and bypasses `/api/` (including SSE), so cached navigation cannot represent authoritative household mutations.

## Limits and boundaries

Install prompt/shortcut/share support is browser-dependent. There is no offline mutation queue, push, or background sync guarantee. Capture submission and API freshness belong to capture and PLAT-01, not this packet.
