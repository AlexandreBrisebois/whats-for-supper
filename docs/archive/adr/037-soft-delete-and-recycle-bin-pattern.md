# ADR 037 — Soft Delete, Recycle Bin, And Hard Purge Pattern

**Date**: 2026-05-08  
**Status**: Accepted  
**Deciders**: Alex Brisebois

---

## Context

Before this branch, `DELETE /api/recipes/{id}` performed a hard delete and returned HTTP 204. Recipes were permanently removed the moment a user tapped Delete.

Two problems made this untenable:

1. **No recovery path.** An accidental delete had no undo. Given that recipes accumulate household memory (notes, ratings, discovery history), permanent instant deletion was disproportionately destructive.
2. **Planner integrity.** A recipe could be deleted while it was still assigned to a planner slot, silently breaking the week view.

The team evaluated moving delete entirely to a PIN-gated hard delete, but this created too much friction for the common case (mistakes, experiments). The household model needs fear-free deletion with a calm recovery path.

## Decision

Replace hard delete with a two-stage lifecycle:

**Stage 1 — Soft delete** (any household member, no PIN):
- `DELETE /api/recipes/{id}` sets `deleted_at` and `deleted_by` on the row.
- Returns HTTP 200 with the updated recipe body (client confirms the new `deletedAt` without a follow-up fetch).
- Returns HTTP 409 if the recipe is currently assigned to an active or future planner slot, with an `assignedDays` array so the user knows exactly where it is scheduled.
- Recipe disappears from all active surfaces immediately via a global `WHERE deleted_at IS NULL` query filter enforced at the `RecipeDbContext` level.

**Stage 2 — Hard purge** (requires elevated PIN):
- `DELETE /api/recipes/{id}/purge` requires `deleted_at IS NOT NULL` (HTTP 409 if not in trash).
- Requires a valid `X-Elevated-Pin` header matching the `ELEVATED_ACTIONS_PIN` environment variable.
- `RecipePurgeService` validates the PIN, recipe existence, and trash state before destructive work.
- The service explicitly cancels pending index jobs and removes known dependent rows (`recipe_search_documents`, `recipe_votes`, `calendar_events`) before removing the recipe row, rather than relying only on database cascades.
- Filesystem cleanup happens before the database save. If filesystem cleanup fails, the operation aborts and the DB row is preserved — no silent half-deletes.
- Returns HTTP 503 (`PIN_NOT_CONFIGURED`) if `ELEVATED_ACTIONS_PIN` is not set, making the feature explicitly unavailable rather than silently broken.

The Recycle Bin (`GET /api/recipes/trash`, `POST /api/recipes/{id}/restore`) lives on the recipe library/search surface, not in Settings. Recovery belongs next to the thing being recovered.

## Status

Implemented. DB migration adds `deleted_at timestamptz null`, `deleted_by uuid null`, `delete_note text null` to the `recipes` table.

## Consequences

- `DELETE /api/recipes/{id}` response changed from HTTP 204 (empty) to HTTP 200 with a recipe body. All callers (PWA, E2E mocks in `setupCommonRoutes`) were updated. This was the highest-risk mock migration in the feature — the existing `204` mock would have caused E2E tests to pass with stale assumptions.
- All active recipe queries must include `WHERE deleted_at IS NULL`. The global query filter on `RecipeDbContext` enforces this automatically; `IgnoreQueryFilters()` is used only in purge and trash list paths.
- Operators must set `ELEVATED_ACTIONS_PIN` in their environment to enable permanent deletion. The default (unset) is safe — purge is unavailable, not misconfigured.
- `RecipePurgeService` is a dedicated service, not a controller-level delete. This boundary must be preserved — the validation, dependent-row cleanup, pending-index-job cancellation, and filesystem-first safety requirement cannot be expressed correctly in a controller.
- The planner conflict check is load-bearing. Without it, a user can delete a recipe and silently corrupt their week view.
