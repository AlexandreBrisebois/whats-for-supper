# Design

## Context and Existing Ownership
RecipeDetailSheet and ActionGearMenu own detail reading/editor entry; `pwa/src/lib/api/recipes.ts` wraps existing ingredient GETs. `IngredientProjectionService` / `SupperIngredientProjection` already own preview/dated quantities, including unknown/stale-line behavior. HomeCommandCenter currently supplies `currentRecipe.ingredients` directly to TonightMenuCard, while dated Cook uses the projector. This is a source-observed mismatch; no new storage owner is needed to align those screens.

## Decisions and Tradeoffs
- Keep one list and one effective count, with the existing 2/4/6 group. A changed preview exposes its returned basis and concise temporary meaning. Explicitly selecting the confirmed default returns to it; a background read does not cancel an earlier preview intent.
- Keep **Set recipe portions** as entry to the existing saved editor, focused on original basis. Explain the saved effect there. No structured amount editing is introduced in this stage.
- Move original inspection to overflow before a changed preview and inline afterward, never both. This costs an extra tap from default reading. Original inspection remains available for prepared/grocery contexts even when temporary preview is ineligible; grocery-source date remains once where Plan is undated.
- Remove generic detail review copy and its space, including hidden announcements and substitute icons/colors/tooltips. This deliberately removes a broad uncertainty signal; exact raw lines, completeness response, specific missing-basis correction, genuine errors and grocery warnings remain. Do not claim every line adjusted. Keep `recipes.projectionReview` while CooksMode uses it.
- Feed Home's expanded assigned list from the existing generated-client projection using captured date/recipe/occurrence, rather than locally scaling strings. Original/undated contexts intentionally differ. Reuse current loading/error and changed-plan patterns and a keyed request; old results must not be labeled current. No global state manager or API change is required.

## First Observable Slice
Use a synthetic original-two / 200 g pasta recipe planned for six. Home's expanded list and its Cook entry both show 600 g through the actual generated client → existing API → projection → disposable PostgreSQL path. Delay/reorder projection replies and change the occurrence: Home must retain honest pending/error/changed-plan feedback without installing old amounts. Compare recipe, plan, preparation, groceries/checks and workflow state before/after to establish read-only behavior. Then qualify quiet detail preview four and return to dated six through the same service.

## State, Concurrency and Recovery
Retain the existing recipe/date/preview keys, last-request protection, original-review return context and editor draft recovery. Dated five previewed at original four is still temporary with a return to five; factor one needs no instruction-scaling explanation. Prepared seven remains frozen and distinct from current recipe basis. No historical ingredient snapshot is added. A changed preview with actual non-unit scaling retains specific instruction-amount guidance. Cook never adopts a temporary detail count.

Known-to-unknown fixture correction must align detail and dated projection owners and wait for the new identity; the older retry-pass did not prove a prior-recipe leak. Retain original-identity, pending, stale/error and no-write assertions.

## User Experience
Use current Solar Earth controls and EN/FR labels, visible focus, keyboard menu/focus return, pressed preview state, scoped status/error, 48 CSS px targets and one return. Review 320/390 phones, 834 tablet, short height and 200% text, with Notes/footer clearance. Source boards and proposed composition are not rendered or physical-device acceptance.

## Compatibility, Rollout and Reversal
Existing DTOs, storage, parsers and projection algorithm remain unchanged. Home adds an existing read, not a write. Revert presentation/client wiring to reverse this stage; no data rollback is required for these changes. Ordinary release procedures may still run existing migrations/activation writes and require their own operational review. Stage 2 is not a prerequisite; stage 3 is deferred. See [stage map](scope-stages.md).


## Apply checkpoint — 2026-11-06

Alex authorized applying stage 1 on the checked-out `recipe-view-redesign` branch, PWA deployment to non-production DV, then spec synchronization/archive only after tests pass and the new version is visibly confirmed. No storage/migration, ingredient repair, production tests, push or merge is included. Existing dirty recipe-detail/planner changes were captured under `/tmp/wfs-quiet-before/` before edits and are preserved.

Home's component/browser tests observed original source amounts instead of the required dated 600 g before wiring the existing projector. Subsequent regressions established red for stale cached reopen and same-key invalidation; the implementation now synchronously revokes earlier reads. Latest focused Home unit/mock acceptance: 95 passed; latest affected Home browser acceptance: 4 passed; full Home 59 passed before the last race fix, so final impact verification must requalify the integrated identity.

Detail's new unit cases observed three intended failures (persistent basis exposition, repeated dated context, saved-effect hint outside the editor); new browser expectations observed two intended failures, with 52 unaffected cases passing. After bounded presentation changes, 114 detail/menu tests and all 54 ingredient-preview/detail-layout browser cases pass. Dedicated context coverage retains dated-five versus original-four preview, factor-one honesty, frozen prepared-seven facts, known grocery-source date, single count/list/return, focus transfer and no writes. Raw logs are copied under `.task/quiet-recipe-portions/`.

The first focused PostgreSQL run executed 16 passing cases with zero skips but was invalidated by concurrent source edits. This is provisional execution evidence, not passing final verification. Real live Home/Cook and responsive saved-basis qualification, final stable-source database/repository checks, constrained bilingual render review and DV visibility remain to reconcile before completion. Physical-device/native-keyboard/screen-reader acceptance remains untested.


### Real-seam acceptance

Both explicitly required live tests passed with zero skips: `WFS_CALENDAR_LIVE=1 task test:api -- --filter FullyQualifiedName~LiveBrowser_IngredientPreviewReadOnly` and `WFS_CALENDAR_LIVE=1 task test:api -- --filter FullyQualifiedName~LiveBrowser_RecipeServingsGeneratedClientAndResponsiveHeadings`. Each executed one xUnit and one inner Playwright test against the real generated client/API and disposable PostgreSQL. Preview verified Home/Cook 600 g agreement, wrong-occurrence 409, unchanged recipe/plan/preparation/grocery/check/workflow snapshots, shells 18/onion 1.5/beef 675 g/sauce 750 ml at six, original seasonings, saved five and frozen seven. The initial preparation-status strict locator was ambiguous between Planner and detail; scoping it to detail corrected the test without a product change.

`task test:database -- --filter FullyQualifiedName~SupperIngredientPreviewPostgresTests` passed all 16 cases with zero skips and stable source identity `7c56dffa71949fcb5cbb8eb1f1a0bf70d24d3a39a051ee69ed012e49657f0fb5`. Its invocation record is `.task/database-tests/runs/c6a3a3451ee1458fb83c056cd790158d/result.json`. Disposable test databases and live API/PWA servers were removed; the owned synthetic PostgreSQL container is temporarily retained for the broad final gate. Logs/TRX and settled, visibly readable Home/Cook screenshots are under `.task/quiet-recipe-portions/live/`.

The focused bilingual review passed 22 cases, including default/preview/original/return at 320/390/834 CSS px, short height and 200% text, unknown/unresolved contexts and editor recovery. Fixture corrections made detail/projection identity coherent; the prior known-to-unknown fixture accidentally selected a known-four recipe. Final tests wait for the exact new response and recipe name, retaining pending/no-write/old-identity guards. Additional prepared/error/grocery/editor rendered evidence is being reconciled before the final gate. The private screenshot/geometry directory is `.task/quiet-portions-browser-final/`.


### Constrained rendered review and scope

The representative exceptional-state run passed 8/8 with zero skips against the immutable production image on isolated port 3345. Both EN/FR cover preview/original at 320 CSS px and 200% text, prepared-seven versus preview-six, genuine dated/preview read failure and retry, unknown basis plus invalid/failed editor at 834/200%, and grocery-original review at 320/200%. `.task/quiet-portions-exceptional-render-final/` contains 46 screenshots and 18 persisted geometry JSON files. The existing passed 54-case detail-layout/preview suite and 22-case focused bilingual review cover additional 390 phone, tablet, short-height, source/Cook and editor paths. Assertions establish 48 CSS px targets, focus/keyboard return, pressed/label/error state, no horizontal overflow, Notes/footer access and read-only effects. Existing default/Cook material tests establish their measured contrast; exceptional screenshots were visually reviewed without per-state numeric contrast ratios. This is representative constraint/state coverage, not a complete Cartesian matrix or physical-device certification.

Scope review compares overlapping files against `/tmp/wfs-quiet-before/` as well as Git. Production changes are limited to Home's shared read owner, detail presentation/menu/focus and EN/FR copy; tests/visual documentation support those behaviors. Existing dock/Similar/rating/planning changes are preserved. No DTO, OpenAPI, persistence, parser, provider or grocery algorithm changed. The independently requested structured-editor planning refinement is separate and not an implementation prerequisite. No production tests/data mutations, commit, push or merge occurred.


### Comprehensive feedback before final verification

The first full Vitest feedback run found three stale route-level assertions for the deliberately removed `recipe-portion-context` paragraph (1,799 passed/3 failed). Those three tests retain chosen-date/recheck/no-write/navigation guards and now assert the exact captured `getIngredientProjection` recipe/date/context call rather than the repeated paragraph. The focused Recipes route suite then passed all 74 cases. No route production logic changed. The final repository gate below must requalify the integrated source and immutable production test image after all planning writers freeze.


The broader existing supper journeys also reproduced seven failures at the intentionally removed date paragraph. Their expectations now use the existing dated Plan action for date authority, overflow for default original inspection, and unchanged ingredient/instruction content for readability geometry. Generic detail-review and ordinary instruction-scaling copy are asserted absent. All seven continuous journeys pass, retaining exact 400→600 amounts, original steps, unresolved text, no-write, assignment, grocery/check and frozen-preparation/Cook guards. Evidence: `.task/quiet-portions-supper-final/` (30 screenshots/30 metrics files) and the copied `wfs-quiet-supper-final.log`.

Final verification uses a frozen copy of the checked-out branch to isolate the separately owned planning work. It uses the immutable production PWA image on task-only port 3345 and synthetic PostgreSQL on loopback 58693, with no production/DV test data. The first copy omitted nine private visual-reference link targets; those were copied and link validation passes. The first gate's source-identity mutation was not reproduced by a full per-file unit diagnostic (1,802 passed, no file-content changes). The following gate was deliberately interrupted to reconcile the broader stale journey assertions before a final clean run. These earlier attempts are not completion evidence.


The first complete broad gate retained stable input identity and passed documentation, strict specs, lint/format/types, 1,802 unit cases and static contract/client checks. Browser results were 953 passed, 60 existing skips, one unrelated Search-animation retry-pass, and two stale fixture/expectation failures. GOTO now uses shared persisted assignment/occurrence/projection/SSE instead of an acknowledgement plus empty replay; the focused case passes, including reload. A date change now asserts that preview intent/exposition retires while a matching confirmed default stays pressed; its focused case passes. No production fix or unrelated Search test change was made.

The configured macOS broad API run exposed unsupported exact-recovery filesystem assumptions (62 failures); this was environment qualification failure, not passing evidence. Full API qualification on the repository-pinned Linux SDK passed 1,703 with zero failures and 25 existing opt-in/manual skips, including 334 non-live PostgreSQL cases with zero skips. The SDK/temporary PostgreSQL/private network were removed. Source manifest, runtime image identity, TRX, skipped names and logs are under `.task/quiet-recipe-portions/linux-api/`. The host API lane without relational opt-in and with a canonical temporary directory passes 1,400 with 284 skips; the separately executed full Linux suite supplies relational/OS qualification. The two required live API/browser seams and focused 16-case preview PostgreSQL suite remain separately zero-skip passes.


The unrelated Search-animation retry reproduced in isolation (two failures/one pass): the existing gesture test sampled two front cards during a normal exit animation. A test-only wait for one settled front card retains every subsequent swipe/visibility assertion; three isolated repetitions then passed. No Search production behavior changed. This verification-readiness correction is included in the reviewed final path set.


### Final integrated result

The final complete gate passed with stable source/runtime identity: `.task/agent-finish/runs/2d53efd2c282440cbfd6b270c7211401.json` in the frozen verification checkout; exact copied record `.task/quiet-recipe-portions/final-verification.json`. All selected documentation/spec, lint, formatting, types, unit, impact-browser, host-API and static contract/generated-client checks passed. Full unit: 1,802; browser: 956 passed, 60 existing skips, zero retries/flaky/unexpected outcomes; host API: 1,400 passed/284 skips, with full supported Linux qualification separately 1,703 passed/25 skips and 334 PostgreSQL cases passed/zero skips. The two specifically required live API/browser tests and 16-case PostgreSQL preview acceptance each passed without required skips.

The host API suite's unrelated process-environment race was isolated using xUnit's supported collection serialization, without changing/filtering tests or production logic. Runner settings and SHA proof are retained under `.task/quiet-recipe-portions/`; see [xUnit runsettings](https://xunit.net/docs/config-runsettings). Earlier failed/interrupted gates remain recorded and are superseded by this passing result. Post-build changes are acceptance fixtures/readiness only; production PWA inputs match the immutable tested image. Deployment/public visibility and lifecycle evidence follow separately.


### DV release and lifecycle

The tested PWA image `whats-for-supper-pwa:quiet-portions-20261106T211823Z` was deployed to the confirmed non-production DV PWA only. API, PostgreSQL and Traefik identities and mounts stayed unchanged; no migration or test-data mutation occurred. Public authenticated verification at https://dv.srvrlss.dev/profile/settings visibly confirmed `BUILD QUIET-1106-2118` and the quiet recipe detail UI, with zero app API writes. Deployment result, public screenshots and network evidence: `.task/quiet-recipe-portions/deployment/`.

After this passing application gate and visible DV release, the two canonical capabilities were synced (five modified requirements, one added requirement), preserving existing purposes and unrelated requirements. This change was archived on 2026-11-06. Canonical ingredient correction and selective repair remain separate planning scope. No commit, push or merge was performed. Final lifecycle documentation/spec verification is recorded separately under `.task/quiet-recipe-portions/`.
