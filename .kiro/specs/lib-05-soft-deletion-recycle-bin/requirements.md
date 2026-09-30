# LIB-05 — Soft deletion and recycle bin: requirements

## Status

**Implemented capability baseline.** Canonical owner of recipe soft deletion, trash listing, restoration, and elevated purge.

## Current behavior

- **LIB-05-AC1.** Detail's Move to Bin calls `DELETE /api/recipes/{id}` then closes on success. Failure logs only.
- **LIB-05-AC2.** `RecycleBinSheet` fetches `GET /api/recipes/trash` once on mount, shows loading/empty/list states, and removes a restored item after `POST /api/recipes/{id}/restore` succeeds.
- **LIB-05-AC3.** Purge opens a PIN dialog; `DELETE /api/recipes/{id}/purge` submits the PIN header/body as implemented by `recipes.ts`, removes the item on success, and shows one generic error for all failures.
- **LIB-05-AC4.** Restore is disabled per recipe while in flight; purge disables submit. Initial trash/restore errors are console-only and there is no retry/refresh control.

## Boundaries

`RecipeService` owns soft-delete/restore and `RecipePurgeService` owns elevated permanent deletion. Active library/search exclusion is query/service policy, not RecycleBinSheet logic. Detail action ownership is LIB-03.
