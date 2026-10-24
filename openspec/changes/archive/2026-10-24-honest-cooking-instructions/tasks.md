# Tasks

## 1. Honest cooking recovery
- [x] 1.1 Observe RED with `task test:unit -- src/components/planner/CooksMode.test.tsx` for failed read/Retry, absent/unusable steps, shared contextual report/reimport and Mark cooked recovery.
- [x] 1.2 Remove fabricated fallback, expose honest recovery and retain original detail/views; pass the same focused suite including existing editing, presentation and completion cases.
- [x] 1.3 Exercise generated-wrapper GET /api/recipes/{id} failure/retry and missing-content report recovery in focused Playwright; existing POST import-report mock response and server policy remain unchanged. No backend/database/contract generation applies.

## 2. Integrated verification
- [x] 2.1 Lead prepares and reviews the complete integrated diff and runs task verify; reconcile acceptance evidence before completion.

## Evidence
- `task test:unit -- src/components/planner/CooksMode.test.tsx`: RED 7 failed / 23 passed for the intended missing recovery behaviors; GREEN 31 passed, including later departed-ID coverage and explicit reread after background acknowledgement.
- `task test:unit -- src/components/planner/CooksMode.test.tsx src/components/recipes/RecycleBinSheet.test.tsx src/components/recipes/RecipeDetailSheet.test.tsx`: 61 passed after owned-path formatting.
- `task test:e2e -- cooking-instruction-recovery.spec.ts recipe-recovery.spec.ts`: 4 passed, Chromium; current generated wrapper + method-sensitive network failures/quality submission exercised. Real service/provider reimport and device qualification not run; existing APIs/server policy unchanged.
- `task prepare --` the eight owned TSX/test/E2E paths: passed; no unexpected writes. Final integrated verification is owned by lead.
- Final Chromium repeat after source/original availability assertion: 4 passed; nested Recipe details retained View Original. Rendered missing-instructions screenshot inspected after overlay entry animation; visible error/recovery/completion layout has no overlap in the 1280x720 viewport. This is desktop rendering evidence only.
- Integrated-gate correction: initial gate caught missing translation catalog keys, SDK builder instruction typing and synchronous effect reset lint. Added matching en/fr catalog entries, kept raw instruction arrays at browser JSON response boundary, and moved reset into existing async fetch callback. Focused ESLint passed, `task typecheck` passed, and locale-integrity plus owned component tests passed (63/63). No behavior policy changed; no browser rerun during live fixture hold.

## Completion evidence

- Combined `task verify -- <all 76 reviewed changed paths>` passed every applicable check; no paths excluded. Record: `.task/agent-finish/runs/be34c4f071e549d98e08070b6828f9f9.json`. Frontend: 936 tests; browser impact: 297 passed/16 skipped; API: 1186 passed/121 skipped in the general run; dedicated Linux/PostgreSQL: 137 passed/zero skipped. Selected live household acceptance passed separately; unrelated opt-in suites are not implied qualified. Lint, formatting, types, strict specs, generated-client/contracts, actual endpoint parity and content identity passed. No commit, push, deployment, issue closure or archival.
- Application and test inputs are unchanged after that run; final checkbox/evidence documentation updates are validated separately with scoped `task verify`. Provider execution and physical-device qualification remain outside the selected checks.
