# Proposal

## Why

The What's for Supper baseline specification currently documents household-identity (member selection, access gates, invite links, creation, rename, removal, and profile switching) and recipe-library (listing, reading, field editing, ratings/notes, discoverability, view original, and soft-delete/recycle-bin/restore/purge), but does not yet cover recipe sharing. Extract its supported ordinary-household sharing behaviors: privacy-scrubbed export bundle generation (stripping household notes and ratings), native navigator.share or file download fallback, capture screen bundle file intake, schema and version validation, preview card presentation, duplicate detection advisory warning, cancellation, and acceptance into the recipe library as a newly created ready recipe.

## What Changes

- Add loaded-detail Share action availability, eligibility conditions (ready recipe with real non-placeholder hero image and not currently editing), loading toast, and error display on export failure.
- Add privacy-scrubbed export bundle generation (`GET /api/recipes/{id}/share`), stripping household notes and ratings to null, omitting member attribution and internal entity identifiers from the recipe payload, structuring or wrapping instructions into HowToSections and steps, preserving original images (up to 5), and enforcing that a recipe must have a hero image before it can be exported.
- Add export delivery mechanics via native sharing (`navigator.share`) when supported and permitted, silent cancellation handling on user abort (`AbortError`), and automatic fallback to browser file download (`.txt` plain text file containing formatted JSON payload) upon non-abort errors or absent native share support.
- Add capture screen bundle file intake via secondary action "Import recipe file" (`/capture`), accepting text/plain bundle files.
- Add client-side bundle file reading, JSON parsing, and schema validation, rejecting unreadable files or malformed structures with clear user error feedback.
- Add bundle preview card presentation rendering recipe hero photo, name, source URL, source name, synthesis badge, original image count, structured instructions, and optional notes/ratings if present in the bundle.
- Add advisory duplicate detection during bundle preview, checking existing library recipes by source recipe ID and name, displaying a warning banner with an option to view the existing recipe without blocking import acceptance.
- Add preview cancellation (`reject-bundle-btn`), discarding parsed bundle state and returning cleanly to the default capture view without modifying library state.
- Add bundle import acceptance (`POST /api/recipes/import-bundle`), enforcing server validation (`1.0` version, `wfs-share` source, non-empty name/ingredients/instructions, max 5 original images, valid base64 payloads), generating a new UUID on recipe ID collision, synchronously persisting the recipe entity as ready with member attribution, saving hero and original images, and returning 201 Created.
- Add bundle import success screen presentation with confirmation message and "Done" navigation back to Home (`/`).
- Record source and assertion mappings in BSL-recipe-sharing-001–003 of the durable baseline plan, keeping U53–U57 limitations non-normative.
- Preserve existing Purpose and all requirements/scenarios in main household-identity (36/92) and recipe-library (55/122), approved shared ownership, historical member-creation limitations, and all prior artifacts. No application behavior changes.

## Capabilities

### New Capabilities

- `recipe-sharing`: exchange portable recipes across household boundaries via privacy-scrubbed export bundles (native share or file download fallback) and bundle import intake, schema validation, preview presentation, duplicate detection advisory warning, cancellation, and acceptance into the recipe library as a ready recipe.

### Modified Capabilities

None.

## Impact

Documentation only: this proposal, recipe-sharing specification, extraction design/tasks, and `docs/openspec-baseline-plan.md`. The traced paths connect:
- Detail sheet share button → `RecipeDetailSheet.handleShareRecipe` → client `getRecipeShareBundle` → `GET /api/recipes/{id}/share` → `RecipeController.Share` → `RecipeService.ExportRecipeShareBundle` → `LocalRecipeStore` / `IImageService`
- Client packaging and delivery → `downloadRecipeBundleFile` → `createRecipeBundleFile` → `navigator.share` or `URL.createObjectURL` / temporary anchor click
- Capture intake → `MinimalCapture.handleRecipeBundleFileChange` → client `parseRecipeBundleFile` → client duplicate check `apiClient.api.recipes.get` → preview card
- Import acceptance → `MinimalCapture.handleAcceptBundle` → client `importRecipeShareBundle` → `POST /api/recipes/import-bundle` → `RecipeController.ImportBundle` → `RecipeService.ImportRecipeShareBundle` → EF `RecipeDbContext` / `LocalRecipeStore` / `ImageService.CreateRecipeInfo` → success screen

Tests use substitutions and mocks (`RecipeShareIntegrationTests.cs`, `sharing-fidelity.spec.ts`, `recipe-share.spec.ts`, `MinimalCapture.recipe-import.test.tsx`, `RecipeDetailSheet.test.tsx`, `recipes.test.ts`); runtime/database qualification remains deferred under A34 and source-supported extraction allowed under A10.

No consequential intent choice blocks these source-supported assertions. U53–U57 withhold file extension vs MIME type discrepancies, server-vs-client version tolerance, native share cancellation boundaries, advisory duplicate warning vs backend duplicate tolerance, and synchronous ready creation without live SSE broadcasts. Recipe web capture/import, hero generation/regeneration, full meal planning, grocery shopping, cooking, search/discovery ranking, votes/consensus, and demo/preview variants remain excluded. Stop at validated draft for review; acceptance, main promotion, archival, and successor extraction require separate authorization.
