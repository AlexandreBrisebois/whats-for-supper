# Proposal

> **Delivery baseline — 2026-11-10:** Baseline qualification dependency, coordinated with the existing CI writer. Keep local and hosted evidence tied to their candidates. Focused worker passes do not replace integrated release acceptance, and historical failure descriptions below are not proof of the current failure cause. See the [release scope and agent coordination](../canonical-ingredient-correction/proposal.md#dependable-portions-delivery-baseline--accepted-2026-11-10).

## Why

CI run [42383870083](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/42383870083), commit `e504e820a67bf25e5849157a1017aad54e7ff392`, passed static/unit/build checks but failed nine browser cases across planning and recipes, with two additional retry passes. Local commands can select fewer scenarios, start development mode despite a CI-parity name, or test an external image whose identity/configuration differs from the pushed build.

## Outcome and Scope

Provide a trustworthy local production-browser gate and repair the reported scenarios against existing cooking, recipe-library and supper-servings behavior. Completion requires the same committed candidate, selected suites and effective build configuration to pass locally and on hosted CI, with failures and retries reported honestly.

This is tooling and regression repair, not a new product contract. Preserve cooking recovery/no-blind-replay semantics, keyboard access, exact dated portions and original/preview behavior. Preserve the concurrent `correct-cooked-portions-baseline` change and other dirty work. No backend policy changes, automatic push hooks, deployment, merge, publication or archive are included. A repair requiring a product/API requirement change must be separately scoped before that dependent implementation.

## What Changes

- Reproduce the exact failing scenarios against a fresh production build, distinguish application defects from fixture/readiness defects, then fix each supported cause with focused regression evidence.
- Reuse `check:push`, `check:push:pwa` and the existing CI capability inventory; align misleading CI-named entrypoints and the narrower development impact selector with their documented guarantees.
- Share the production E2E build/runtime configuration across local and CI invocation instead of maintaining drifting environment exports. Keep the CI build-once/matrix structure.
- Record candidate/build identity, selected suites, effective non-secret configuration, runtime/tool versions and per-suite outcomes. Reject unrelated external builds or occupied ports as parity evidence.
- Qualify the repaired cases without retries, then the complete selected capability suites, then the full mocked-browser inventory and hosted CI on the same final commit.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `skip_specs: true` applies because approved product requirements remain unchanged; repairs restore existing behavior and tooling checks. No delta specs are invented for this change.

## Impact

Primary owners: `Taskfile.yml`, `pwa/package.json`, `pwa/playwright.config.ts`, `scripts/ci/select-e2e.cjs`, `scripts/ci/e2e-suites.cjs`, `scripts/agent/test_ops.py`, `scripts/agent/push_guard.py`, `.github/workflows/validate.yml`, and their existing regression tests. Reuse or extract a small runner/configuration owner only where callers share the same responsibility.

Diagnosed repair candidates: `pwa/e2e/prepared-supper.spec.ts`, `pwa/e2e/quiet-portions-layout.spec.ts`, `pwa/e2e/supper-servings-context.spec.ts`, `pwa/e2e/mock-api.ts`, `pwa/src/components/planner/CooksMode.tsx`, `pwa/src/components/recipes/RecipeDetailSheet.tsx` and `ActionGearMenu.tsx`. Candidate ownership is not a finding that every file needs editing. Update `LOCAL_DEV_LOOP.md` and applicable harness guidance with the final command semantics.
