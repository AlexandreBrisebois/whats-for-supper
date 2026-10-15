# Proposal

## Why

The recipe-library baseline covers listing, reading, field editing, ratings/notes, discoverability, and original asset viewing, but omits ordinary-household recipe deletion (Move to Bin / soft-delete), Recycle Bin listing, recipe restore, and PIN-protected permanent purge behavior. Extract its supported availability, confirmation/trigger rules, soft-deletion persistence and query filtering, Recycle Bin presentation, restore semantics, elevated PIN validation, filesystem asset purge, and cascading database cleanup so review can distinguish observable behavior from unsupported multi-client synchronization or storage guarantees.

## What Changes

- Add loaded-detail Move to Bin trigger availability, confirmation omission, and active-planner conflict handling (`RECIPE_ASSIGNED_TO_PLANNER` 409).
- Add soft-deletion persistence mechanics (`deleted_at` timestamp and `deleted_by` member attribution) and global query filtering excluding soft-deleted recipes from standard library lists, search results, and detail reads (returning 404).
- Add library view synchronization and detail sheet dismissal on deletion success, and error logging without sheet dismissal on deletion failure.
- Add Recycle Bin sheet opening from the library browse header (`recycle-bin-entry`), presentation, loading feedback, empty state, and soft-deleted recipe list rendering with deletion date and action buttons.
- Add soft-deleted recipe restore mechanics (`POST /api/recipes/{id}/restore`), clearing deletion flags, triggering search index re-indexing, removing the item from the bin list, and returning the recipe to active library queries.
- Add elevated PIN dialog presentation, input validation, and cancellation semantics for permanent purge.
- Add permanent recipe purge execution (`DELETE /api/recipes/{id}/purge` with `X-Elevated-Pin`), server PIN verification against `ELEVATED_ACTIONS_PIN`, workflow cancellation, filesystem directory asset removal, dependent records cleanup (search documents, votes, calendar events), and database entity deletion.
- Add purge failure handling for missing/invalid PIN (403), unconfigured server PIN (503), and non-trash recipes (409), displaying inline error feedback in the dialog.
- Record source and actual assertion mappings in BSL-recipe-library-024–026 of the durable baseline plan, keeping U48–U52 limitations non-normative.
- Preserve existing Purpose and all 44 requirements/94 scenarios in main recipe-library, approved shared ownership, historical limitations, and all prior artifacts. No application behavior changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: add missing ordinary-household recipe deletion (Move to Bin), Recycle Bin listing, recipe restore, and PIN-protected permanent purge behavior accessible from loaded detail and the library browse header; reuse existing detail-loading, list-visibility, editing, dismissal, and household-identity owners.

## Impact

Documentation only: this proposal, recipe-library ADDED delta, extraction design/tasks, and `docs/openspec-baseline-plan.md`. The traced path connects:
- Detail sheet gear menu → `handleMoveToBin` → client `deleteRecipe` → `DELETE /api/recipes/{id}` → `RecipeController.Delete` → `RecipeService.SoftDeleteRecipe` → EF `RecipeDbContext` / `RecipeSearchDocuments`
- Browse header button → `RecycleBinSheet` → client `getTrashItems` → `GET /api/recipes/trash` → `RecipeController.GetTrash` → `RecipeService.GetTrash`
- Bin restore button → `handleRestore` → client `restoreRecipe` → `POST /api/recipes/{id}/restore` → `RecipeController.Restore` → `RecipeService.RestoreRecipe` → `SearchFingerprintService` / `IWorkflowOrchestrator`
- Bin purge button → PIN dialog → client `purgeRecipe` → `DELETE /api/recipes/{id}/purge` with `X-Elevated-Pin` → `RecipeController.Purge` → `RecipePurgeService.PurgeAsync` → `RecipesRootResolver` / filesystem `Directory.Delete` / `RecipeDbContext` transaction

Tests use substitutions and mocks; runtime/database qualification remains deferred under A34 and source-supported extraction allowed under A10.

No consequential intent choice blocks these source-supported assertions. U48–U52 withhold stronger real-time multi-client synchronization (no SSE broadcast), planner historical event cleanup on soft-delete, distinct client error toast on soft-delete failure, granular client purge error distinction, and database foreign-key cascade guarantees. Recipe capture/import, hero generation/regeneration, recipe sharing/export, detail editing, ratings/notes submission, discoverability toggling, cooking, planning, search/discovery ranking, votes/consensus, and demo/preview variants remain excluded. Stop at validated draft for review; acceptance, main promotion, archival, and successor extraction require separate authorization.
