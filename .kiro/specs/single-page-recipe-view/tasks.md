# Recipe on one page — Tasks

**Status:** Tasks 1–4 approved for coupled implementation on 2026-09-30

**Requirements:** [requirements.md](requirements.md)

**Design:** [design.md](design.md)

## Task 1 — Preserve source identity while parsing

Add failing parser tests for flat strings, HowToStep objects, and structured
sections, then expose enough stable source identity to update the displayed step
without changing its normalized display contract.

## Task 2 — Share Cook's Mode behavior and add the boundary

Add failing component tests, extract shared preparation/editing/completion behavior,
and select the focused or single-page instruction presentation through the approved
feature hook only after preparation.

## Task 3 — Implement the single-page experience

Render ordered steps in one scrolling surface within the current responsive shell.
Implement per-row accessible edit, Save, Cancel, inline failure, Retry, live success,
issue reporting, and Done behavior without losing scroll or checklist state.

## Task 4 — Acceptance and rollout evidence

Exercise flag `off`, `opt-in`, and `on`; run focused unit/E2E checks; capture phone
and iPad landscape screenshots; and record rollback to the focused-step path. Do not
graduate or delete the legacy path in this task.
