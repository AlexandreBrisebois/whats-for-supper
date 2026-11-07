# Tasks

Planning only; every implementation box remains unchecked. Separate approval is required to apply. Names of new tests below are proposed suites to create; no behavioral test has run in this spec session. Follow [shared corpus](acceptance-corpus.md) and [CI requirements](review.md). Resolve consequential holds before finalizing their dependent work; outlines below do not approve an assumption. Contract changes first update `specs/openapi.yaml`, run `task gen:client`, then synchronize generated SDK consumers and method-sensitive `pwa/e2e/mock-api.ts` handlers/builders/state transitions including conflicts, later reads and SSE. Every slice keeps its red/green evidence and usage documentation.

## 1. Read exact original facts through the existing stack

**Outcome/scenarios:** C01, C07–C14, C46–C47; recipe-ingredients/current collection, exact round-trip and stable identities.
**Owners/boundaries:** GET detail/projection, canonical persistence, existing SupperIngredientProjection, Kiota and stateful GET mocks. Prerequisite: approved shared quantity/schema/revision contract and owned isolated PostgreSQL.

- [ ] 1.1 Transcribe approved `contentRevision`, scalar/range rational strings, units/packages, stable rows/steps and original-basis read shapes to OpenAPI and generated client. Add `CanonicalIngredientConversionPostgresTests` and exact-quantity units; run `task test:database -- --filter FullyQualifiedName~CanonicalIngredientConversionPostgresTests` before logic for intended behavioral red, not tool failure. Include unknown basis, missing middle/duplicates, no phrase whitelist, explicit null/empty, exact notation and overflow; synchronize method-sensitive detail/projection mock handlers and run `task test:unit -- src/testing/mock-api.test.ts`.
- [ ] 1.2 Implement only this approved read/persistence slice with per-recipe legacy/canonical owner and conservative conversion. Run 1.1 green plus `task gen:client:check`; read the same exact facts through real generated client/API/PostgreSQL. Document deferred conflicts; no source loss, metadata replay or routine old-backup adapter.

## 2. Correct original facts and retain drafts

**Outcome/scenarios:** C01, C10, C14–C16, C36; guarded Save and original-basis editing.
**Owners/boundaries:** existing detail editor, PATCH detail, shared revisions, generated client and GET/PATCH mock. Depends on group 1 and final content/draft-upgrade contract.

- [ ] 2.1 Add intended-red `CanonicalIngredientEditPostgresTests`, existing RecipeDetailSheet units and proposed `canonical-ingredient-edit.spec.ts` for 200→250 original/500 dated, untouched sauce, fractions/ranges, zero/null/unit-only, invalid input, Cancel/failure, old full payload, concurrent basis/step writes and lost reply. Run database filter and `task test:e2e -- canonical-ingredient-edit.spec.ts` before logic; synchronize mock atomic conflicts and authoritative result shapes.
- [ ] 2.2 Implement guarded original-basis Save and authoritative result installation with all-field draft recovery. Run 2.1 green, focused `task test:unit -- src/components/recipes/RecipeDetailSheet.refinement.test.tsx src/testing/mock-api.test.ts` and generated-client check. Add proposed `LiveBrowser_CanonicalIngredientCorrection`, qualify via `WFS_CALENDAR_LIVE=1 task test:database -- --filter FullyQualifiedName~LiveBrowser_CanonicalIngredientCorrection` after reviewing live prerequisites. Actual UI/client/API/DB path must prove no partial update and no lost draft, not merely a mock pass.

## 3. Publish capture/reprocessing through protected current facts

**Outcome/scenarios:** C16, C22–C25, C43–C44; capture/share/current projector source owner.
**Owners/boundaries:** RecipeAgent, SyncRecipeProcessor, capture/synthesis/share import, RecipeService and durable grocery/search invalidation. Dependencies: groups 1–2; final step/bilingual contracts for their fields. Full portions release waits for step companion.

- [ ] 3.1 Add intended-red proposed `CanonicalIngredientPublicationPostgresTests` and workflow fixtures covering new web/photo/PDF/synthesis/share, report-triggered reimport, explicit human clears, stale source/content, file-before-DB race, retry/failure/cancel. Run `task test:database -- --filter FullyQualifiedName~CanonicalIngredientPublicationPostgresTests` before replacing writers. Implement guarded staged publication in the same slice and run green with actual DB/files/workflow; external provider doubles only. Retain report eligibility/dedup/quotas and private correction protection, and document all replaced writers.
- [ ] 3.2 Add current canonical inputs to existing SupperServings/PostgreSQL projection seams and Home/detail/Cook consumers, retaining quiet portions/prepared/cooked-baseline protections (C17–C21, C49). Run `task test:database -- --filter FullyQualifiedName~SupperServingsPostgresTests` and relevant preview cases plus `task test:e2e:ci -- recipe-ingredient-preview.spec.ts quiet-portions-layout.spec.ts supper-servings-context.spec.ts --workers=4 --retries=0` on owned resources after parity qualification. Confirm pending durable refresh is distinct from committed facts and step-scaling release remains outstanding.

## 4. Final integration and verification

- [ ] 4.1 Reconcile this unit's corpus outcomes and preservation boundaries, run `task gen:client:check` where APIs changed, review the complete task-owned diff, then `task prepare -- <reviewed paths>` when applicable and `task verify -- <reviewed paths>`. Record invocation-specific record_path and actual passed/failed/blocked/skipped/not-run outcomes. Qualify required real seams with zero required skips and the parity owner's production/hosted-candidate requirements; no completion from mocked-only reads or missing stages.
