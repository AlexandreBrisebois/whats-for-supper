# Implementation and acceptance evidence

The original extraction results below are historical. The approved editing increment has its own evidence and check results in the final section.

Run date: 2026-11-03. Initial Git state contained only this supplied, untracked change directory. Existing proposal, design, deltas and change metadata were preserved. No source recipe directory was written. Implementation stops before commit, deployment, archive or backfill on development/production data.

## Test-first slices

Command logs are retained under `.task/servings/`. Database records below include tested source/runtime identity, test names, TRX and logs. Native focused API runs deliberately skip opt-in PostgreSQL/provider/live cases; the named isolated runs below supply that evidence.

| Slice | Intended red before logic | Green acceptance |
| --- | --- | --- |
| Contract | Contract prerequisite, not an application behavior cycle | `task gen:client`; generated nullable number, deserializer and serializer reviewed; `task gen:client:check` passed |
| Four-serving projection | `task test:api -- --filter FullyQualifiedName~RecipeServings`: missing DTO projection; finite grammar extension 21 intended failures. `task test:unit -- src/lib/api/recipes.test.ts src/components/recipes/RecipeDetailSheet.test.tsx`: 6 missing mapping/heading failures. PostgreSQL: absent column and missing DTO, 2 intended failures, record `faaa0070b67b4eb9b00c520022ab8258` | Focused API 21 passed; PWA 64 passed (includes known→pending→unknown identity). `task test:database -- --filter FullyQualifiedName~RecipeServingsPostgresTests`: 2 passed, zero skipped, record `838b1d3b817a4c5d860c1d5651ccf854` |
| Mock/browser | Shared PATCH→GET mock test failed at missing serving count before builder/handler update | `task test:e2e -- recipes.spec.ts --workers=2 --reporter=line`: 87 passed with `--workers=1`, including unified-recipes selection; 4/1/null, EN/FR, identity change, edit/read modes and unchanged quantities |
| Optional yield and backfill | `task test:api -- --filter 'FullyQualifiedName~RecipeExtractionParserTests|FullyQualifiedName~SyncRecipeProcessorTests|FullyQualifiedName~RecipeServings'`: 5 malformed-yield failures. Backfill PostgreSQL: 3 intended missing-update/interruption/race failures, record `3fcda3c1d8f546bc9de91c4c02088832` | Same API selection plus `FullyQualifiedName~ExtractRecipeProcessorTests`: 41 passed. `task test:database -- --filter FullyQualifiedName~RecipeServingsBackfillPostgresTests`: 3 passed, zero skipped, record `8ca1480b8a62411592aa33d24dbee92d` |
| Export/merge/sync | `task test:api -- --filter 'FullyQualifiedName~ManagementServiceTests|FullyQualifiedName~SyncRecipeProcessorTests|FullyQualifiedName~RecoveryExportFreshnessTests'`: 24 intended preservation/validation failures | Same command: 79 passed. Current 4/null, legacy direct/wrapped content, repeated export→restore→sync, malformed counts and no info additions |
| Exact recovery | Existing generic full-row preservation already supports the new column; new PostgreSQL scenarios passed before recovery logic changes, not an invented red | `task test:database -- --filter FullyQualifiedName~OnlineRecoveryPostgresTests`: 29 passed, zero skipped before and after recovery changes; final focused record `a837a28daa6c46b196618235384abb88` |

All database record paths above expand to `.task/database-tests/runs/<id>/result.json`.

Early test setup mistakes (strict provider-service lookup, description-call count, JSONB whitespace baseline), a misplaced French locale key, an unsupported unit locator option and the first live host's missing same-origin gateway were corrected. Those setup/tooling failures are not counted as intended red evidence. An initial database run invalidated by concurrent test editing is retained as `61e110af1a0b436f8f2dba8225c21874`; it supplies no stable-content success.

## Scenario reconciliation

| Delta scenarios | Evidence and scope |
| --- | --- |
| Four-portion extraction; retry; replacement clears unresolved yield; persisted known/unknown DTO | Real RecipeAgent normalization/store → SyncRecipeProcessor → PostgreSQL → HTTP detail test; reverse-order concurrent backfill/content-sync regression; focused repeat-sync/replacement tests; no scaling or new info fields |
| Serving grammar; unknown/alternative/range/non-serving/zero/negative/fraction/overflow/non-string values | Common parser/sync theories; optional-yield extraction tests retain required name/ingredients/instruction completeness |
| Three existing yields 2/2/4; known/unknown rows; retained deleted rows | Real trigger/orchestrator/tasks → bounded processor on disposable PostgreSQL. Metadata/ingredients compared against persisted before-images, known count 7 retained |
| Concurrent replacement; concurrent known count; interrupted/repeated backfill | Separate-connection writes injected between read and conditional update; cancellation after committed update, safe restart and keyset continuation. No AI processor or recipe-file dependency |
| Four servings in each language; one serving; known→unknown; read-only edit badge; unchanged quantities | Recipe component/mapping tests and 87 browser scenarios. Existing loading, failure, Retry, Close and stale-response coverage retained |
| Narrow/enlarged bilingual heading and wider two-column layout | Isolated live API/PWA test: 320/1024 CSS px × 100%/200% text × EN/FR. All eight screenshots inspected; full heading/count fit, badge moves below title when needed; browser asserts no heading overlap/overflow or horizontal scroll and no focus stop |
| Current export/restore; explicit unknown; legacy envelope/direct JSON; invalid exported count | Management, sync and export-freshness matrices; present null does not fall back to old yield; invalid present values skip the whole record |
| Compatible exact round trip; pre-column schema mismatch | Real PostgreSQL full-row 4/null restore, repeated restore, and a captured pre-column schema rejected before live publication |
| Single four-portion card; utensil columns; explicit base/doubling note | Actual provider qualification below, independent of boundary doubles |
| Reversed serving columns and unresolved/unreadable evidence | Explicit prompt clauses; deterministic projection/completeness checks. Supplied-image qualification covers the three provided originals; no additional synthetic image/provider run is claimed |

## Live client and rendered acceptance

`WFS_CALENDAR_LIVE=1 task test:api -- --filter FullyQualifiedName~LiveBrowser_RecipeServings` ran through the repository database runner's owned temporary PostgreSQL context (helper `.task/servings/run-live.py`). Final run passed one live test, zero skipped. It launches only an isolated API/gateway and task-owned PWA, uses real generated-client reads, verifies HTTP 200 `recipe.servings: 4`, and retains 510 g beef / 340 g pasta. `task agent:drift:endpoints` ran inside that API lifetime and reported all endpoints match. This is local integration, not deployed-route qualification.

Screenshots: `.task/servings/live-{en,fr}-{320,1024}-{1,2}.png`. Badge-only screenshots and `.task/servings/badge-contrast.json` record sampled actual background RGB 238/237/228 and text pixels, with a minimum contrast of 6.85:1. Inspection and browser geometry establish the selected heading/badge requirements; they are not blanket accessibility qualification of the entire sheet.

## Actual image provider qualification

`WFS_SERVINGS_PROVIDER=1 task test:api -- --filter FullyQualifiedName~RecipeServingsProviderPostgresTests --logger trx;LogFileName=servings-provider.trx` ran (the explicit provider fixture is now named `RecipeServingsProviderQualificationTests` so the ordinary zero-skip database gate does not select paid-provider opt-in coverage) using `.task/servings/run-provider.py`, which loads only relevant existing Gemini configuration without printing credentials and owns a disposable PostgreSQL instance. One provider qualification passed, zero skipped. All two JPG pages of each supplied original were copied into isolated in-memory recipe storage and processed by RecipeAgent, then synchronized and read over HTTP detail.

Configured provider/model: Gemini OpenAI-compatible endpoint, `models/gemini-3-flash-preview`. Observed normalized yields/counts: **2 portions/2, 2 portions/2, 4 portions/4**. Representative unchanged amounts: 360 g chicken / 500 g potatoes; 2 chicken breasts / 225 g Brussels sprouts; 510 g beef / 340 g radiatore. No serving/yield info fields were added.

`.task/servings/provider/<source-id>.json` records prompt SHA-256, all input SHA-256 values, normalized result, HTTP detail, provider/model/endpoint, translation setting and runtime/assembly identity. Adjacent `*-response-*.json` files retain actual response text and returned model IDs. `.task/servings/provider-runtime.json`, `provider.log` and the provider TRX retain runtime/test evidence. These observations are separate from deterministic provider-boundary doubles and do not guarantee future model behavior.

## Scope-review concurrency regression

A further real PostgreSQL test found the reverse race ordering: backfill can commit a count after sync has loaded an initially-null value. EF then omitted the unchanged null projection from the content update. The test observed stale servings 2 on replacement unknown-yield content before the fix (record `3901f89cb45e43f991ae074dfc63e4da`). Sync now explicitly includes Servings in the same update as content. The augmented `task test:database -- --filter FullyQualifiedName~RecipeServingsPostgresTests` passed all 3 cases, zero skipped, record `cdbeaf2f6850431795bea37d3736990e`. Merge restore already obtains a row lock and reloads before saving (`RecipeRotation.LockAsync`); an attempted same-order fault injection there blocked on that lock and is not claimed as a product regression.

Two expanded recipe browser runs with two workers each failed the existing, unchanged French stack-action viewport test while the other 86 scenarios passed. A focused diagnostic run and the complete 87-test selection with one worker passed. No stack-layout code or test expectation was changed; the cause is not claimed resolved. Type checking passed after replacing the unsupported unit-test locator option.

## Shared DTO projection review

Discovery converts a database view into Recipe before the shared DTO mapping. A new real PostgreSQL/HTTP regression observed null for a stored count 4 before the view/model projection was extended (record `546271a76bcb4d41a19f7448da3d457a`). The view now appends servings and its model passes it through; known 4 and unknown null are checked. Fresh/populated/repeated schema tests rebuild the view through its declared DDL after compatibility, preserving existing ingredients. The combined focused PostgreSQL selection (servings tracer/schema/concurrency/Discovery, backfill and exact recovery) passed **36 tests, zero skipped**, record `91bb84471f2b453bbcc63c0f6f0cddbd`. The final database gate also covers the backfill fixture's added representative 360/500, 2/225 and 510/340 quantities.

## Fresh/additive exact-schema compatibility

The real fresh-snapshot → additive-upgrade → exact-restore regression initially returned HTTP 400 because the newly inserted column's ordinal position differed from `ALTER TABLE ... ADD COLUMN` (record `f69102eca4194495836cbdbb174d86d4`). Fresh DDL now appends servings as the last column, matching the additive path without changing schema preflight. The same combined PostgreSQL selection passed **37 tests, zero skipped**, record `bb31ddedd573470cb1c52b674be068a2`, including restored authoritative 4/null, Discovery, repeated schema application, backfill and both concurrency orders.

The first complete verification record, `.task/agent-finish/runs/0a04e03b98b44b9aae4fe8e54eb0ca02.json`, passed documentation, all 37 strict OpenSpec items, lint, formatting, types and 1,429 unit tests, then failed content stability. Remaining gates were not run; it supplies no final-content success. A controlled repeat of all unit tests passed 111 files / 1,429 tests and left the checked source/runtime file manifests unchanged (`.task/servings/identity-changed.json` is empty). The complete final path set is rerun after preparation; no cause for the earlier mutation is asserted.

## Responsive heading bounds and broader gate

The strengthened real-client browser check holds the sheet's inner horizontal offset at zero, scrolls only vertically, waits for fonts, and checks the heading/title/badge against the actual visible scroller bounds. It exposed intrinsic grid sizing at doubled text: the heading extended to x=453 beyond the visible x=288 edge (`.task/servings/red-live-heading-bounds.log`). The ingredient/notes grid now uses explicit zero-minimum tracks at both one- and two-column widths. The real API/generated-client test then passed every EN/FR × 320/1024 × 100%/200% case with no horizontal scrolling needed to read the heading/count. All eight new screenshots were inspected; badge contrast remains at least 6.85:1. This replaces the weaker outer-panel-only layout evidence. The affected component/API unit selection passed 64 tests, focused RecipeServings API tests passed 21 (10 opt-in relational/live/provider cases skipped and qualified separately), and the complete recipe browser selection passed all 87 cases serially after the layout fix.

The stable full-gate record before this final responsive refinement, `.task/agent-finish/runs/39f300ed90f84938a0c417d46b0c5bf1.json`, passed documentation/specs/lint/format/types, 1,429 unit tests, 1,322 API tests (185 opt-in skips), all static contract/client checks, live endpoint parity, and 210 PostgreSQL tests with zero relational skips. Its broad browser run had 730 passed, 48 opt-in skips and one failed French GOTO-filter keyboard assertion in unchanged `pwa/e2e/goto-layout.spec.ts:196` (`aria-pressed` stayed false after Space). That single test passed in a focused diagnostic run; its cause is not claimed resolved and no GOTO code or test expectation was changed. That record left task 4.1 open until the complete gate was rerun for final content; a targeted pass did not replace the gate.

## Export scalar compatibility

A focused regression also protected the pre-existing envelope fallback for name/time when recipe.info lacks a name. It observed the raw extraction name instead of the saved outer export name before correction (`.task/servings/red-api-export-fallback.log`). Sync now uses the tolerant parser on its original root for those existing scalar fallbacks, while serving interpretation still uses decoded raw metadata/current authoritative count. The complete focused parser/extraction/servings/management/sync/export API selection passed **115 tests** (10 opt-in cases qualified separately) after this correction (`green-api-export-fallback.log`).

## Final verification and scope

The complete reviewed path set is retained in `.task/servings/paths.json`, with task-owned implementation/tests/docs and supplied change context. Preparation and final verification run after this evidence file is finalized; the isolated live fixture can keep its disposable API available with `WFS_SERVINGS_VERIFY=1` while the complete `task verify -- <paths>` runs. Their authoritative statuses, tested identity and durable `record_path` are reported by each invocation and in the final response. This file is not edited merely to attach old results to a new content digest.

Required named acceptance currently has no unresolved failures or unavailable endpoints. Final harness checks remain a separate gate. Commit, deploy, archive and backfill against development/production are not run by explicit scope. No ingredient scaling, share changes, new recipe.info fields or unrelated cleanup are included. Source directory hashes are retained in `.task/servings/original-hashes.json` and checked again at completion.

## Changed files

The following paths contain implementation, tests, operator documentation or task/evidence edits. Six supplied planning-context files are unchanged and are included only in the reviewed verification context.

- `api/database/compatibility.sql`
- `api/database/schema.sql`
- `api/src/RecipeApi.Tests/Integration/OnlineRecoveryPostgresTests.cs`
- `api/src/RecipeApi.Tests/Integration/RecipeServingsBackfillPostgresTests.cs`
- `api/src/RecipeApi.Tests/Integration/RecipeServingsPostgresTests.Live.cs`
- `api/src/RecipeApi.Tests/Integration/RecipeServingsPostgresTests.cs`
- `api/src/RecipeApi.Tests/Integration/RecipeServingsProviderQualificationTests.cs`
- `api/src/RecipeApi.Tests/Integration/RecoveryExportFreshnessTests.cs`
- `api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs`
- `api/src/RecipeApi.Tests/Services/Processors/SyncRecipeProcessorTests.cs`
- `api/src/RecipeApi.Tests/Services/RecipeExtractionParserTests.cs`
- `api/src/RecipeApi.Tests/Services/RecipeServingsTests.cs`
- `api/src/RecipeApi/Data/RecipeDbContext.cs`
- `api/src/RecipeApi/Dto/RecipeDto.cs`
- `api/src/RecipeApi/Infrastructure/RecipeExportContent.cs`
- `api/src/RecipeApi/Models/DiscoveryRecipe.cs`
- `api/src/RecipeApi/Models/Recipe.cs`
- `api/src/RecipeApi/Program.cs`
- `api/src/RecipeApi/Prompts/extract-recipe.md`
- `api/src/RecipeApi/Services/ManagementService.cs`
- `api/src/RecipeApi/Services/Processors/BackfillRecipeServingsProcessor.cs`
- `api/src/RecipeApi/Services/Processors/SyncRecipeProcessor.cs`
- `api/src/RecipeApi/Services/RecipeExtractionParser.cs`
- `api/src/RecipeApi/Services/RecipeService.cs`
- `api/src/RecipeApi/Services/RecipeServings.cs`
- `api/src/RecipeApi/Workflows/recipe-servings-backfill.yaml`
- `api/src/RestClient/03-recipes.rest`
- `docs/operations/exact-recovery.md`
- `docs/operations/recipe-servings-backfill.md`
- `docs/operations/recovery-exports.md`
- `openspec/changes/extract-recipe-servings/evidence.md`
- `openspec/changes/extract-recipe-servings/tasks.md`
- `pwa/e2e/mock-api.ts`
- `pwa/e2e/recipe-servings-live.spec.ts`
- `pwa/e2e/recipes.spec.ts`
- `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`
- `pwa/src/components/recipes/RecipeDetailSheet.tsx`
- `pwa/src/lib/api/generated/kiota-lock.json`
- `pwa/src/lib/api/generated/models/index.ts`
- `pwa/src/lib/api/recipes.test.ts`
- `pwa/src/lib/api/recipes.ts`
- `pwa/src/locales/en/common.json`
- `pwa/src/locales/fr/common.json`
- `pwa/src/testing/builders.ts`
- `specs/openapi.yaml`

## Final result

All selected task acceptance and final application gates passed. Complete application verification record: `.task/agent-finish/runs/cf4d22482e29431b85c524f4191a8651.json` (`automated_checks_passed: true`, content stability passed).

- Strict OpenSpec: 37 items passed; documentation, lint, formatting and types passed.
- PWA units: 111 files / 1,429 tests passed.
- Broad browser selection: 731 passed, 48 separately enabled/opt-in skips; no failed cases in the final run.
- API: 1,323 passed, 185 opt-in relational/live/provider skips; those categories have separate required evidence above.
- PostgreSQL gate: 210 passed, zero skipped (see the database record linked from the application verification record).
- Static contract/client checks and live endpoint parity passed. Actual provider qualification remains separate: 2/2/4 with retained amounts and all original pages.
- Required checks: none failed, blocked or not-run in the final application gate. `test:agent` is not applicable to this application/contract scope. Earlier failed attempts and unresolved causes of earlier intermittent French UI test failures remain documented; they are not silently substituted with targeted passes.

OpenSpec task tracking is 12/12 complete. Closing task/evidence edits are documentation-only and are verified separately after the passing application run; application code/configuration is unchanged by that closure. All 19 original source files retain their recorded hashes and file membership. No commit, deploy, archive or development/production backfill was performed.

## Approved editing increment — 2026-11-03 (tasks 5.1–5.4 and 6.1)

Everything above this section records the original extraction implementation and its historical qualification. It does not establish editing acceptance. This increment began with that implementation already dirty, including its untracked tests/change artifacts. Before-images are retained under `.task/servings-edit/before/`; the increment's reviewed diff and path list are `.task/servings-edit/increment.diff` and `paths.json`. The original extraction parser, prompt, schema and recovery implementation are preserved. No new provider qualification was requested or run.

### Contract and test-first evidence

OpenAPI was updated first for optional integer PATCH `servings`, minimum 1, maximum 2147483647, omission preserving known/null and supplied null invalid. `task gen:client` and `task gen:client:check` passed; the generated update property/deserializer/number serializer were inspected. Kiota's optional generated number also permits null in TypeScript; the real API rejects it. Read DTO nullability and sharing are unchanged. REST examples now demonstrate correction and omission.

Before backend/editor logic, the following commands ran:

- `task test:api -- --filter 'FullyQualifiedName~RecipeServings|FullyQualifiedName~ManagementServiceTests|FullyQualifiedName~SyncRecipeProcessorTests|FullyQualifiedName~RecoveryExportFreshnessTests'`: 11 intended failures, 107 passed, 11 explicit relational/live/provider skips (`red-api.log`). Supplied edits were ignored and invalid counts returned success. Recovery matrices for counts differing from raw yield already passed; no invented red or recovery rewrite.
- `task test:unit -- src/lib/api/recipes.test.ts src/components/recipes/RecipeDetailSheet.test.tsx`: 15 intended failures, 65 passed (`red-unit.log`): missing serialization/editor and its validation/save/cancel/retry/identity behavior.
- `task test:database -- --filter 'FullyQualifiedName~RecipeServings|FullyQualifiedName~OnlineRecoveryPostgresTests'`: copied pre-implementation API source observed the intended persisted 4 instead of corrected 3 failure; 38 recovery/extraction tests passed with zero skipped. Records `7238705e40e44ae7b2c80cc16c80498c` and `e0336a074bb14a25a6a343e611e19d0c` retain immutable copied API source manifests and TRX. Both whole-tree records failed content stability, so neither is claimed as stable final-content success. Green acceptance below is a separate stable run.

All log names in this editing section are relative to `.task/servings-edit/`; database record IDs expand to `.task/database-tests/runs/<id>/result.json`.

### Implemented behavior and green acceptance

The existing update service validates presence independently of value, rejects explicit null/nonpositive counts and uses strict JSON numeric handling to reject strings/fractions/overflow. Counts persist in the dedicated column without parsing/replacing raw yield. Existing timestamp/export freshness and row locking remain in use. The generated-client wrapper forwards supplied counts and omits unavailable ones. Shared method-sensitive mocks validate PATCH, preserve omission and retain state for GET/reopen; no new builder behavior is necessary because the existing builder already accepts optional known/null counts.

The editor uses the exact English/French labels and validation copy from design.md. A text input with numeric keyboard mode preserves malformed input for validation; associated label/error and aria-invalid expose it accessibly. Known empty replacements are invalid; unknown blank drafts omit servings. The badge remains immediately inside Ingredients and reflects the last successful save. Cancel resets drafts, failures retain them, and recipe identity changes reset draft/error/edit state. A visit counter maintained in the loading effect prevents a late save from replacing the current recipe, including leaving and returning to the same ID before that save finishes. No ingredient scaling or yield/count info fields were introduced.

| Required seam | Actual evidence |
| --- | --- |
| API validation, edits, omission, authorization and recovery regression | Same focused API command: 118 passed, 12 explicit relational/live/provider skips (`green-api-2.log`); skipped categories are separately qualified below. Supplied 2147483647 succeeds; null/zero/negative/fraction/overflow/string/bool/object fail without changing other fields. |
| PWA mapping/generated serialization, validation, Cancel, failed-save retry and identity transitions | Same focused unit command: 82 passed (`green-unit-final.log`), including completion of a prior-identity save while editing the next recipe. |
| Real PostgreSQL HTTP edits, omission/invalid requests, export→merge restore→disk sync, repeated compatible exact restore and backfill/manual-save race | Same focused database command: 40 passed, zero skipped; stable record `9207a38dfeaf47118ba6e8ff57fa748d`. `db-changed.json` is empty. Known 4→3 and null→2 retain raw “4 portions” and 510 g beef / 340 g pasta. Directly seeded corrected-count recovery regressions also pass in ManagementServiceTests, SyncRecipeProcessorTests, RecoveryExportFreshnessTests and OnlineRecoveryPostgresTests. |
| Method-sensitive mock/browser editing and existing loading/close/stale-response behavior | Full `task test:e2e -- recipes.spec.ts --workers=1 --reporter=line`: 101 passed (`green-e2e-final.log`). New EN/FR cases cover correction/addition, omission, invalid input, Cancel, failed save/retry, GET/reopen and identity reset; existing singular/plural and viewing-mode focus checks remain. |
| Real API/PostgreSQL/PWA and generated client | `.venv/bin/python .task/servings-edit/run-live.py` launches only a disposable database, temporary recipe store, owned HTTP API/gateway and PWA. `live-final.log` records one passed live test, zero skipped; `live-acceptance.json` records API/database identity, .NET runtime and application assembly SHA-256. PATCH→GET/reopen verifies 4→3 and null→2 independently of raw yield. |
| Responsive/accessibility acceptance | Live browser exercises EN/FR × 320/1024 CSS px × 100%/200% text, with keyboard focus/Tab/Shift+Tab, keyboard entry/save, visible label and associated localized error. Heading, field, label, error and Save/Cancel bounds are measured against the actual visible scroller. Screenshots `editor-*.png`, `recipe-save-edits-*.png`, `recipe-cancel-edits-*.png` inspected; no selected-label truncation/overlap or horizontal scrolling is required. Badge contrast sampled from actual background/text remains at least 6.85:1 (`badge-contrast.json`). |
| Contract parity | `task gen:client:check` passed (`client-check-final.log`); `task agent:drift:schemas` passed (`schema-drift.log`). `task agent:drift:endpoints` runs inside the disposable live API lifetime and reports all endpoints match in `live-final.log`. Static drift does not substitute for PATCH/GET persistence. |

The first browser attempt used an overriding stateless test handler and a reload after the app consumed its open query parameter. The second used a known-count fixture for unknown-count cases; these test-setup errors were corrected to use the shared stateful routes, explicit reopen and existing null-count fixture. One unchanged French stack-viewport test failed intermittently during the second run; no unrelated implementation/test expectation was changed. These failed attempts remain in `green-e2e-1.log` and `green-e2e-2.log` and are not final success evidence.

The first green PostgreSQL attempt had two assertion mistakes comparing JSONB formatting as literal text (`56f5d4bf7cb3409d87714151397e4e4a`); semantic JSON/ingredient assertions now retain the required values without treating database whitespace as a product change. The first live editor check exposed validation-number and ingredient-input overflow; the next stronger check exposed action-label overflow at doubled text. Minimal wrapping/shrinking and narrow-screen action spacing changes corrected these (`live-1.log`, `live-actions-red.log`, `live-actions-green.log`). A schema drift heuristic needed JsonPropertyName adjacent to the property declaration; attribute ordering was corrected without weakening validation. A system Python invocation lacked PyYAML; the repository virtual environment is used for the live helper.

### Scope review and final gate

The increment changes the existing DTO/update owner, consumer/editor/locales, approved OpenAPI/generated output, method-sensitive mocks, selected acceptance tests and relevant operation examples/docs. No new schema, provider, recovery version, RecipeInfo field, or parallel servings parser is introduced. Existing recovery behavior passed corrected-count cases and needed no production changes. The existing extraction implementation remains present. All 19 supplied recipe files retain hashes and membership (`source-preservation.json`). No development/production database, source directory, provider, commit, deploy or archive operation is performed.

All named editing acceptance checks now pass. No required seam is blocked or unavailable. Final preparation/verification and the definitive result are recorded by their invocation-specific `.task/agent-finish/runs/<id>.json` records and reported in the final response. Until that gate passes, task 6.1 remains open. Historical provider qualification above remains separate; no new provider run is required. Test-first is not applicable to documentation-only edits. Harness tests are not applicable to this application/contract slice.

### Files changed by the editing increment

The following 27 paths differ from the preserved session before-image (the new DTO is compared with HEAD). Complete verification also includes the previously implemented extraction paths because they are shared runtime/contract dependencies; that does not assign their earlier edits to this increment.

- `api/src/RecipeApi.Tests/Integration/OnlineRecoveryPostgresTests.cs`
- `api/src/RecipeApi.Tests/Integration/RecipeServingsBackfillPostgresTests.cs`
- `api/src/RecipeApi.Tests/Integration/RecipeServingsPostgresTests.Live.cs`
- `api/src/RecipeApi.Tests/Integration/RecipeServingsPostgresTests.cs`
- `api/src/RecipeApi.Tests/Integration/RecoveryExportFreshnessTests.cs`
- `api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs`
- `api/src/RecipeApi.Tests/Services/Processors/SyncRecipeProcessorTests.cs`
- `api/src/RecipeApi.Tests/Services/RecipeServingsTests.cs`
- `api/src/RecipeApi/Dto/UpdateRecipeDto.cs`
- `api/src/RecipeApi/Services/RecipeService.cs`
- `api/src/RestClient/03-recipes.rest`
- `docs/operations/recipe-servings-backfill.md`
- `docs/operations/recovery-exports.md`
- `openspec/changes/extract-recipe-servings/evidence.md`
- `openspec/changes/extract-recipe-servings/tasks.md`
- `pwa/e2e/mock-api.ts`
- `pwa/e2e/recipe-servings-live.spec.ts`
- `pwa/e2e/recipes.spec.ts`
- `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`
- `pwa/src/components/recipes/RecipeDetailSheet.tsx`
- `pwa/src/lib/api/generated/kiota-lock.json`
- `pwa/src/lib/api/generated/models/index.ts`
- `pwa/src/lib/api/recipes.test.ts`
- `pwa/src/lib/api/recipes.ts`
- `pwa/src/locales/en/common.json`
- `pwa/src/locales/fr/common.json`
- `specs/openapi.yaml`

The first editing application gate, `.task/agent-finish/runs/25a9f393e68645b2a06bb61e3b86868d.json`, passed documentation/specs/format/types and full unit tests but failed PWA lint for assigning a ref during render, then failed content stability after units. Impact/browser, API, contract, endpoint and database gates were not run in that record. It supplies no final-content success. The save guard now uses an effect-owned visit counter; `red-return-identity.log` reproduces a late save overwriting a new draft on returning to the same ID (1 intended failure, 54 passed), and `green-unit-final.log` passes all 82 focused tests after the fix. Later final verification is a complete rerun; no cause for the content mutation is asserted without the diagnostic evidence.

The controlled full-unit diagnostic passed 111 files / 1,451 tests and identified the changed runtime input: `pwa/node_modules/.vitest-cache/af2f94e697ee74c976116da6af480b554e978b78`, a Vitest transformed-module cache entry (`unit-cache-change.json`). No repository source file changed. A second controlled full-unit run passed the same 1,451 tests with `unit-changed.json` empty. The cache is populated before the stable final gate; the verifier is unchanged, and no cache exclusion or test requirement is weakened. This observation explains that diagnostic's mutation; the earlier failed records retain their own scope and are not retroactively called successful.

The next complete application record, `.task/agent-finish/runs/cc0bbb5947744567a5557925f17de917.json`, passed content stability, documentation, all 37 strict OpenSpec items, lint/format/types, 1,451 unit tests, 1,340 API tests (187 explicit opt-in skips), static contract/client checks, live endpoint parity and all 213 PostgreSQL tests with zero skipped (`477e7cb72e2d45d78d5bec4c6629e05c`). Its broad browser stage had 753 passed, 48 opt-in skips and two failures in unchanged files: Discovery mouse movement measured 99.1056 px against expected 100 px with <0.5 px tolerance (`stack-gestures.spec.ts:418`), and a French pending-Search/list continuation timed out (`unified-recipes.spec.ts:388`). Neither path invokes the changed recipe PATCH count validation or servings editor in the failed interaction. No unrelated code or assertion was changed.

`task test:e2e -- stack-gestures.spec.ts unified-recipes.spec.ts --grep 'mouse Discovery preservation|French list viewport with reduced motion' --workers=1 --reporter=line` then passed both tests (`broad-failure-diagnostic.log`). Their cause is not claimed resolved, and the diagnostic does not replace the failed full gate. Failed screenshots/context are retained under `.task/servings-edit/broad-failures/`. A complete final gate is rerun on unchanged application code; task 6.1 remains open pending that result.

### Current editing checkpoint: implementation accepted; full verification blocked

The final complete application invocation is `.task/agent-finish/runs/755dce95469949e9a6b8dd390405e04b.json`. Content stability passed. Documentation, all 37 strict OpenSpec items, lint, formatting, types, all 1,451 unit tests, 1,340 API tests (187 explicit opt-in skips), static contract/client checks, live endpoint parity and all 213 PostgreSQL tests with zero skipped passed. Database record: `.task/database-tests/runs/582fac1d1ba046b8b4fee18bf0f1fa7d/result.json`. The dedicated real API/generated-client/PWA acceptance ran successfully before the nested full gate; its test wrapper returns failure because the nested gate failed, not because PATCH/GET or the editor acceptance failed.

The broad browser stage finished **754 passed, 48 opt-in skipped, 1 failed**. The remaining failure is the unchanged `constrained French stack placement` case in `pwa/e2e/unified-recipes.spec.ts:187`, failing at line 235: at 390×844 CSS px and 200% text, the stack action bar's viewport ratio was 0.507 against required 0.98. This scenario navigates/scrolls the Recipes stack without opening the detail editor or submitting a recipe PATCH. Its test and stack layout implementation are unchanged. The previously failed Discovery mouse and French list-continuation cases passed in this complete run. No cause for the intermittent stack failure is claimed resolved.

On the final application code, `task test:e2e -- recipes.spec.ts --workers=1 --reporter=line` then passed **all 101 tests** (`recipes-final-current.log`), including this existing stack scenario and the editing scenarios. That separate named acceptance result establishes task 5.3's required browser check; it does not replace the failed broad final gate. All specific tasks 5.1–5.4 acceptance is complete. **Task 6.1 remains unchecked; overall editing-scope verification is blocked by the failed broad browser check.** Fixing unrelated stack layout or weakening its test is outside the selected editing increment. No additional full-gate success is claimed.

Final source preservation recheck: all 19 supplied recipe files retain their recorded hashes and membership (`source-preservation.json`). No previously untouched baseline implementation file was altered by preparation. The 27-file increment and complete 52-path verification selection are retained under `.task/servings-edit/`; `.task/servings-edit/final-summary.json` records the checkpoint and blocker. No new provider run, commit, deploy, archive or development/production backfill occurred. Closing evidence edits are documentation-only and receive their own scoped verification record; they do not change the application code tested by the failed full gate. Resume only with explicit direction for the remaining verification blocker.
