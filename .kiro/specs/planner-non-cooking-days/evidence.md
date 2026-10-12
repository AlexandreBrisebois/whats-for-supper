# Issue #214 implementation evidence — October 11, 2026

Implementation is reviewable but acceptance is incomplete. NCD-T0 is accepted; NCD-T1–T3 remain unchecked. All Draft/VotingOpen/Locked states are allowed. No capability baseline is promoted, and the feature delta remains uncommitted; the user-requested integration merge is recorded below. Nothing was pushed or deployed.

## Baseline and preservation

Session `NCD-IMPLEMENTATION`, branch `codex/add-meal-planner-features`, baseline HEAD `afdcdf7fb5f3f77728c2e80a8d799e40e76c9d1a`. The predecessor SPEC-214 session and its documentation delta were preserved under ignored `.task/ncd-implementation/predecessor-spec-214/` before retiring only its metadata. Implementation began against a fresh product-code baseline. Five specification/index/registry paths were already dirty. Their private baseline copies were compared: existing drafting remains; subsequent changes record implementation authorization, resolved Q1 and evidence. Session timing alone does not prove writer ownership.

The user-requested merge of `codex/fix-meal-plan-remove-ordered-in` is now present at HEAD `55162d7a1437d11eccd4cde4d9a4a007adda99a1` (target `318d851a02b04d3dde836389aebb90cbd4ed9876`). The original implementation session is preserved under `.task/ncd-branch-merge/pre-merge-session/`; active session `NCD-IMPLEMENTATION-AFTER-MERGE` uses the merged HEAD as its implementation baseline. The merge helper records successful preparation and retained recovery stash; the feature/specification delta remains visible. Prior PWA results below predate this merge and do not establish final merged acceptance.

## Local API failure follow-up

The user ran `task review` after merging/preparing: 908 API tests, 869 passed, one failed, 38 skipped. The single failure was the non-cooking HTTP conflict assertion expecting top-level `status`. `SuccessWrappingFilter` inspected the default HTTP 200 before MVC applied `ConflictObjectResult.StatusCode`, incorrectly wrapping the approved 409 error in `data`. A focused direct filter assertion reproduced the bug before implementation. The one-line fix selects the result status first, with the existing HTTP status fallback. It restores the filter's documented successful-2xx-only rule; no approved contract or scheduling rule changed. Existing filter exclusions remain unchanged.

Nine direct filter cases now pass (400/404/409/500 unwrapped; 200/201 wrapped; explicit result status precedence; null-result-status fallback). The 20 direct in-memory service assertions also pass after the merge. These supplemental checks bypass testhost and do not establish canonical HTTP or database acceptance. HTTP regression assertions now require the success `data.mealMarkedCooked` envelope and top-level 400/409 bodies. A local `task test:api` rerun is required; sandbox testhost socket restrictions prevent that qualification here.

## Commit-hook browser failure follow-up

The user supplied the October 11 local commit-hook output: API lint/tests, schema/mock drift, Kiota sync, PWA lint/types, all 684 units in 74 files and production build passed. Playwright reported 212 passed, 10 failed and two skipped. This is user-run automated evidence, not real PostgreSQL/live-client qualification. The hook also reported modified files; existing staging is preserved and no commit or staging was performed here.

One Home cooking test asserted the pre-merge `{ status: 2 }` request and returned no `mealMarkedCooked`. Updated that boundary to require the approved recipe ID and return `mealMarkedCooked: true`, retaining cooked-state, reconnect and reload assertions. All nine feature-browser failures stopped at the missing planner controls; saved snapshots show the member-selection screen. Added the same selected-member cookie/storage setup used by the existing planner suite. The feature helper now replays its mutable saved schedule in connected SSE frames and returns `mealMarkedCooked: false` for non-cooking saves, keeping REST/reconnect state and the merged success envelope consistent. No application or authentication policy changed.

The agent reran all 684 PWA units after the merge, plus typecheck, PWA lint/format and all 105 harness tests: passed. Changed browser sources were formatted and mock-ID/static checks passed. Playwright collection succeeds for all 21 affected tests; collection is not execution. The failed-save alert locator is scoped to its sheet to exclude the Next.js route announcer. Corrected Playwright execution remains pending the requested local `CI=true task test:e2e:ci -- e2e/home-recipe.spec.ts e2e/planner-non-cooking-days.spec.ts`; sandbox server restrictions still prevent qualification here.

The user subsequently authorized registering `pwa-install-identity`. Added only its in-progress feature registry entry and rendered the index; global `task spec:check` now passes. The earlier unregistered-package failure below is historical and resolved, not a current blocker. This does not accept identity ID-T4.

## Home saved-plan rendering follow-up

The user's rebuilt affected-browser run now reports 20 passed and one failed in 25.5 seconds. Cooking completion and the eight other non-cooking cases pass. The remaining Home case saves successfully in Planner but cannot find the primary Home label. The saved Home snapshot contains only capture/library links. Source inspection confirms an application defect: the label prop was passed to TonightPivotCard inside a condition that excludes skipped/completed days, so that label was unreachable.

Four new HomeCommandCenter regressions (Ordering In, Eating out, both custom messages) failed before the fix. Home now renders a recipe-free skipped plan through the existing TonightCardBase and label helper, with two-line primary text and native details for the full message. Existing meal/GOTO/recovery conditions remain. Tests retain the real card surface and assert the message plus absence of recovery/meal controls. Afterward, all 688 PWA units in 74 files, typecheck, PWA lint/format and diff whitespace pass. A refreshed local production-browser run was requested; final Home/reload acceptance remains pending. No API contract, store algorithm or scheduling behavior changed in this correction.

## Actual results

| Status | Command/check | What it established |
|---|---|---|
| Passed | User ran `dotnet tool restore` and `task gen:client` locally | User-confirmed generation; generated models/error serializers contain the approved metadata. Not a formal zero-drift check. |
| Passed | `npm --prefix pwa run test:unit` | 674 tests in 73 files; final invocation used `task test:unit`. Existing regression tests retained. |
| Passed | `task typecheck` | Consumer/generated-model types. |
| Passed | `task format:check:pwa` | Full PWA formatting after scoped fixes; no unrelated formatting repair. |
| Passed | `task lint:pwa` | Full PWA lint after correcting a render-time ref write. |
| Passed | `dotnet build api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore -m:1 -nodeReuse:false -p:UseSharedCompilation=false --verbosity quiet` | API and test source compilation. Existing DemoModeOptions/DemoWorkflowSeeder CS8602 warnings remain. |
| Passed, supplemental | `.task/ncd-direct-runner/Runner.csproj`, run with shared compilation disabled | 20 direct in-memory service cases: three lifecycle states; three drag kinds; four invalid payloads; Unicode limits; assignment/legacy requests; entity serialization; recipe conflict; all-marked week; push; full fallback; cross-week; defer; Sunday displacement. This bypasses the canonical testhost. In-memory transaction warnings are ignored in this fixture; no transaction/durability qualification is claimed. |
| Passed | `task spec:check -- planner-non-cooking-days` | Selected package registration and links. |
| Passed | `task agent:reconcile`, `task agent:drift:schemas`, `task agent:drift:mocks`, `git diff --check` | Static route, DTO, GUID-pattern and whitespace checks only. |
| Failed earlier, now passed | `task spec:check` | The pre-existing missing `pwa-install-identity` entry was verified first; user later authorized its registration. Global registry validation now passes. |
| Failed then corrected | Focused PWA red assertions | Smart-default overlay, Home/custom metadata, stale SSR metadata, late empty SSR after an SSE plan, fallback image and legacy recipe-backed conversion boundary failed before their targeted fixes. The final full suite passes. One added SSE test initially had the wrong existing two-argument call expectation; corrected the test without changing the stream protocol. |
| Failed then corrected | Direct defer characterization | The in-memory fixture initially rejected the existing defer transaction. Configured its established in-memory transaction-warning seam; direct cases then passed. No production defer change. |
| Blocked | `task lint` | API formatter’s restore failed with NU1301 because this session cannot resolve/reach NuGet. PWA lint passes independently; no full lint pass. |
| Blocked | Focused canonical `dotnet test` | Testhost socket creation returned `SocketException (13): Permission denied` before assertions ran. No canonical API pass. |
| Blocked | `task test:e2e -- e2e/planner-non-cooking-days.spec.ts` | Next server could not listen on `127.0.0.1:3000` (`EPERM`). The nine added browser cases are not qualified by unit results. |
| Blocked | `task agent:drift:endpoints` | Live `127.0.0.1:5001/openapi/v1.json` request returned operation-not-permitted. Static parity does not replace it. |
| Not run to completion | Direct TestServer/Management backup follow-up | Fixture initialization did not complete in this session. No HTTP or ManagementService backup pass claimed. Canonical test sources compile. |
| Passed before the filter follow-up | Local merge helper `task agent:prepare` | Private integration record is `prepared` at merged HEAD. Further filter/test changes require refreshed preparation before finish. |
| Failed, user-run | `task review` → `task test:api` | Post-merge API: 869 passed, one failed, 38 skipped out of 908. Conflict error envelope failure diagnosed and fixed; full rerun pending. |
| Passed, supplemental | Direct filter/service runner after the merge | Nine filter cases and 20 service cases pass; canonical testhost/HTTP/database qualification remains outstanding. |
| Not run | `task agent:finish` | Must follow successful preparation and final scope review; no implementation finish success is claimed. |
| Blocked / not run | Real PostgreSQL qualification | No isolated `WFS_TEST_POSTGRES_CONNECTION` was configured. Added opt-in clean/upgrade/idempotence, SQL-constraint, lock/swap and coordinated duplicate-insert cases; source compilation is not execution. |
| Not run | Live multi-browser acceptance | Shared slot/connected/week metadata has unit coverage; actual two-client editing/replacement/reconnect remains unverified. |
| Not applicable | New movement-conflict rules, dependencies, deployment, ManagementService serializer changes | None introduced. Entity serialization reuses the existing backup representation. |

## Acceptance still required

Run from repository root:

```sh
task agent:prepare
task agent:session:status
task agent:finish
```

The local finish includes canonical API tests, browser impact tests and contract/client checks. For explicit feature-browser evidence:

```sh
task test:e2e -- e2e/planner-non-cooking-days.spec.ts e2e/planner.spec.ts e2e/planner-full-cycle.spec.ts
```

For database acceptance, supply `WFS_TEST_POSTGRES_CONNECTION` for a **disposable PostgreSQL instance** whose admin can create/drop isolated test databases, then run `task test:api`. The new fixture creates uniquely named `wfs_noncooking_*` databases and drops only those databases. Do not apply migrations or reset a shared database merely to run this test. Separately run `task agent:drift:endpoints` against the current API/schema, and verify a saved custom plan, label edit, explicit replacement and reconnect in two real browser clients. Record environment/source identity and results separately from mocked checks.

Implementation and focused coverage remain incompletely accepted: NCD-01/02/04 need browser UI/action/lifecycle qualification; NCD-03/05 need reload and shared-client acceptance; NCD-06 needs canonical lifecycle and real database results; NCD-07 needs canonical existing movement/recovery/grocery/backup regression results; NCD-08 needs canonical HTTP conflict/rollback and real concurrency evidence. Navigation during save, remote-assignment conflict, and action availability in all three states have passing planner unit coverage; browser qualification remains outstanding. Do not infer passing acceptance from the supplemental runner.

## Specification reconciliation

Design now records the integrated `recipeId`/`mealMarkedCooked` cooking contract and successful-only response-filter correction. Tasks distinguish implemented work from acceptance still required; registry/index next action is verification. Requirements and capability baselines retain their existing status because no new final acceptance evidence was supplied. These documentation updates do not establish runtime completion.

## Per-file rationale

| File | Why the task needs the change |
|---|---|
| `.kiro/specs/SPEC_INDEX.md` | Regenerated only this package’s next action after Q1/implementation authorization; preserves the pre-existing index delta. |
| `.kiro/specs/planner-non-cooking-days/design.md` | Records authorization/Q1, integrated cooking-result compatibility and error-envelope ownership; preserves accepted reuse and movement boundaries. |
| `.kiro/specs/planner-non-cooking-days/evidence.md` | Separates actual checks, remaining acceptance and per-file scope rationale. |
| `.kiro/specs/planner-non-cooking-days/requirements.md` | Records accepted lifecycle policy; removes stale Q1 blocking wording while preserving the drafted requirements. |
| `.kiro/specs/planner-non-cooking-days/tasks.md` | Separates implemented work per task from required acceptance without completing unverified tasks. |
| `.kiro/specs/spec-registry.yaml` | Updates this package’s next action to verification and adds the separately user-authorized pwa-install-identity registration; no identity acceptance promotion. |
| `api/database/compatibility.sql` | Idempotently adds nullable fields and their constraint for existing installs; no database applied here. |
| `api/database/schema.sql` | Defines nullable metadata and constraint for fresh installs. |
| `pwa/e2e/home-recipe.spec.ts` | Aligns the observed failing cooking mock/request assertion with merged recipe-specific completion; retains reconnect/reload coverage. |
| `api/src/RecipeApi.Tests/Infrastructure/SuccessWrappingFilterTests.cs` | Protects top-level errors, successful envelopes and result-status precedence after the actual HTTP regression. |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | Uses the MVC result status before the default HTTP status so the approved non-cooking 409 remains top-level; existing skip rules preserved. |
| `api/src/RecipeApi.Tests/Infrastructure/SseEventPublisherTests.cs` | Asserts the server slot frame contains custom metadata. |
| `api/src/RecipeApi.Tests/Integration/ManagementBackupIntegrationTests.cs` | Exercises actual ManagementService custom backup/restore and old missing-field artifacts without serializer edits. |
| `api/src/RecipeApi.Tests/Integration/NonCookingPostgresTests.cs` | Opt-in isolated clean/upgrade/idempotence/constraint/locking/swapping/concurrent-insert qualification. |
| `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs` | Adds real TestServer HTTP round-trip/400/409 and recipe-preservation assertions; prior tests retained. |
| `api/src/RecipeApi.Tests/Services/NonCookingScheduleTests.cs` | Adds focused lifecycle/kind/validation/occupancy/backup-entity and movement-parity assertions. |
| `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs` | Updates the existing fake publisher signature; existing assertions remain. |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | Maps only non-cooking validation conflicts to the approved 409 response. |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | Mirrors the SQL metadata constraint in the existing event mapping. |
| `api/src/RecipeApi/Dto/NonCookingPlanDto.cs` | Defines the approved reusable kind/custom-message representation. |
| `api/src/RecipeApi/Dto/ScheduleDays.cs` | Adds optional metadata to the existing schedule-day response. |
| `api/src/RecipeApi/Dto/ValidationDto.cs` | Adds optional metadata to the existing validate request; old callers remain valid. |
| `api/src/RecipeApi/Infrastructure/IScheduleEventPublisher.cs` | Extends the existing slot publication with optional metadata. |
| `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs` | Serializes the same metadata in slot updates. |
| `api/src/RecipeApi/Models/CalendarEvent.cs` | Persists two optional fields; existing backup serialization includes them. |
| `api/src/RecipeApi/Services/NonCookingPlanConflictException.cs` | Provides a narrow validation conflict type without changing movement/assignment errors. |
| `api/src/RecipeApi/Services/ScheduleService.cs` | Validates/persists/projects labels, preserves recipe-free skipped locking, swaps metadata and clears assignment destinations; retains scheduling algorithms. |
| `pwa/e2e/mock-api.ts` | Adds a separate stateful approved schedule boundary for feature cases; existing global handlers retained; scoped formatting included. |
| `pwa/e2e/planner-non-cooking-days.spec.ts` | Adds nine save/vote/lock/reload/clear/failure/draft/drag/Home browser scenarios with fixed dates. |
| `pwa/src/app/(app)/home/page.tsx` | Passes persisted metadata from SSR to the existing initializer. |
| `pwa/src/app/(app)/planner/page.test.tsx` | Protects legacy recipe-backed recovery, all-state action availability, late navigation response and conflict refresh/draft preservation. |
| `pwa/src/app/(app)/planner/page.tsx` | Adds date-bound management callbacks and primary labels, preserves past-week/recipe-backed boundary, guards late response reconciliation. |
| `pwa/src/components/TodayStoreInitializer.tsx` | Seeds approved optional metadata alongside existing SSR state. |
| `pwa/src/components/home/HomeCommandCenter.tsx` | Displays recipe-free skipped plans in the reused card surface; derives primary/full copy from today’s existing store without exposing recovery actions. |
| `pwa/src/components/home/HomeCommandCenter.test.tsx` | Reproduces unreachable saved-plan display for all choices and protects existing meal/recovery conditions. |
| `pwa/src/components/home/TonightPivotCard.test.tsx` | Protects custom primary text and absence of fallback recipe image. |
| `pwa/src/components/home/TonightPivotCard.tsx` | Shows primary/full plan message, suppresses fallback recipe presentation for marked days and reuses shared order-in copy. |
| `pwa/src/components/planner/NonCookingDaySheet.test.tsx` | Checks draft preservation, preset-only submission, invalid input and failed-save retention. |
| `pwa/src/components/planner/NonCookingDaySheet.tsx` | Implements the three choices, retained draft, Unicode validation, single-submit/error handling, clear and focus behavior. |
| `pwa/src/components/planner/PlanningPivotSheet.tsx` | Offers the optional empty-day/edit-plan tile within the existing sheet. |
| `pwa/src/hooks/useScheduleStream.test.ts` | Checks metadata propagation and updates one existing payload expectation without weakening it. |
| `pwa/src/hooks/useScheduleStream.ts` | Propagates approved metadata through connected, slot and whole-week events to both stores. |
| `pwa/src/lib/api/generated/api/schedule/day/item/validate/index.ts` | Calculated Kiota-generated closure of the approved contract; no hand-edited client definitions. |
| `pwa/src/lib/api/generated/kiota-lock.json` | Calculated Kiota-generated closure of the approved contract; no hand-edited client definitions. |
| `pwa/src/lib/api/generated/models/index.ts` | Calculated Kiota-generated closure of the approved contract; no hand-edited client definitions. |
| `pwa/src/lib/api/planner.ts` | Reuses generated validate operation for a labeled save. |
| `pwa/src/lib/planner/nonCooking.ts` | Centralizes preset/custom display including the shared home.orderingIn key. |
| `pwa/src/lib/planner/slotAssignment.test.ts` | Protects skipped-slot occupancy. |
| `pwa/src/lib/planner/slotAssignment.ts` | Excludes status-3 days from automatic first-open selection. |
| `pwa/src/locales/en/common.json` | Adds only the feature’s sheet/action/error translations; existing shared order-in key retained. |
| `pwa/src/locales/fr/common.json` | Adds matching French feature translations; shared Commander wording retained. |
| `pwa/src/store/todayStore.test.ts` | Checks shared custom text, replacement clearing and optimistic/authoritative snapshot preservation against late empty SSR. |
| `pwa/src/store/todayStore.ts` | Carries/clears metadata with existing status, sync, replacement and optimistic initialization guards. |
| `pwa/src/store/weekStore.dragDebounce.test.ts` | Checks custom-message swap and existing failure rollback of both slots. |
| `pwa/src/store/weekStore.test.ts` | Protects against stale smart defaults overwriting a marked date. |
| `pwa/src/store/weekStore.ts` | Reserves skipped dates, carries authoritative metadata and clears it on replacement; whole-object drag/rollback retained. |
| `specs/openapi.yaml` | Approved optional DTO/event/request metadata and validate-only 400/409 contract before consumers. |
| `HANDOVER.md` | Adds only this task’s resume checkpoint; preserves other tasks and pre-existing conflict text. |
