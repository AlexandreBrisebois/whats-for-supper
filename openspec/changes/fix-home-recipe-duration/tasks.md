# Tasks

## 1. Preserve supplied Tonight total duration

**Outcome and scenarios:** All scenarios of Preserve supplied Tonight total duration.
**Owners and boundaries:** HomeCommandCenter handoff, real TonightMenuCard, duration formatter and locale tables. No API/schema/persistence changes.
**Dependencies and prerequisites:** Current main, pinned tooling and synthetic fixtures; PR #339 remains separate.
**Acceptance boundary:** Real render composition with stubbed external/state boundaries; local browser route mocks only. No production, real household or model calls.

- [ ] 1.1 Add Home duration composition coverage for PT6H, PT1H30M, PT45M, PT360M, missing/empty and EN/FR. Run `task test:unit -- src/components/home/HomeDuration.test.tsx` before logic edits and observe hour failures.
- [ ] 1.2 Pass raw duration through Home with missing/empty compatibility; rerun the composition test green. Check raw-duration Discovery/stack/shared formatter behavior with focused existing/new coverage.
- [ ] 1.3 Extend existing Home browser coverage using schedule/SSE builders for hour duration and EN/FR at iPad/iPhone/Pixel viewports; run `task test:e2e -- e2e/home-recipe.spec.ts`, inspect rendered badges, and record audit/history findings in this change.

## 2. Read-only extraction investigation

- [ ] 2.1 Record photo/PDF/link/description prompt, schema, normalization, persistence and source/history evidence. Distinguish rendering regression, lack of validation and unknown stored-data accuracy; verify using source and synthetic fixtures only.

## 3. Final Integration and Verification

- [ ] 3.1 Run strict OpenSpec validation, `task prepare -- <complete task paths>`, scope review and applicable `task verify -- <complete task paths>`; reconcile exact passed/failed/skipped/not-run results and record_path. Publish the reviewed bounded diff by GitHub connector and follow final-head CI to completion. No merge/deploy/release.

## Evidence

Planning baseline: main ba8dca21; working tree was clean. Strict planning validation and draft PR precede implementation. Source/history audit is read-only; runtime results will be recorded after execution.
