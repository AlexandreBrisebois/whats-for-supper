# Tasks

## 1. Preserve supplied Tonight total duration

**Outcome and scenarios:** All scenarios of Preserve supplied Tonight total duration.
**Owners and boundaries:** HomeCommandCenter handoff, real TonightMenuCard, duration formatter and locale tables. No API/schema/persistence changes.
**Dependencies and prerequisites:** Current main, pinned tooling and synthetic fixtures; PR #339 remains separate.
**Acceptance boundary:** Real render composition with stubbed external/state boundaries; local browser route mocks only. No production, real household or model calls.

- [x] 1.1 Add Home duration composition coverage for PT6H, PT1H30M, PT45M, PT360M, missing/empty and EN/FR. Run `task test:unit -- src/components/home/HomeDuration.test.tsx` before logic edits and observe hour failures.
- [x] 1.2 Pass raw duration through Home with missing/empty compatibility; rerun the composition test green. Check raw-duration Discovery/stack/shared formatter behavior with focused existing/new coverage.
- [x] 1.3 Extend existing Home browser coverage using schedule/SSE builders for hour duration and EN/FR at iPad/iPhone/Pixel viewports; run `task test:e2e -- e2e/home-recipe.spec.ts`, inspect rendered badges, and record audit/history findings in this change.

## 2. Read-only extraction investigation

- [x] 2.1 Record photo/PDF/link/description prompt, schema, normalization, persistence and source/history evidence. Distinguish rendering regression, lack of validation and unknown stored-data accuracy; verify using source and synthetic fixtures only.

## 3. Final Integration and Verification

- [x] 3.1 Run strict OpenSpec validation, `task prepare -- <complete task paths>`, scope review and applicable `task verify -- <complete task paths>`; reconcile exact passed/failed/skipped/not-run results and record_path.

## Evidence

Planning baseline: main ba8dca21; working tree was clean. Strict planning validation and draft PR precede implementation. Source/history audit is read-only; runtime results will be recorded after execution.

Observed red: `task test:unit -- src/components/home/HomeDuration.test.tsx` failed exactly four hour cases, with ten minute/missing/null/empty cases passing. Observed green: same command, 14/14 passed. Focused Home, Discovery, stack and Quick Find tests: 64/64 passed. Real card, formatter, locale tables and motion were not mocked. Local Home browser suite: 18/18 passed, including six EN/FR viewport cases. Synthetic parser experiment: 8/8 exact-value preservation/completeness checks passed, including invalid duration strings (validation gap, not data corruption). See extraction-audit.md for read-only findings.

Rendered full-page EN/FR screenshots at 820×1180, 390×844 and 412×915 were inspected; the complete 6H badge is visible. Viewport cases use local schedule/SSE fixtures and no external recipe image. Physical devices/Safari are not qualified. An initial full verifier run (4ced163671124be6b57600c349ef76f1) stopped on input mutation after 972 passing units; browser impact/API/contracts were not run in that attempt. Vitest's first full run populated node_modules/.vitest-cache. A second full unit run passed 972/972 with an explicit source/runtime-file snapshot showing no changes. No harness gate was waived or edited. Final verification follows on stable inputs.

Stable-content verifier 86efe69eb1664ad998154a001ee6faa4 passed documentation, strict OpenSpec, lint, formatting, types, 972 units, impacted browsers (66 passed / 1 existing skipped), API tests (1,191 passed / 135 existing prerequisite/manual skips), and four static contract checks. It failed only generated-client verification because the compatible .NET 10 runtime was missing. After installing Microsoft.NETCore.App 10.0.13, `task gen:client:check` passed without generated-file changes. A final full run is required below; no waiver or source-policy change was used.

Temporary three-way source composition against PR #339 head 2378942 completed without conflict and equaled that PR's exact Home file plus this two-line duration fix. This is static compatibility evidence, not combined-branch runtime qualification.

## Workflow follow-up

- Publish the reviewed bounded diff through the GitHub connector and follow final-head CI to completion. Report the final PR/head and CI in the PR description and final response. No merge/deploy/release.

Final full application verification passed: `.task/agent-finish/runs/3605416686c045188e67aad3bf9b58e0.json`, content/runtime identity `fc514f0d10936e833f5cb9c397f5a15d3456a471e758e72f42df270b9742c04a`. Strict OpenSpec 36/36; documentation, API/PWA lint, formatting, types, 972 units, impacted browsers 66 passed / 1 existing skipped (Home GOTO reload), API 1,191 passed / 135 existing prerequisite/manual skips, and all generated-client/static contract checks passed. Test-agent harness, live endpoint and database-behavior checks were not applicable to this UI-only slice under the selector. No required check was waived. Physical devices, live database/provider qualification and production checks were not run.

Pinned runtime: Node 26.12.0, npm 11.21.1, OpenSpec 1.14.3, .NET SDK 11.0.100-rc.2.26504.105 and compatible .NET 10.0.13 for Kiota. Scope review found only the raw Home handoff, regression tests and selected OpenSpec/audit files; no dependency, contract, parser, default, copy or unrelated changes. No application source changed after the full passing run. This final task-evidence update is verified separately as documentation; final remote head and CI outcome are recorded in the PR description.
