# Tasks

Implementation sequence reconciliation (2026-11-07): the approved all-spec work
extracts the coherent saved-row identity/guarded-publication prerequisite described
in [grocery-prerequisite-review.md](grocery-prerequisite-review.md) before grocery
closure. This is a dependency extraction across the relevant tasks below, not a
new completed task, weakened acceptance or completed companion. Existing task boxes
remain open until every required gate passes; recovery/client activation gates
remain required. The planning-session description below is historical context,
not a request for duplicate implementation approval.

Planning only; every implementation box remains unchecked. Separate approval is required to apply. Names of new tests below are proposed suites to create; no behavioral test has run in this spec session. Follow [shared corpus](acceptance-corpus.md) and [CI requirements](review.md). Alex’s allocation, range, split/merge and fresh-list decisions are settled. Remaining engineering/dataset qualification does not authorize implementation. Contract changes first update `specs/openapi.yaml`, run `task gen:client`, then synchronize generated SDK consumers and method-sensitive `pwa/e2e/mock-api.ts` handlers/builders/state transitions including conflicts, later reads and SSE. Every slice keeps its red/green evidence and usage documentation.

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


## Next bounded task 3.1 milestone — approved, in progress

The 2026-11-10 source inspection selects fresh canonical URL intake before expanding repair/binding producers. Alex approved retaining usable unrepresentable wording in the existing unready editable review path, with a distinct retained-material receipt and no completed-import claim. Proposal/design and the recipe-capture delta record the cutover. No task checkbox is completed by this approval.

Use one actual fresh bootstrap → URL workflow → canonical producer journal → metadata/category/readiness → ordinary edit → dated ingredient/grocery tracer, with immutable launch guards and current-format replay/read-back. For unusable or unrepresentable canonical output, retain guarded editable review material with a distinct failed-extraction receipt, then prove system flag, manual correction and safe retry. Keep existing-recipe reimport, unknown authorship, human clears and source replacement fenced; preserve all required assertions. Follow the acceptance matrix in design.md for red/green actual PostgreSQL/files and a real generated-client/browser seam, CI discovery, scoped prepare and final verification on one frozen candidate. New private tests must scrub inherited Git overrides and use independent Git metadata, owned databases/ports and no production/DV resources. Do not repeat already-qualified unrelated suites or fold this uncommitted slice into grocery commit eec1ce51.

The witnessed fresh-URL review case now has a narrow captured repair candidate: a changed eligible comment launches the existing report workflow, whose reviewed saved wording must pass lossless canonical validation before `review-canonical` publication and the existing readiness/report completion. Manual Save and Resolve remain feedback/edit operations, not completion. General reimport, the browser/grocery seam and the rest of 3.1 remain open pending their own acceptance evidence.

Ordinary binding production is still missing: conversion creates empty bindings, instruction Save retains only prior bindings, and live scaling fixtures seed them. Do not mark step/whole-use or combined task acceptance from this fresh ingredient milestone; first review its semantic proposal/evidence inlet under the step companion, without provider-certified `validated` labels or numeric/name/position inference.

## Approved next increment under 2.1/2.2 and 3.1: flagged correction

Implement the approved retained recipe with a semantic content issue → existing Ready for review filter → ordinary original-ingredient/step editor → Save/reopen → delayed extraction conflict tracer. No new draft product state. Preserve original content, null quantity/unit, stable IDs, all-field unsaved recovery, existing report semantics and unrelated state. Add focused behavioral red/green, real PostgreSQL/normal-app and browser/client evidence, CI discovery and one coherent final verification; keep broader combined tasks open. Fresh canonical producer cutover remains a separate review and is not required to let people correct their recipes.

## Reviewed system-review refinement (2026-11-10)

Alex approved a system flag only for actual ingredient/usable-step validation needs on retained editable recipe content. Use the existing Ready for review status and generic explanation, with a short system-authored explanatory comment and no repair launch. Unchanged feedback Save is a no-op; a changed human comment keeps the existing eligible correction rules (source URL/images, Ingredients/Steps, no Duplicate), history and stale-write protection. Do not turn image/category/transport failures into content reports or overwrite existing feedback. This is a limited bridge from content validation to the existing review queue, not replacement of failed-capture management. Review wording must not claim a re-import happened. Resolve retains its existing feedback-only semantics.

Use the existing Clear/deferred-cleanup guard conservatively: persisted ingredient/instruction/canonical content, including explicit empty saved collections, survives. This also retains some partial automated content; the trade-off avoids a new human-ownership marker/schema or recovery mechanism. Empty placeholders remain eligible for existing cleanup. Preserve the original-step editor and original-content entry, and verify system review → manual correction → reopen → changed comment correction, no-op unchanged save (including after backup/read-back), report preservation, clear protection and stale-job safety. The earlier broad failure-flag proposal is superseded; fresh canonical intake is the separate in-progress milestone, and binding production remains unimplemented. Broader tasks and archive stay open until required acceptance passes.
