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

## Historical extraction evidence relocated for OpenSpec 1.14.2

The following non-normative material was moved from this change’s delta preamble to satisfy the upgraded validator. Requirement/scenario blocks and main specifications are unchanged by this relocation. Earlier draft/lifecycle statements remain historical; later recorded authorizations still govern. Relative links retain their original targets.

## Non-normative evidence and scope

This session instruction authorizes this bounded draft only. BSL-recipe-library-024–026 in `docs/openspec-baseline-plan.md` map every requirement and scenario to inspected source and actual assertion coverage. These are implementation-supported claims under A10; runtime behavior is not-run and implementation/database qualification remains deferred under A34. Main recipe-library remains 44 requirements/94 scenarios and household-identity 36/92. The nine prior changes remain active; this draft adds a tenth.

Reuse library “Retrieve the selected library recipe for detail reading”, “Return persisted recipe detail for an available record”, “Open the household library and offer list presentation”, “Return only eligible household library recipes”, and “Dismiss recipe detail back to the loaded library”. These additions cover only missing ordinary-household recipe deletion (Move to Bin / soft-delete), Recycle Bin listing, recipe restore, and PIN-protected permanent purge behavior. Household-identity retains “Gate protected page entry with household access”, “Apply member context after household access” and “Authenticate protected API requests independently”.

U48–U52 retain source/assertion limits without repair:
- Move to Bin is activated directly from the detail gear menu without a confirmation dialog. If soft delete fails (e.g. 409 Conflict due to active planner schedule, or network error), the error is logged to `console.error` and no user-facing toast or inline error banner is displayed; the sheet simply remains open with the recipe unchanged.
- Soft-deleted recipes are excluded from standard library listings, detail GET (returning 404), and search queries via the EF Core query filter `DeletedAt == null`. Neither soft-delete, restore, nor purge broadcasts an SSE event. Multi-client synchronization relies on manual or route-driven query refreshes.
- There is no unit test file for `RecycleBinSheet.tsx` (`RecycleBinSheet.test.tsx` is missing); test coverage relies on mock verification in `browse-all-stack/page.test.tsx` and Playwright E2E tests (`search-hardening.spec.ts` and `browse-all-stack.spec.ts`).
- When `purgeRecipe` fails (whether 403 Forbidden, 503 Service Unavailable, 409 Conflict, or 404 NotFound), `RecycleBinSheet` displays a single generic error message (“Incorrect PIN or permanent delete is not available.”) without distinguishing between missing/invalid PIN, unconfigured server PIN, or non-trash recipe state.
- Soft-deletion checks only future or current-day calendar events (`Date >= today`) and rejects with 409 Conflict if found, but leaves historical calendar events untouched. In contrast, permanent purge cascades and deletes all calendar events (past and future), votes, search documents, and filesystem directory assets.

Reuse BSL-recipe-library-001–023 and preserve U29–U47 non-normatively. BSL-018–025, U23–U28 and historical member-creation limitations remain unchanged and non-normative here. Historical BSL-015/U22 limitation retained:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-library requirement, new lifecycle approval or runtime result.

Recipe capture/import, hero generation/regeneration, recipe sharing/export, detail editing, ratings/notes submission, discoverability toggling, cooking, planning, search/discovery ranking, votes/consensus, and demo/preview variants are excluded.
