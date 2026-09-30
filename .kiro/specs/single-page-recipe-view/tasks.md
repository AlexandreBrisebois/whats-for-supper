# Recipe on one page — Tasks

**Status:** Tasks 1–4 approved for coupled implementation on 2026-09-30

**Requirements:** [requirements.md](requirements.md)

**Design:** [design.md](design.md)

## Task 1 — Preserve source identity while parsing

Add failing parser tests for flat strings, HowToStep objects, and structured
sections, then expose enough stable source identity to update the displayed step
without changing its normalized display contract.

**Test seam:** parser unit suite; no browser mock change is expected unless the
displayed recipe contract changes.

## Task 2 — Share Cook's Mode behavior and add the boundary

Add failing component tests, extract shared preparation/editing/completion behavior,
and select the focused or single-page instruction presentation through the approved
feature hook only after preparation.

**Test seam:** Cook's Mode component suite plus the feature-flag API mock in
`pwa/e2e/mock-api.ts`; `GET /api/feature-flags` supplies the effective-state
snapshot used by the Playwright scenario.

## Task 3 — Implement the single-page experience

Render ordered steps in one scrolling surface within the current responsive shell.
Implement per-row accessible edit, Save, Cancel, inline failure, Retry, live success,
issue reporting, and Done behavior without losing scroll or checklist state.

**Test seam:** in-place save uses the existing recipe-update API mock in
`pwa/e2e/mock-api.ts`; the Playwright scenario must exercise success and failed save
responses without bypassing the component boundary.

## Task 4 — Acceptance and rollout evidence

Exercise flag `off`, `opt-in`, and `on`; run focused unit/E2E checks; capture phone
and iPad landscape screenshots; and record rollback to the focused-step path. Do not
graduate or delete the legacy path in this task.

**Test seam:** extend the Cook's Mode Playwright spec or add one dedicated scenario;
use `mockFeatureFlags` for all three modes, the standard recipe-update mock for save,
and a test-local failed-save route. Expected feature snapshot envelope is
`{ data: FeatureFlagDto[] }`; update the mock owner with the contract task, before
the browser scenario is run.
