# LIB-04 — Recipe imagery and provenance: requirements

## Status

**Implemented capability baseline.** Canonical owner of original-photo viewing and hero image operations in recipe detail.

## Current behavior

- **LIB-04-AC1.** `OriginalPhotosViewer` orders the finished-dish index first, wraps next/previous navigation, supports keyboard arrows/Escape, pinch/click zoom, drag when zoomed, and raw-original URLs.
- **LIB-04-AC2.** Detail submits one selected file as multipart `POST /api/recipes/{id}/originals`, including the active family-member header, then reports upload/start-regeneration toast feedback.
- **LIB-04-AC3.** Hero regenerate posts `POST /api/recipes/{id}/hero/regenerate` and reports only that initiation succeeded; it does not wait for a completion event or refresh detail.
- **LIB-04-AC4.** Image `<img>` elements have no explicit load-error state. Viewer controls provide keyboard next/previous and close, but most controls lack explicit aria labels.

## Boundaries

Image storage/service and workflow processing are server-owned. LIB-06 owns portable image bundles; capture owns source acquisition. The raw original endpoint is anonymous in the controller, a material provenance/privacy boundary requiring separate review before change.
