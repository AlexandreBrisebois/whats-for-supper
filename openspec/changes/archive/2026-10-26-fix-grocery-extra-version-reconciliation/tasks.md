# Tasks

## 1. Preserve newer extras before future-week visibility filtering

**Outcome and scenarios:** Both delta scenarios retain unchecked version five when checked version four arrives; equal/newer checked winners disappear from future projection. Preserve current/past views, pending operations, identity/week guards and authoritative omission.

**Owners and boundaries:** Week store and its existing test file; this active change records acceptance. No canonical sync, historical checkbox edits, server/API/client/schema changes or deferred tooling.

**Dependencies and prerequisites:** User selected the reviewed correction. Existing dependencies/builders and Vitest are available. Baseline HEAD is e680fb7966978da3fbde25453a241c7e69e2b2a1; full baseline/status/patches are in /var/folders/7x/450tvgfj1lg2gx9p89txzx0w0000gn/T/wfs-extra-version-fix-d97o_63x.

**Acceptance boundary:** Real store entry points with existing API boundary mocks establish deterministic client state. Live browser/SSE and Android qualification are not established. Backend behavior and contract changes are not applicable to this correction; applicable repository checks still follow the harness selection.

- [x] 1.1 Add focused regression/preservation cases in weekStore.test.ts for events and schedule initialization, post-assignment refresh, refresh and snapshots; cover future offsets, stale/equal/newer checked versions, pending update/deletion, current/past views and omission. Run `task test:unit -- src/store/weekStore.test.ts` before production edits and record intended behavioral failures.
- [x] 1.2 Correct version/pending reconciliation before future checked-state filtering, sharing the existing store-local owner across event and schedule paths. Run `task test:unit -- src/store/weekStore.test.ts` green and review the narrow diff for preserved week/identity/absence semantics.
- [x] 1.3 Run `task test:unit -- src/store/weekStore.test.ts src/hooks/useScheduleStream.test.ts src/components/planner/GroceryList.test.tsx`; validate this selected change with `task spec:check -- fix-grocery-extra-version-reconciliation --type change` and reconcile all new scenarios with assertions and actual results in this task record.

## 2. Final Integration and Verification

- [x] 2.1 Prepare the complete task-owned path set, scope-review hashes/diffs against the baseline, and run `task verify -- <complete-task-owned-paths>` for applicable repository checks. Report exact record_path and passed/failed/blocked/not-run/not-applicable outcomes, preserving all unrelated work. Do not claim completion with required acceptance missing; stop before sync/archive, commit or PR.

## Regression evidence

- Red: `task test:unit -- src/store/weekStore.test.ts` before production edits: 15 intended stale-checked failures / 95 passed (110 total); all five event/init/assignment/sync/snapshot paths failed at offsets 1, 2 and 8. Log: /tmp/wfs-extra-version-red.log. Pending update/deletion, authoritative omission and equal/newer checked controls passed. Existing past-week presentation remains covered by the selected grocery component suite.

- Green: the same store command passed 110/110 after the correction. Added three past-week schedule preservation controls; `task test:unit -- src/store/weekStore.test.ts src/hooks/useScheduleStream.test.ts src/components/planner/GroceryList.test.tsx` passed 213/213. Store cases now total 113. Log: /tmp/wfs-extra-version-consumers.log.
- Both new delta scenarios map to the five-entry-point version-precedence matrix: stale checked version four is retained at offsets 1/2/8; equal/newer checked state removes projection; pending saves/deletions and authoritative omission retain their specified behavior. Current checked state and past checked read-only history remain represented.
- `task spec:check -- fix-grocery-extra-version-reconciliation --type change`: passed. Original archive task markers, canonical specs and audit/tooling work remain outside task ownership.

## Final verification checkpoint

Preparation passed on the explicit eight-file task set. Scope review found only weekStore.ts and weekStore.test.ts changed among the 2,402 baseline files, plus the six scaffolded change files. All 2,400 other baseline file hashes, HEAD and empty index are preserved. The diff retains absolute-week/event validation and all existing loading/navigation guards; one store-local helper now orders pending/version selection before checked projection. `git diff --check` passed. Final application verification uses all eight files; its durable result is reported after execution. Live SSE/browser-device qualification remains not run; database and live endpoint checks are not applicable to this frontend-only slice.

- First final verification: `.task/agent-finish/runs/75165bdb73514295b1437ae4297177ed.json` failed TypeScript because the new assignment fixture omitted its required image. All other applicable checks passed: 1,072 unit tests; 357 mocked browser tests / 18 skipped; 1,249 API tests / 154 opt-in skips; strict 35-item validation and static contract/client/mock checks. Content identity was stable. This record remains failed.
- Corrected the test fixture with the required image and an existing MOCK_IDS recipe identity; intermediate fixture compilation errors do not count as behavioral red evidence. Focused `task typecheck` and all 213 selected store/hook/component tests now pass. Production code is unchanged from the first final run. Final verification follows on the corrected complete eight-file identity.

## Final application acceptance

Corrected complete eight-file verification passed: `.task/agent-finish/runs/97193a88793a41ca875266c144a4ddca.json`, stable content identity `5ecc48750fa45af94bc941105da19cb25ffe9dbabfb68dd965e98df0ac31acea`. Strict validation, lint, formatting, types, all unit tests, full mocked browser impact, API tests and static contract/client/mock checks passed. Browser/API skips remain unqualified opt-in cases; live endpoint/database behavior checks were not applicable. Separate live SSE and Android qualification were not run. The first failed record remains preserved above.

Verified application SHA-256 values (unchanged by this acceptance bookkeeping):

- pwa/src/store/weekStore.ts: `12307f6372b494990197dad9aeea073945e1a8cc3fe68ace722df93fc9c3f05c`.

- pwa/src/store/weekStore.test.ts: `54c755a79d5d9c37a3ea8e9df51c32ad063df550856cac2e4bef674b9559eab3`.

All four selected implementation tasks are accepted. The change remains active and unsynced; historical archive checkboxes, canonical owner text, deferred tooling and existing dirty work remain preserved. This acceptance edit receives a separate documentation-only verification; its final record is reported in the completion reply.


## Sync and archive checkpoint — 2026-10-26

User authorized sync and archive after all four implementation tasks were accepted. Rechecked HEAD `e680fb7966978da3fbde25453a241c7e69e2b2a1`, empty index, source/test SHA-256 values above, both complete canonical owners, delta blocks, and the three verification records. Final acceptance documentation passed in `.task/agent-finish/runs/87fea7d07e3d44a286271c36a24a25cb.json`; the application and earlier failed fixture records retain their original status and tested identities.

Synced one added regression scenario into each existing grocery-shopping and household-live-updates requirement. Existing descriptions, scenarios, titles, purposes and qualifications are preserved. Strict canonical validation passed 34/34 before archival. Recompared both complete delta blocks with canonical owners before moving all six change files, including metadata, byte-identically to this archive; this lifecycle checkpoint is the only subsequent change to the archived content. The earlier active/unsynced and stop-before-archive statements above describe historical implementation boundaries.

Application source/tests remain unchanged. No live SSE or physical Android qualification was run; archive/document validation does not extend application runtime evidence. Preserve all seven older incomplete-task archives, inventory tooling, audit package, management-status ownership/archive, both URL/photo finalization requirements and full relevant-spec review. Overlap tooling and benchmarking remain deferred. Post-archive validation and documentation verification are reported separately with their durable run record. Stop before another implementation selection.
