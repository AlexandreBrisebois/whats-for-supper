# Proposal

## Why

The recipe-library baseline covers listing, reading, field editing, ratings/notes and discoverability, but omits the "View Original" behavior accessible from loaded library detail. Extract its supported availability, external URL opening, original photo viewing, image ordering, navigation, zoom and asset serving semantics so review can distinguish observable behavior from unsupported external-site or device guarantees.

## What Changes

- Add loaded-detail View Original availability, external URL opening, photo viewer presentation with finished-dish-first ordering, wrapping navigation, zooming/panning, viewer dismissal, and raw photo asset binary serving requirements.
- Record source and actual assertion mappings in BSL-recipe-library-020–022 of the durable baseline plan, keeping U44–U47 limitations non-normative.
- Preserve existing Purpose and all 37 requirements/76 scenarios in main recipe-library, approved shared ownership, historical limitations and all prior artifacts. No application behavior changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: add missing View Original behavior accessible from successfully loaded ordinary-household library recipe detail; reuse existing detail-loading, displayed-hero-reference, fact/read/update and household-identity owners.

## Impact

Documentation only: this proposal, recipe-library ADDED delta, extraction design/tasks and `docs/openspec-baseline-plan.md`. The traced path connects the library detail caller → RecipeDetailSheet action → external window opening or OriginalPhotosViewer → `/api/recipes/{id}/original/{index}` endpoint → ImageService/LocalRecipeStore. Tests use substitutions; runtime/database qualification remains deferred under A34 and source-supported extraction allowed under A10.

No consequential intent choice blocks these source-supported assertions. U44–U47 withhold stronger external page loading, gesture qualification, custom image failure handling and URL fallback claims. Uploading/replacing originals, selecting a new finished-dish image, hero generation/regeneration, recipe capture/import, sharing/export/download, detail editing, ratings/notes, discoverability toggling, reporting/re-import, cooking, planning, search/discovery ranking, votes/consensus, deletion/restore/purge, preference policy and demo/preview/deployment variants remain excluded. Stop at validated draft for review; acceptance, main promotion, archival and successor extraction require separate authorization.
