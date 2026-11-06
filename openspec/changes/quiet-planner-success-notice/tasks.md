# Tasks

## 1. Quiet confirmed return with recovery preserved

**Outcome and scenarios:** All meal-assignment deltas in this change, including old URLs, late reads, replacement/spillover and saved-but-unrefreshed retry.
**Owners and boundaries:** Planner return state, planningResult, existing feedback infrastructure and locales; `GET /api/schedule` reconciliation and existing assignment/replacement methods are preserved.
**Dependencies and prerequisites:** Finish or release overlapping quiet-portions implementation ownership. No backend/API change or data migration.
**Acceptance boundary:** Real browser components, API wrapper and stores with method-sensitive mock schedule/assignment handlers; no production calls.

- [ ] 1.1 Add regression cases in `pwa/src/app/(app)/planner/page.test.tsx` and focused `pwa/e2e/recipe-detail-planning-live.spec.ts` or mock `recipe-detail-layout.spec.ts` where appropriate; first run `task test:unit -- 'src/app/(app)/planner/page.test.tsx'` and observe intended failure for persistent routine success/Refresh. Cover success once, replacement actual date/spillover, mismatch, refresh failure/retry, departure, consumed URL reload/Back and mutation counts.
- [ ] 1.2 Separate routine/transient, replacement/dismissible and actionable recovery states; preserve reread/snapshot/navigation. Reuse planning-result lifetime and existing feedback owners. Run the same unit command green; retry must make reads only, and stale results must not affect a different context. Keep English/French copy coherent.
- [ ] 1.3 Update mock browser acceptance in `pwa/e2e/planner.spec.ts` and `recipe-detail-layout.spec.ts`; run `task test:e2e -- planner.spec.ts recipe-detail-layout.spec.ts --workers=1` with the qualified local fixture. Confirm reduced-motion navigation, keyboard dismissal/retry, narrow viewport/large text and zero duplicate mutations. Live production acceptance is outside this proposal's execution.

## 2. Final Integration and Verification

- [ ] 2.1 Reconcile scenario evidence, inspect the complete task-owned diff, run applicable preparation then `task verify -- <complete reviewed task-owned paths>` and `openspec validate quiet-planner-success-notice --strict`. Record actual commands/results and harness record_path; missing acceptance remains incomplete.

Planning evidence: artifact/source review only; all implementation tasks remain unstarted. No product or production tests ran during proposal preparation.
