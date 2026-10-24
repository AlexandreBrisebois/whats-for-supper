# Tasks

## 1. Investigation and evaluation

- [x] 1.1 Trace detail entry, request, retrieval, scoring and constraints against verified main; deliver investigation.md with classified findings and primary-source competitor references.
- [x] 1.2 Define representative synthetic cases before scoring; execute the actual current scorer and report component/pairwise observations in evaluation.md, distinguishing missing production/household evidence.
- [ ] 1.3 Obtain morning decisions and household example judgments described in investigation.md before defining a ranking implementation slice. Pending by explicit owner instruction; no weights or metadata policy selected.

## 2. Planner Find Similar navigation slice

**Outcome:** recipe-search / Find Similar from Planner detail.
**Owners:** Planner callback, existing detail and Search URL/request handling. API and ranking unchanged.
**Prerequisites:** pinned toolchain, existing mock API fixtures; no provider credentials.
**Acceptance boundary:** unit callback regression plus browser through real Planner/detail/Search and mocked external API; existing backend Similar integration tests separately. No claim of live retrieval quality.

- [x] 2.1 Add Planner unit and browser regressions; run `task test:unit -- src/app/\(app\)/planner/page.test.tsx` and focused `task test:e2e -- planner.spec.ts -g 'Find Similar from Planner'` before logic edits, observing wrong `open` navigation/request.
- [x] 2.2 Change only Planner's Find Similar route to `similarTo`, then pass the focused regressions and existing Search Similar cases. No assignment target, contract regeneration or mock behavior change: request uses the existing POST search contract.
- [x] 2.3 Record observable seam acceptance and preservation boundaries in evidence.md; run existing API Similar integration coverage with `task test:api -- --filter FullyQualifiedName~Similar`.

## 3. Final verification

- [x] 3.1 Review scope, prepare changed application paths and run `task verify` with all task paths; record exact identity/status and any blockers.

## Workflow follow-up

- Publish a separate draft PR; attach exact-final-head CI and final documentation-check records to its body. Keep issue open and active change pending ranking decisions/qualification. These publication records describe the immutable commit after documentation is finalized.

- Sync/archive only when the selected change's outstanding decisions and acceptance are resolved. Do not archive investigation as complete on synthetic evidence.
- No merge, tag, deployment or production-data operations.
