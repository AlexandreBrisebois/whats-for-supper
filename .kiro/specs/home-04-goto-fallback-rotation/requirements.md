# HOME-04 — GOTO fallback rotation: requirements

## Status

**Implemented capability baseline.** Canonical owner of household GOTO list, active-ready selection, and capture readiness handoff.

## Current behavior

- **HOME-04-AC-01 — List management.** Profile settings and recipe detail load `GET /api/goto`, edit `{ items: GoToItem[] }`, then replace it via `PUT /api/goto`. Settings also links to library, text capture, and photo capture.
- **HOME-04-AC-02 — Active selection.** `GET /api/goto/active` reads `family_goto`, filters undeleted `IsReady` recipes, randomly selects one ready ID, and returns 404 if none exists. Home consumes this result; it has no rotation policy.
- **HOME-04-AC-03 — Capture readiness.** GOTO settings links to capture with `intent=goto`. Text description creates a pending recipe and triggers `goto-synthesis`; `recipe_ready` adds its ID to `gotoStore`, causing settings/Home re-queries where applicable.

## Limitations and boundaries

- “Rotation” is random selection per request: no persisted cursor, cooldown, weighting, or non-repeat guarantee exists.
- A whole JSON list lives in one `FamilySettings` row; concurrent PUTs can overwrite one another. Invalid stored JSON is logged then read as empty. `gotoUtils` still accepts legacy single-object/array formats.
- Active GOTO never returns a pending item; client pending presentation is not a full lifecycle API.
- HOME-02 owns the Home offer. Capture/import own recipe production. Contract owner: `GET`/`PUT /api/goto`, active GOTO, recipe describe/status, and `recipe_ready` stream payload.
