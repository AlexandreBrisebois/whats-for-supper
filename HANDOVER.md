# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **Review the public Synology release specification**
   - The owner-approved beta deployment decisions are captured in `specs/features/public-synology-release/`.
   - Review and adjust `requirements.md`, `design.md`, `tasks.md`, and `workstream-map.md` before launching implementation.
   - The first release is `0.1.0-beta.1`; publication remains blocked on the documented release gates and requires separate explicit authorization.

2. **Complete the .NET 11 Preview 6 migration validation**
   - The working tree aligns the SDK, API and test projects, package versions, Docker images, CI workflows, debugging configuration, generated client, and engineering documentation with ADR 043.
   - Run the ADR 043 release gates: restore, vulnerability audit, contract reconciliation/drift, API tests, complete repository tests, and Docker builds.
   - Resolve only migration-caused failures; preserve unrelated working-tree changes.

3. **Reconcile generated and lock files**
   - Confirm the modified Kiota output and `pwa/package-lock.json` are deterministic results of the pinned tool and dependency versions.
   - Review the final diff for accidental generated churn before committing.

4. **Close the migration handover**
   - Record every passing or blocked gate here.
   - After all required gates pass, move the migration result to `JOURNAL.md` and leave only the next active objective.

## Standing Notes

- **Global Toast Pattern (ADR 042).** Use `addToast` from `useUiStore` for user action feedback.
- **Playwright Mock Layering (ADR 040).** Use `route.fallback()` instead of `route.continue()` for test-specific overrides.
- **E2E Route Handler Pattern (ADR 035).** Use `new URL(route.request().url())` inside handler bodies.
- **Zero Drift Doctrine.** `task gate` must pass before ending any session.
- **Known deferred E2E:** `home-goto.spec.ts` still skips the reload-after-"Make This Tonight" scenario.
