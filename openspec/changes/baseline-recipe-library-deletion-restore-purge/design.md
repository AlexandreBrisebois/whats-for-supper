# Design

## Context

See proposal.md for motivation and the recipe-library delta for the observable contract. This design describes documentation extraction across existing browser, API, service, and filesystem layers; it proposes no application architecture or behavior changes. The session bounds the work to Move to Bin (soft-delete), Recycle Bin listing, restore, and PIN-protected permanent purge. A10 permits source-supported drafts and A34 defers runtime/database qualification. Source identity is moving-to-openspec at `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus preserved dirty inputs.

## Goals / Non-Goals

**Goals:** Document the connected deletion, bin, restore, and purge paths:
- Loaded detail gear menu `action-move-to-bin` → `handleMoveToBin` → client `deleteRecipe` → `DELETE /api/recipes/{id}` → `SoftDeleteRecipe` (calendar conflict check, `deleted_at`/`deleted_by` assignment, synchronous search doc removal) → 200 OK or 409 Conflict → detail sheet dismissal and list search refresh.
- Browse header `recycle-bin-entry` → `RecycleBinSheet` → `getTrashItems` → `GET /api/recipes/trash` → `GetTrash` (`IgnoreQueryFilters()`, `deleted_at != null`, desc order) → loading, empty, and populated trash list presentation.
- Trash item `action-restore-${id}` → `restoreRecipe` → `POST /api/recipes/{id}/restore` → `RestoreRecipe` (clearing `deleted_at`/`deleted_by`, `updated_at`, search index trigger) → 200 OK → removal from bin list, re-inclusion in active queries.
- Trash item `action-purge-${id}` → PIN dialog modal → `purgeRecipe` → `DELETE /api/recipes/{id}/purge` with `X-Elevated-Pin` → `PurgeAsync` (PIN check against `ELEVATED_ACTIONS_PIN`, trash check, index workflow cancellation, filesystem directory deletion, dependent records removal, db row deletion) → 200 OK, 403, 409, 503, or 404 → removal from bin list or inline error feedback.
Map every requirement and scenario to BSL-recipe-library-024–026 and actual assertion coverage.

**Non-Goals:** Application modifications, bug fixes (such as adding a soft-delete confirmation dialog or user error toast), new tests/contracts/SQL, runtime qualification, or expanding into capture, hero generation, sharing, or editing.

## Decisions

1. **Extend `recipe-library` with ADDED requirements.** Deletion, Recycle Bin, restore, and purge are lifecycle capabilities of the recipe library. Reusing the existing owner preserves cohesion without creating an isolated trash capability. No existing requirement or Purpose is rewritten.
2. **Direct deletion activation without confirmation prompt.** In `ActionGearMenu.tsx`, clicking `action-move-to-bin` triggers `onMoveToBin()` immediately. There is no confirmation dialog or prompt in `RecipeDetailSheet.tsx`.
3. **Asymmetric error handling on soft-delete failure.** If `deleteRecipe` throws (e.g. 409 Conflict from an active planner slot or network failure), `RecipeDetailSheet` catches the error, logs it to `console.error`, and retains the open sheet and visible recipe without displaying a user toast.
4. **Soft-delete representation and query filtering.** In PostgreSQL, `deleted_at timestamp with time zone` and `deleted_by uuid` represent soft-deletion (there is no `is_deleted` column). EF Core configures `entity.HasQueryFilter(e => e.DeletedAt == null)`, which automatically excludes soft-deleted recipes from `GET /api/recipes`, `GET /api/recipes/{id}` (returning 404), and `POST /api/recipes/search`.
5. **Active planner conflict detection.** `SoftDeleteRecipe` queries `CalendarEvents` where `RecipeId == id && Date >= today`. If active or future dates exist, it returns HTTP 409 Conflict with `RECIPE_ASSIGNED_TO_PLANNER` and `assignedDays`. Past calendar events (`Date < today`) are ignored during soft-delete.
6. **Recycle Bin access and presentation.** `RecycleBinSheet` is opened from the browse library header button (`recycle-bin-entry`). It renders a bottom sheet modal, loads deleted recipes via `GET /api/recipes/trash` (which uses `IgnoreQueryFilters()` and sorts by `deleted_at` descending), and provides Restore and Delete buttons.
7. **Restore side effects.** `RestoreRecipe` clears `deleted_at` and `deleted_by`, updates `updated_at`, and triggers the `index-recipe-search` workflow asynchronously. The indexing call is wrapped in a try/catch block so search trigger failure does not fail the restoration. No SSE event is emitted.
8. **Two-tier purge protection (trash qualification + elevated PIN).** `PurgeAsync` verifies `recipe.DeletedAt is not null` (returning 409 `NOT_IN_TRASH` otherwise) and validates `X-Elevated-Pin` against `ELEVATED_ACTIONS_PIN` (returning 403 `FORBIDDEN` on mismatch, or 503 `PIN_NOT_CONFIGURED` if unconfigured).
9. **Filesystem-first purge transaction.** `PurgeAsync` runs filesystem directory deletion (`Directory.Delete(dir, recursive: true)`) before database row deletion. If file deletion fails, the database transaction rolls back, preventing orphaned disk assets or half-purged entities.
10. **Cascading cleanup during purge.** Purge cancels pending index workflows (`status = Failed`), removes search documents, votes, and all calendar events (both past and future), then deletes the recipe entity.

## Risks / Trade-offs

- Lack of soft-delete confirmation dialog → U48 notes that accidental clicks trigger immediate deletion, mitigated only by Recycle Bin recovery.
- Silent failure on soft-delete rejection → U48 notes that 409 Conflict only logs to console, leaving the user with an unclosed sheet and no explanatory message.
- Absence of real-time SSE broadcasts → U49 notes that multi-device sessions do not receive live deletion/restore/purge events; lists synchronize on manual or route-driven query re-execution.
- Missing RecycleBinSheet unit tests → U50 notes that `RecycleBinSheet.tsx` lacks dedicated unit tests, relying on mocked container tests and E2E coverage.
- Generic purge error message in UI → U51 notes that 403, 503, 409, and 404 collapse into a single error text in the PIN dialog.
- Asymmetric calendar event handling → U52 notes that soft-delete preserves historical events and blocks on future events, while purge removes all events unconditionally.
