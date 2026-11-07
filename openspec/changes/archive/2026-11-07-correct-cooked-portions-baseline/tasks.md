# Tasks

## 1. Correct the existing portions baseline and reset

**Outcome and scenarios:** saved inherited baseline, correction to usual, reset after draft and preserved protections.
**Owners and boundaries:** Portions editor → existing GET/PUT servings → SupperServingsService transaction; stateful mock and ingredient/grocery consumers. No UI additions or contract shape changes.
**Dependencies and prerequisites:** approved conversational scope; installed toolchain and disposable PostgreSQL.
**Acceptance boundary:** component and stateful browser controls, separately real HTTP/PostgreSQL save/reread/projection/default-freezing acceptance. No household writes.

- [x] 1.1 Add inherited-five/usual-four component and PostgreSQL reset regressions; run `task test:unit -- src/components/planner/useSupperServingsEditor.refinement.test.tsx --fsModuleCachePath=/tmp/wfs-cooked-vitest` and `task test:database -- --filter FullyQualifiedName~SupperServings_CurrentCookedInherited`; retain intended red evidence.
- [x] 1.2 Correct existing display/change/reset decisions only; preserve API schemas and current-day eligibility, ordinary overrides and prepared protections. Run 1.1 green and both editor suites plus `src/testing/mock-api.test.ts`.
- [x] 1.3 Add/run stateful `supper-servings.spec.ts` inherited correction/reset browser acceptance and complete `SupperServingsPostgresTests` PostgreSQL qualification. Inspect reset mock conformance and record independent persisted count/projection/history/default outcomes.

## 2. Final integration and verification

- [x] 2.1 Run preparation and scope review on all changed paths, then `task verify -- <complete reviewed paths>`; record exact status, record_path and any blocked checks. Do not deploy, sync, archive or commit.

## Evidence

- Intended component red: three regressions failed (opening baseline, numeric correction to usual and reset intent), 28 passed. `/tmp/wfs-cooked-red-unit.log`.
- Intended real HTTP/PostgreSQL red: reset acknowledged but fresh count was five instead of four. `.task/database-tests/runs/b5d28b08d65c42fba0f217c990311eb8/result.json`.
- Component/mock green: 55 passed across both editor suites and `src/testing/mock-api.test.ts`, using isolated filesystem module cache. `/tmp/wfs-cooked-green-unit.log`.
- Stateful browser green: five passed, covering inherited open/leave, numeric correction, reset and preserved existing explicit correction/reset. `/tmp/wfs-cooked-browser.log`. Mock acceptance is separate from real API/database acceptance.
- PostgreSQL green: all 70 SupperServingsPostgresTests passed, zero skipped, with disposable cleanup. `.task/database-tests/runs/01644bf6dedd43b8a7974dc365183777/result.json`. New reset/numeric cases independently reread persisted portions, assigned projection and recomputed groceries; preserve checked state on decrease, recipe basis/identity/status/history and frozen count after usual becomes six.
- Stateful serving mock already writes inherited usual on a deliberate null reset; no mock behavior change required. Existing OpenAPI reset semantics and generated shapes remain valid.
- User-visible layout, control visibility and localized copy are unchanged. No deployment or physical-device claim.

- Final prepared application verification passed: `.task/agent-finish/runs/16d35c7f034e4538b2c25812ef89a05b.json`. Documentation/spec validation, lint, formatting, types, all 1,832 units, impact browsers (966 passed/60 gated skips), API (1,400 passed/286 gated integration skips), contract/client checks and stable content identity passed. The separate PostgreSQL run above qualifies all 70 selected supper-servings tests with zero skips. Existing lint/nullability warnings are outside this correction.
- Scope review: two production owners changed only baseline/draft/reset decisions; no presentation, copy, schema, generated files, completion/history or automatic-freezing changes. Stateful browser and real PostgreSQL acceptance agree. Final tracking-only completion update receives a separate documentation verification; application source remains unchanged after the passing application record.
