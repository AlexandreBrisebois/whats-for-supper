# Prompt 06: E2E Hardening & Integrity (The Final Gate)

**Persona**: QA Lead specializing in High-Fidelity User Journeys.

**Context**:
Verify the entire Phase 10 implementation. Ensure all "Seams" are tight and the UX flows are zero-friction.

**TARGET FILES**:
- `pwa/e2e/planner-full-cycle.spec.ts` [NEW]
- `api/tests/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs` [NEW]

**FORBIDDEN**:
- Do not modify implementation code.

**USER JOURNEY TO TEST**:
1.  **Monday Morning**: Open Planner -> Empty slots -> Smart Defaults show pending meals.
2.  **The Ask**: Tap "Ask the Family" -> Pulsing Discovery -> Simulate family votes -> Vote counts update via polling.
3.  **Menu's In!**: Tap "Menu's In!" -> Week locks -> Votes purged -> Recipe `last_cooked_date` NOT updated yet.
4.  **Tonight's Supper**: Go to Home -> Flip card -> See ingredients -> Launch Cook's Mode -> Finish 3 steps -> Close.
5.  **Persistence**: Re-open Cook's Mode -> Should still be on Step 3.
6.  **Validation**: Tap "Cooked" -> Recipe `last_cooked_date` is now updated.
7.  **Recovery**: Skip tomorrow's meal -> Move to next week -> Verify calendar update.

**TDD PROTOCOL**:
- 100% Pass rate required for `planner-full-cycle.spec.ts`.

**VERIFICATION**:
- `task review`
- `scripts/run-e2e-ci.sh`

**MICRO-HANDOVER**:
- Confirm 100% E2E coverage of Phase 10 requirements.
- Note any performance regressions.
