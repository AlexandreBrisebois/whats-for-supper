# Mystery night UX follow-up — October 12, 2026

Authorization: user selected Mystery night and We made plans, then explicitly requested implementation. Task session `mystery-night-ux`, baseline `154e011410b790c64d811c640f491d63cd83ad98`, branch `codex/add-meal-planner-features`. Initial worktree was clean. Stale predecessor session metadata was cleared; no source files were reset.

## Implemented scope and review

- `requirements.md`, `design.md`: record the four choices, Mystery night helper, required family-plan description, and shared Save wording.
- `specs/openapi.yaml`: add `mystery` to the existing kind enum; no route or DTO shape changes.
- `api/database/schema.sql`, `api/database/compatibility.sql`, `api/src/RecipeApi/Data/RecipeDbContext.cs`: accept the recipe-free preset with a null custom label; compatibility widens the original constraint transactionally while preserving rows.
- `api/src/RecipeApi/Services/ScheduleService.cs`: validate the additional preset using existing persistence and occupancy behavior.
- `api/src/RecipeApi.Tests/Services/NonCookingScheduleTests.cs`: cover Mystery night through voting/lock, placement exclusion, movement, and invalid preset text.
- `api/src/RecipeApi.Tests/Integration/NonCookingPostgresTests.cs`: cover clean install and upgrading the old constraint, persisted Mystery night, and existing behavior.
- `pwa/src/components/planner/NonCookingDaySheet.tsx`: add fourth choice and helper; rename custom choice through localization; use shared Save; retain existing custom draft/focus/validation and default selection.
- `pwa/src/components/planner/NonCookingIcon.tsx`, `pwa/src/lib/planner/nonCooking.ts`: shared sparkles icon and localized Mystery night label for planner/Home.
- `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`: preset, helper, We made plans, and Tell the family the plan copy. Existing keys/test IDs retained.
- `pwa/src/components/planner/NonCookingDaySheet.test.tsx`, `pwa/src/lib/planner/nonCooking.test.ts`, `pwa/src/app/(app)/planner/page.test.tsx`: focused interaction, bilingual copy, draft, save payload, and saved-icon regressions.
- `pwa/e2e/planner-non-cooking-days.spec.ts`: add Mystery night to persistence/voting/lock/reload and local-date Home scenarios.
- `pwa/src/lib/api/generated/models/index.ts`, `pwa/src/lib/api/generated/kiota-lock.json`: user-generated contract closure, reviewed to contain only the Mystery member and updated description hash.
- This evidence, task evidence link, and task-specific HANDOVER entry: preserve incomplete verification and exact next steps.

No recipe, voting, grocery, or movement policy changes. The shared store/SSE and existing mock mutation handler already carry the plan object and need no preset-specific mutation code. Existing outer action-menu label remains unchanged; the custom choice inside the detail sheet is We made plans. User completed `task gen:client` locally. Reviewed generated changes: only the new Mystery enum member and Kiota description hash.

## Verification

- **Passed:** new UI/copy/display tests failed before implementation (four failures), then all 35 affected PWA tests passed after final formatting/copy assertions. Full PWA suite: 719 passed before the last French assertions and formatter-only edits. Targeted ESLint passed; diff whitespace, static route/mock reconciliation, DTO schema drift, and mock GUID checks passed.
- **Compiled:** API application and test assembly built. Initial test-authoring compilation error was corrected; no backend test pass is claimed.
- **Blocked:** VSTest cannot bind its communication socket (permission denied); focused backend tests aborted before execution. Playwright cannot start Next.js on 127.0.0.1:3000 (EPERM), so browser tests did not execute. Canonical lint is also blocked by the .NET formatter’s named-pipe permissions; targeted PWA ESLint passed. Live endpoint parity cannot reach 127.0.0.1:5001 in the sandbox. Real PostgreSQL tests lack `WFS_TEST_POSTGRES_CONNECTION` and cannot be qualified here.
- **Resolved:** sandbox `task gen:client` exceeded its 20-second limit; user ran it locally. Generated files reviewed and no hand edits made.
- **Passed after local generation:** `npm run typecheck`; fresh full `npm run test:unit`: all 719 tests passed with the generated client present. The earlier missing-enum type failure is resolved.
- **Not run:** canonical `task agent:prepare` and `task agent:finish`; preparation and the remaining completion checks require local execution due to the documented sandbox generator/formatter/socket restrictions. No migration applied, commit, merge, or deployment performed.

## Local completion

From the repository root, run `task agent:prepare`, review its generated/formatted delta, then `task agent:finish`. Prepare includes client generation. Run `npm --prefix pwa run test:e2e -- e2e/planner-non-cooking-days.spec.ts --reporter=list` for explicit feature acceptance. Qualify the existing clean-install/upgrade PostgreSQL tests with an isolated test admin connection, and live endpoint parity against the intended API. Preserve other work and record actual results before marking this follow-up complete.

## Home Mystery night behavior correction

User explicitly requested the same Home pivot card as an empty night. `HomeCommandCenter.tsx` now renders the existing TonightPivotCard for recipe-free Mystery night and omits the compact saved-plan card. It passes normal GOTO/Quick Find/Ordering In callbacks without the non-cooking label that would suppress GOTO content. Planner occupancy and persisted metadata are unchanged; existing explicit assignment handles replacement. No backend or API change is needed for this follow-up. Sparkles remains the Mystery night icon on the planner and detail sheet.

`HomeCommandCenter.test.tsx` adds a regression proving the pivot renders and Quick Find opens without clearing the preset; it failed before the rendering change and passed afterward. Browser local-date/reload coverage in `planner-non-cooking-days.spec.ts` now expects the pivot for Mystery night and the saved-label card for other presets. Requirements/design reflect the Home exception.

Passed on the corrected content: 25 focused Home tests, all 720 PWA unit tests, typecheck, targeted ESLint, formatting and diff whitespace. Browser execution and canonical prepare/finish remain locally required under the previously recorded sandbox restrictions. Private scope hashes refreshed for the same task session.
