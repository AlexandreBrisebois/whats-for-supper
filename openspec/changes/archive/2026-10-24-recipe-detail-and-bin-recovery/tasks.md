# Tasks

## 1. Detail read recovery
- [x] 1.1 Observe focused RED in RecipeDetailSheet.test.tsx for failure/Retry and departed identity responses using `task test:unit -- src/components/recipes/RecipeDetailSheet.test.tsx`.
- [x] 1.2 Implement detail read recovery locally; pass the same focused suite including existing detail actions.

## 2. Bin read and mutation feedback
- [x] 2.1 Observe RED for failed bin read/Retry, restore retention/retry and failed move with `task test:unit -- src/components/recipes/RecycleBinSheet.test.tsx src/components/recipes/RecipeDetailSheet.test.tsx`.
- [x] 2.2 Implement feedback and pass the same focused suites, preserving success and purge.
- [x] 2.3 Add and run focused Playwright network cases for GET /api/recipes/{id}, GET /api/recipes/trash, DELETE /api/recipes/{id}, POST /api/recipes/{id}/restore via existing mocks/builders; confirm visible recovery. No API shape/client/mock-handler changes or database tests apply.

## 3. Final integration
- [x] 3.1 Lead integrates preparation, reviewed task diff and applicable task verify for all six priorities; record acceptance status before claiming completion.

## Evidence
- Detail RED: 2 failed / 24 passed (missing initial and replacement failure feedback). Detail GREEN: 26 passed.
- Bin/move RED: 3 failed / 26 passed (missing read, restore and move failure feedback). Combined GREEN after reset regression: 30 passed.
- `task test:e2e -- recipe-recovery.spec.ts`: 2 passed, Chromium with generated API client and method-sensitive network failures. Initial test setup failures were dev StrictMode consuming one-shot read failures; kept reads failed until the actual Retry action, then passed. No real API/database or device qualification claimed.
- Final harness verification is owned by the lead for the integrated change set.

## Completion evidence

- Combined `task verify -- <all 76 reviewed changed paths>` passed every applicable check; no paths excluded. Record: `.task/agent-finish/runs/be34c4f071e549d98e08070b6828f9f9.json`. Frontend: 936 tests; browser impact: 297 passed/16 skipped; API: 1186 passed/121 skipped in the general run; dedicated Linux/PostgreSQL: 137 passed/zero skipped. Selected live household acceptance passed separately; unrelated opt-in suites are not implied qualified. Lint, formatting, types, strict specs, generated-client/contracts, actual endpoint parity and content identity passed. No commit, push, deployment, issue closure or archival.
- Application and test inputs are unchanged after that run; final checkbox/evidence documentation updates are validated separately with scoped `task verify`. Provider execution and physical-device qualification remain outside the selected checks.
