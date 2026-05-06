# Tasks: Home Recovery Flow Hardening

## Execution Rules For A Small Model

1. Work one slice at a time. Do not batch slices.
2. Do not search broadly once the slice starts. Stay inside the files listed for that slice.
3. Do not edit API contracts, generated clients, stores, planner files, or unrelated Home components.
4. The user experience must remain exactly the same. If a choice would change UX, stop and escalate.
5. After each slice, run the required validation before moving on.

## Sequential Workstream

These slices are sequential because they all touch the same seam and mostly the same files.

### 1. [ ] Slice 1 — Guardrail Characterization

Model fit: `SMALL_SAFE`

Goal:
- lock down the current Home recovery behavior before refactoring

Required context:
- `pwa/e2e/home-recipe.spec.ts`
- `pwa/src/components/home/HomeCommandCenter.tsx`
- `pwa/src/components/home/SkipRecoveryDialog.tsx`
- `.kiro/specs/home-recovery-flow-hardening/requirement.md`
- `.kiro/specs/home-recovery-flow-hardening/design.md`

Change budget:
- prefer test-only changes
- do not change runtime code in this slice unless a test is impossible to express otherwise

Tasks:
1. Confirm the existing `Pick Something Else` E2E still asserts: Recovery Flow closes, Quick Find opens, selecting a recipe reopens Step 2, and reschedule + assign both happen.
2. Add one focused test that preserves today's cancel/close behavior for Quick Find if that behavior is not already frozen.
3. Keep test IDs and visible copy assertions aligned with the current UI.

Validation:
1. `task test:unit`
2. `task agent:test:impact`

Escalate if:
- locking down the current UX requires changing the UX itself
- the correct current cancel behavior is ambiguous from code and test results

### 2. [ ] Slice 2 — Controlled Dialog Step

Model fit: `SMALL_SAFE`

Goal:
- make `SkipRecoveryDialog` controlled for step progression while preserving the same UI behavior

Required context:
- `pwa/src/components/home/SkipRecoveryDialog.tsx`
- `pwa/src/components/home/HomeCommandCenter.tsx`
- tests updated in Slice 1
- `.kiro/specs/home-recovery-flow-hardening/requirement.md`
- `.kiro/specs/home-recovery-flow-hardening/design.md`

Allowed files:
- `pwa/src/components/home/SkipRecoveryDialog.tsx`
- `pwa/src/components/home/HomeCommandCenter.tsx`
- directly impacted Home tests only

Forbidden edits:
- any store file
- any planner file
- API client or contract files

Tasks:
1. Replace child-local `step` ownership with a parent-provided `step` prop.
2. Keep the same titles, copy, buttons, test IDs, and animations.
3. Keep `HomeCommandCenter` orchestrating the same visible flow: `order_in` still advances inside Recovery Flow; `pick_else` still closes Recovery Flow and opens Quick Find.
4. Remove dead local step transitions from the dialog once the parent controls the step.

Validation:
1. `task test:unit`
2. `task agent:test:impact`
3. `task review`

Escalate if:
- this slice requires touching more than the two Home components and direct tests
- the controlled-step change alters overlay timing or dialog copy

### 3. [ ] Slice 3 — Explicit Parent Flow State

Model fit: `SMALL_SAFE`

Goal:
- collapse the Home recovery orchestration into one explicit local flow state without changing behavior

Required context:
- `pwa/src/components/home/HomeCommandCenter.tsx`
- `pwa/src/components/home/SkipRecoveryDialog.tsx`
- tests from prior slices
- `.kiro/specs/home-recovery-flow-hardening/requirement.md`
- `.kiro/specs/home-recovery-flow-hardening/design.md`

Allowed files:
- `pwa/src/components/home/HomeCommandCenter.tsx`
- directly impacted Home tests only
- one tiny local helper file under `pwa/src/components/home/` only if inline state becomes too hard to test safely

Tasks:
1. Replace scattered booleans and nullable flow fields with one local explicit recovery flow state.
2. Encode the existing visible states only: `closed`, `step1`, `quick_find`, `step2`.
3. Preserve current Quick Find cancel behavior exactly.
4. Preserve the same side-effect order for `move`, `next_week`, `drop`, and conditional `assign`.
5. Remove obsolete fields only after tests still prove the same user-visible behavior.

Validation:
1. `task test:unit`
2. `task agent:test:impact`
3. `task review`

Escalate if:
- this slice starts to pull in `todayStore`, planner code, or shared state
- you are tempted to introduce a new library or a cross-feature abstraction
- preserving the same behavior becomes impossible without clarifying a hidden UX rule

## Done Criteria

Mark the spec complete only when all of these are true:

1. `SkipRecoveryDialog` no longer owns authoritative step state.
2. `HomeCommandCenter` owns the recovery flow explicitly.
3. Current UX is preserved exactly.
4. `task agent:test:impact` passes.
5. `task review` passes.

## Notes For The Executor

1. Prefer the smallest code move that makes state ownership explicit.
2. Do not rename unrelated variables, rearrange unrelated JSX, or restyle components.
3. If you need a helper, keep it local to `pwa/src/components/home/` and keep it tiny.
4. If a slice fails validation, repair that slice before starting the next one.
