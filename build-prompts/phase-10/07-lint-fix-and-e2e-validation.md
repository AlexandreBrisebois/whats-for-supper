# Prompt 07: Lint Fix & E2E Validation (Phase 10 Finalization)

**Persona**: DevOps Lead specializing in CI/CD Integrity.

**Context**:
Phase 10 E2E hardening tests (Prompt 06) are complete and all unit/integration tests pass (125/125).
However, pre-commit hook is blocked by pre-existing linting errors in other Phase 10 files.
Unblock the build pipeline, validate E2E tests against live environment, and prepare Phase 10 for merge.

**Blocking Issues**:
- Pre-existing ESLint errors in:
  - `pwa/src/components/home/HomeSections.tsx`
  - `pwa/src/components/planner/QuickFindModal.tsx` (line 100: missing `Utensils` import, unescaped apostrophes)
  - `pwa/src/components/planner/CooksMode.tsx` (ESLint issues from Prompt 05)
  - `pwa/src/components/home/TonightMenuCard.tsx` (new, likely has issues)
- Generated code warnings (unused eslint-disable directives in `/pwa/src/lib/api/generated/`) — low priority

**DELIVERABLES**:
1. **Fix Linting Errors**
   - Resolve all ESLint errors (not warnings) in Phase 10 components
   - Run `task lint:pwa` to verify 0 errors
   - Do NOT modify generated code in `src/lib/api/generated/`
2. **Run Pre-Commit Hook**
   - Execute `task review` to verify format, lint, and test all pass
   - All 125 unit tests + new Prompt 06 tests must pass
3. **E2E Validation Against Live Docker**
   - Start full Docker environment (`task up`)
   - Run E2E test suite: `MOCK_API_PORT=5000 BASE_URL=http://127.0.0.1:3000 npx playwright test pwa/e2e/planner-full-cycle.spec.ts`
   - Confirm 100% pass rate
   - Document any performance regressions in notes
4. **Commit & Document**
   - Create commit with message: "fix: resolve Phase 10 linting errors and validate E2E tests"
   - Update [HANDOVER.md](../../HANDOVER.md) with completion status
   - Archive Phase 10 to [JOURNAL.md](../../JOURNAL.md): "Phase 10 Complete — Kitchen & Grocery Hardening"

**TDD PROTOCOL**:
- 100% E2E pass rate required
- All linting must resolve before merge
- No performance regressions in Lighthouse/Core Web Vitals

**VERIFICATION**:
- `task review` exits with 0
- `npx playwright test pwa/e2e/planner-full-cycle.spec.ts` shows all tests passing
- No console errors in browser or API logs during E2E run

**MICRO-HANDOVER**:
- Confirm Phase 10 is production-ready
- Note any edge cases or flaky tests discovered
- Flag any downstream impacts on Phase 11+ planning
