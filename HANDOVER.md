# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **Planner E2E Suite Stabilized.** 9/9 tests in `planner.spec.ts` pass deterministically. Regressions regarding timezone rollback, nested data envelopes, and clock/mock drift are memorialized in **ADR 034**.

2. **Phase 14 UX Hardening Complete.** All Cook's Mode interactions, finalization logic, and social planner transitions are verified. Ready for Phase 15.

3. **Phase 13 F3 Smoke Test (Recipe Agent).** `SynthesizeRecipeProcessor` is wired. Manual verification of synthesis status transition ('pending' -> 'ready') is recommended.

4. **`SmartPivotCard` cleanup.** Deferred but tracked. Remove from `HomeSections.tsx`.

## Standing Notes

- **ADR 034 Enforced.** All time-sensitive E2E tests must use `page.clock.setFixedTime` and hardcoded mock dates.
- **Strict Data Enveloping.** Nested entities (Recipe, Votes) must use `{ data: { ... } }` to avoid Kiota union deserialization failure (dumping into `additionalData`).
- **UTC-Only Discipline.** Do not use local date methods on ISO strings.
