# HOME-04 — GOTO fallback rotation: design

## Data and service ownership

`GoToService` serializes `GoToListDto` as camel-case JSON in `FamilySettings.Key == "family_goto"` and reads/writes the whole list. `GetActive` filters recipe IDs against undeleted `IsReady` records, randomly picks a ready ID, supplies a hero URL if absent, and returns null/404 for no candidate. `GoToController` wraps successful payloads as `{ data }`.

`familyStore` is the client cache/API wrapper: load stores the list under `familySettings.family_goto`; save PUTs then stores the submitted DTO; active lookup returns null for any error. `FamilyGOTOSettings` and `RecipeDetailSheet` create replacement lists from that cache.

## Workflow and stream boundary

`RecipeService.DescribeRecipe` creates a non-ready recipe and starts `goto-synthesis`. Recipe-ready processing publishes `recipe_ready`; `useScheduleStream` records its ID in `gotoStore`. Settings reloads when one of its pending IDs becomes ready, while Home reloads an already-pending active entry. The event does not change `family_goto`.

## Evidence

`FamilyGOTOSettings.tsx`, `RecipeDetailSheet.tsx`, `familyStore.ts`, `gotoStore.ts`, `gotoUtils.ts`, `useScheduleStream.ts`, `GoToController.cs`, `GoToService.cs`, `RecipeService.cs`, `Workflows/goto-synthesis.yaml`, `GotoSynthesisIntegrationTests.cs`, and `specs/openapi.yaml`.
