# Tasks

Planning only; every implementation box remains unchecked. Separate approval is required to apply. Names of new tests below are proposed suites to create; no behavioral test has run in this spec session. Follow [shared corpus](../canonical-ingredient-correction/acceptance-corpus.md) and [CI requirements](../canonical-ingredient-correction/review.md). Resolve consequential holds before finalizing their dependent work; outlines below do not approve an assumption. Contract changes first update `specs/openapi.yaml`, run `task gen:client`, then synchronize generated SDK consumers and method-sensitive `pwa/e2e/mock-api.ts` handlers/builders/state transitions including conflicts, later reads and SSE. Every slice keeps its red/green evidence and usage documentation.

## 1. Qualify a bounded bilingual vocabulary

**Outcome/scenarios:** C22–C25, C47; safe exact identity with provenance.
**Owners/boundaries:** import/correction saved mappings and food catalogue; canonical foundation plus grocery row contract required. Dataset not yet selected.

- [ ] 1.1 Deliver the pinned dataset/licence/attribution and EN/FR mapping-corpus report described in `sources.md`, including source hashes, exact-vs-broader relations, collisions, purchase qualifiers and false merges. Obtain engineering adoption decision before dataset-dependent code; verify artefacts/source terms and no unreviewed production download dependency.
- [ ] 1.2 After adoption, specify approved food/alias/shopping/category revision shapes in OpenAPI and regenerate client. Add proposed `BilingualShoppingIdentityPostgresTests` and deterministic mapping units for approved seed plus unmapped/ambiguous fixtures; run `task test:database -- --filter FullyQualifiedName~BilingualShoppingIdentityPostgresTests` for intended behavioral red before implementing saved mapping. Update method-sensitive mapping/category/read mocks, implement only validated ingestion and run green; document human-protection and private/global scope.

## 2. Generate groceries deterministically from saved mappings

**Outcome/scenarios:** C09, C22–C25, C47; EN/FR labels with preserved distinctions/units.
**Owners/boundaries:** GroceryRecomputeService, category normalization, projector and schedule DTO. Depends on group 1 and canonical quantity contract.

- [ ] 2.1 Add intended-red `GroceryRecomputeServiceTests`, `IngredientNormalizerTests` and proposed `BilingualGroceryPostgresTests`: onions group only when validated, fresh/canned stay separate, unknown translation fallback, exact ranges, null/unsupported/regional units and zero provider calls on read/recompute. Run `task test:api -- --filter 'FullyQualifiedName~GroceryRecomputeServiceTests|FullyQualifiedName~IngredientNormalizerTests'` and the new database filter before logic; synchronize exact quantity/locale schedule mocks.
- [ ] 2.2 Implement deterministic saved-identity grouping and label selection; run 2.1 green, `task gen:client:check`, `task test:unit -- src/testing/mock-api.test.ts` and grocery browser cases. Assert locale/source permutation leaves demand and row/check identity unchanged, with provider fixture spy proving zero runtime calls. Document unsupported conversions and mapping release/reversal manifest.

## 3. Correct identity and aisle without losing human intent

**Outcome/scenarios:** C25, C31, C34, C40; protected association and category scope.
**Owners/boundaries:** recipe guarded shopping correction, normal food/fallback category endpoint, extra occurrence endpoint, backup round trip. Depends on groups 1–2 and approved category API/scope.

- [ ] 3.1 Add intended-red `IngredientCategoryServiceTests` and proposed `FoodCategoryCorrectionPostgresTests` for current revision, conflicting mapped prior manual categories, stale provider and locale/reimport/recovery. Exercise existing normal and extra mutation scopes plus protected shopping-name PATCH through generated client and method-sensitive mocks; run focused unit/API/database cases before logic.
- [ ] 3.2 Implement protected correction and current-format identity/provenance persistence; run 3.1 green plus grocery category browser cases and the migration owner's real recovery seam. A global alias release requires separately reviewed affected terms; current household correction must not publish globally. Document actual scope/read-back evidence in this slice.

## 4. Final integration and verification

- [ ] 4.1 Reconcile this unit's corpus outcomes and preservation boundaries, run `task gen:client:check` where APIs changed, review the complete task-owned diff, then `task prepare -- <reviewed paths>` when applicable and `task verify -- <reviewed paths>`. Record invocation-specific record_path and actual passed/failed/blocked/skipped/not-run outcomes. Qualify required real seams with zero required skips and the parity owner's production/hosted-candidate requirements; no completion from mocked-only reads or missing stages.
