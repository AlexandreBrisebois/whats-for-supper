# Tasks

Planning only. All implementation boxes remain unchecked. Proposed suite names below are tests to create during a separately approved apply; no runtime pass is claimed. Use synthetic fixtures and disposable nonproduction resources. Existing quiet-portions UI/projection contracts are a prerequisite, not work repeated here.

## 1. Read trustworthy original ingredient facts

**Outcome/scenarios:** recipe-ingredients / one current collection, conservative conversion, guarded publication; recipe-library / canonical detail DTO.
**Owners/boundaries:** additive storage, supported legacy adapter, RecipeService detail mapping, GET `/api/recipes/{id}`, generated Kiota client and stateful GET mock. Real PostgreSQL and actual generated-client detail read establish the seam; provider calls are unnecessary.

- [ ] 1.1 Specify description/nullable amount/nullable unit/identity, `ingredientLines` and `ingredientRevision` in `specs/openapi.yaml`; run `task gen:client`. Add intended-red `CanonicalIngredientConversionPostgresTests` for 200 g with unknown basis, exact wording, missing middle, duplicate names, changed text, explicit empty collection, guarded retry and safely deferred conversion. Synchronize method-sensitive GET builders in `pwa/e2e/mock-api.ts`; run `task test:database -- --filter FullyQualifiedName~CanonicalIngredientConversionPostgresTests` and relevant recipe-client/mock unit tests before implementation and retain the behavioral failure.
- [ ] 1.2 Implement that read/conversion slice and per-recipe current-owner guard. Run 1.1 green plus `task gen:client:check` and `task test:unit -- src/lib/api/recipes.test.ts src/testing/mock-api.test.ts`; read the same original facts through actual API/generated client/PostgreSQL, repeat conversion without identity drift and verify no source or manual text loss. Document supported/deferred adapters and original-mode parity; no migration/cutover claim from mocked reads.

## 2. Edit three original-basis fields and save authoritative facts

**Outcome/scenarios:** recipe-editing / initialized rows, independently optional fields, original-basis editing, one-row correction, revision conflict and lost reply. Recipe-ingredients / valid unquantified content and human protection.
**Owners/boundaries:** existing detail editor and Search return navigation, PATCH `/api/recipes/{id}`, canonical persistence, generated client wrapper and method-sensitive GET/PATCH stateful mock. Depends on group 1; canonical live cutover remains disabled.

- [ ] 2.1 Specify `ingredientLines`, `expectedIngredientRevision`, authoritative saved response and 409/no-partial-write semantics in OpenAPI; regenerate client. Add intended-red `CanonicalIngredientEditPostgresTests`, editor units and `canonical-ingredient-edit.spec.ts`: 200 g original versus 400 g dated draft, change one of two measured rows, blank amount/unit independently/both, unit-only and zero, required description, invalid numeric input, add/remove/order, explicit clearing, basis-only edit, Cancel/failure, stale/unversioned/mixed arrays and conservative guarded legacy updates. Add GET/PATCH mock persistence/conflict transitions; run the database filter, relevant editor unit tests and `task test:e2e -- canonical-ingredient-edit.spec.ts` before implementation and retain expected failures.
- [ ] 2.2 Implement structured drafts and atomic guarded Save, use returned detail/revision, preserve evidence and reconcile uncertain replies. Run 2.1 green and `task gen:client:check`; add and run actual `LiveBrowser_CanonicalIngredientCorrection` via `WFS_CALENDAR_LIVE=1 task test:api -- --filter FullyQualifiedName~LiveBrowser_CanonicalIngredientCorrection` using generated client/API/PostgreSQL with two clients and committed/lost-reply recovery. Verify original 250 g versus dated 500 g after Save, unchanged second row/instructions/media/raw yield, independent household reports, existing Search return and truthful durable pending refresh. Record actual seam results and update editor/API usage documentation within this slice.

## 3. Publish and consume the same saved measurements

**Outcome/scenarios:** capture/share normalization, current projection and grocery/category consumers, late reprocessing preserving manual facts.
**Owners/boundaries:** capture/synthesis/reimport, share import/export, SupperIngredientProjection, category normalization, groceries, Home/detail/Cook. Depends on groups 1–2. Doubles are limited to existing external provider boundaries.

- [ ] 3.1 Add intended-red `CanonicalIngredientPublicationTests` and corresponding PostgreSQL cases for web/photo/synthesis/share/legacy boundaries, malformed input and extraction racing manual Save. Implement publication through the canonical boundary and derived compatible strings; synchronize affected contracts/client/method-sensitive mocks. Run `task test:api -- --filter FullyQualifiedName~CanonicalIngredientPublication` and corresponding database cases red→green plus existing capture/sharing acceptance. Verify source evidence retained, privacy-scrubbed share 1.0 and text-only import do not claim structured fidelity; document writer coverage before cutover.
- [ ] 3.2 Add canonical-original cases to existing projection/cooking/grocery/category suites and browser Home-to-Cook scenarios before routing consumers to current rows. Run affected suites red→green, `task test:database` and existing real preview/dated-servings seams. Verify matching contexts agree before rounding, unchanged rows remain measured, null/unit-only facts remain honest, no stale metadata category names, prepared occurrence facts/instructions/checks stay intact, and increased groceries/pending refresh preserve existing recovery semantics. Document each consumer's current owner and actual acceptance evidence in this slice.

## 4. Preserve structured facts across supported recovery and cutover

**Outcome/scenarios:** full-fidelity envelope, conservative legacy merge, exact recovery and incompatible-writer protection.
**Owners/boundaries:** existing ManagementService export/disk sync/merge/exact recovery, matching schema/database/files/media. Depends on earlier slices. No production writes or real DV reset are part of this task.

- [ ] 4.1 Add intended-red `CanonicalIngredientRecoveryPostgresTests` for version-2 row IDs/descriptions/optional fields/revisions/evidence/protection/basis and explicit null/empty round trips, legacy version-1/raw/string/array/object adapters, richer-current merge protection, concurrent merge and malformed/incompatible snapshot rejection. Implement adapters within the slice; run `task test:database -- --filter FullyQualifiedName~CanonicalIngredientRecoveryPostgresTests` and affected existing recovery suites red→green using real files/database. Update supported-format and recovery documentation with actual schema/read-back evidence.
- [ ] 4.2 Rehearse `rollout.md` on disposable resources: no-write inspection, independently stored exact backup/restore, guarded bounded conversion/resume, old-client rejection, publisher/consumer coverage and compatible recovery after manual edits. Verify restore/read-back manifests and actual API/browser behavior, record immutable candidate identity and unresolved prerequisites. Do not activate canonical writes or delete legacy storage; prepare a reviewable cutover packet for separate authorization.

## 5. Final integration and verification

- [ ] 5.1 Reconcile all scenario evidence, complete contract/client/mock parity and actual internal-seam acceptance; review the complete task-owned diff and run applicable `task prepare -- <reviewed paths>`, `task verify -- <reviewed paths>` and `openspec validate canonical-ingredient-correction --strict`. Record real passes/skips/blockers and verification content identity; do not mark complete with required acceptance missing.

## Workflow follow-up

- Request separate approval to apply this refined change. Deployment/cutover and later archive require their own applicable authorization and evidence.
- Reconcile the separately deferred selective-repair draft against this narrower editor/provenance contract before considering its activation; no automated repair prerequisite is introduced here.
