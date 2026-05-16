# Build Prompt 06-e2e-hardening.md
**Persona**: QA Automation Engineer (Playwright).

## Strict Scope
- **TARGET**: 
    - `pwa/e2e/home-recovery.spec.ts`
- **FORBIDDEN**: 
    - Do not modify source code components.

## The Seams (Contract)
- Selectors: `getByTestId('tonight-pivot-card')`.
- Actions: `Confirm GOTO` (button), `Discover` (button), `Ordering In` (logic).

## Technical Skeleton
1.  **Selector Update**: Migrate all `getByTestId('smart-pivot-card')` to `getByTestId('tonight-pivot-card')`.
2.  **New Test Case**: Add a test verifying that tapping "Confirm GOTO" results in a planned meal.
3.  **Regression Check**: Ensure that "Skip Tonight" -> "Ordering In" still works and correctly returns the user to the `TonightPivotCard`.

## Execution Limit
Update and harden E2E tests ONLY.

## TDD Protocol
- **Verification**: All 161+ lines of `home-recovery.spec.ts` must pass.

## Verification Command
```bash
npx playwright test e2e/home-recovery.spec.ts
```

## Handover Requirement
- Playwright test report (All Green).
- Adherence to Directive 5 of SKILL_TEAM_ORCHESTRATOR.md.
