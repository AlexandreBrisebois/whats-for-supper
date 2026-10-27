# Tasks

Application authorized by the user on 2026-10-26 after proposal review. Checkboxes record completed acceptance; runtime qualification remains outside this documentation-only change.

## 1. Establish one shared management-status owner

**Outcome and scenarios:** DBR `Project the latest selected management result` owns selection/projection with `Completed result`, `No completed result`, `Latest management selection` and `Completed task result`. DH retains `Report snapshot-file and cron diagnostics with management status` and all four diagnostic scenarios.

**Owners and boundaries:** Only the two canonical specs, ownership/provenance navigation described in design.md, and task/audit checkpoint evidence. No code, OpenAPI, clients, mocks, schema, inventory tooling or Taskfile changes.

**Dependencies and prerequisites:** Settled decisions in proposal.md; OpenSpec 1.14.3 already installed. Recheck HEAD and staged/unstaged/untracked work. Preserve P0 and concurrent work. No dependencies or running services needed.

**Acceptance boundary:** Whole relevant-spec review, exact requirement/scenario reconciliation and local link/anchor checks; these establish documentation conservation, not live endpoint correctness. Behavior red/green, API/database/browser/provider tests and generated-client checks are not applicable because runtime contracts and behavior do not change.

- [x] 1.1 Record fresh HEAD/status and before-images/hashes for both full canonical specs, recipe-capture and existing dirty work; reread both affected specs in full and reconcile against design.md's ownership/scenario map. Verify the current counts are DBR 32/90 and DH 37/120 or explicitly reconcile drift before editing; evidence must name both source identities and preservation boundaries.
- [x] 1.2 Apply the DBR MODIFIED and DH REMOVED deltas as one documentation slice, moving both DH shared scenarios verbatim and retaining the two ordinary DBR scenarios verbatim. Add exactly the three non-normative navigation edits specified in design.md, including the old-anchor compatibility target. Verify the full post-edit specs identify one shared owner and demo diagnostics remain independently owned; no new capabilities, fields or runtime guarantees.
- [x] 1.3 Compare all post-edit requirement blocks and scenarios with task 1.1 before-images: only the mapped DBR description and removed DH description may differ; all four shared scenarios occur once under DBR, all other blocks/scenarios stay byte-identical. Verify DBR 32/92, DH 36/118, combined 68/210 and corpus 807/2165 absent reconciled concurrent edits. Preserve evidence/qualification paragraphs verbatim, including A34/DBR/DH limitations; allow only the three specified preamble additions. Verify recipe-capture, including both URL/photo finalization blocks, and pre-existing P0/Taskfile work remain byte-identical. Record exact mapping/hash/count results rather than treating count equality alone as conservation.
- [x] 1.4 Check all changed owner links and the preserved old DH anchor (including inbound references found by `rg -n 'read-latest-management-workflow-diagnostics|project-the-latest-selected-management-result' openspec docs`). Confirm target files/heading or explicit HTML anchors resolve and references name the intended owner. Reread both full canonical specs to verify qualifications, failure boundaries, ordinary/demo selection and reset-versus-successor semantics; run `task spec:check -- clarify-management-status-ownership --type change` and `task spec:check` (strict full repository reconciliation). Record actual statuses; resolve only task-local documentation failures.

## 2. Final Integration and Verification

- [x] 2.1 Record task 1 acceptance and the application checkpoint in task/audit evidence without changing historical audit findings; review staged/unstaged/untracked scope against before-images, then run `git diff --check` and `task verify -- <complete-reviewed-changed-file-set>` using concrete paths for both canonical specs, all changed artifacts and any tracker/evidence updates. Documentation needs no preparation run. Report durable record_path and passed/failed/blocked/not-run/not-applicable evidence; confirm HEAD/index and unrelated work are preserved. Stop before archive, commit or PR.


## Application evidence — 2026-10-26

Entry HEAD: `e680fb7966978da3fbde25453a241c7e69e2b2a1`; index empty. Existing five-line Taskfile edit, inventory script/tests, audit package and reviewed proposal preserved. Full 2,402-file SHA-256/status/diff baseline and before-images are at `/var/folders/7x/450tvgfj1lg2gx9p89txzx0w0000gn/T/wfs-management-status-apply-cycp0lau`; no canonical drift from proposal source hashes.

| Acceptance | Observed result |
|---|---|
| 1.1 Full initial review and counts | Passed; DBR 32/90 and DH 37/120; source hashes equal the design-review checkpoint. |
| 1.2 Shared ownership and navigation | Applied the reviewed DBR description, moved both DH scenarios verbatim, removed the superseded requirement, added exactly the three navigation edits and old-anchor compatibility target. Demo diagnostics remain authoritative at DH. |
| 1.3 Exact conservation | Passed; four shared scenario contents match source, all other 67 requirement blocks byte-identical, all 210 scenarios conserved, qualification sections byte-identical, and preambles differ only by the three planned edits. Source-span separators are excluded only when comparing moved scenario content. |
| 1.3 Counts | DBR 32/92; DH 36/118; combined 68/210; corpus 807/2165. No scenarios added or removed. |
| 1.3 Preservation | 2,398 other baseline files SHA-256-identical; recipe-capture (both URL/photo finalization requirements), application, OpenAPI, P0 scripts/tests and Taskfile remain unchanged. |
| 1.4 Ownership links | Passed; 18 relative links/anchors in both affected specs resolve, and explicit old DH anchor is retained. Inbound-reference search found only design/task references and new canonical navigation; no additional document rewrite needed. |
| 1.4 Full final review | Passed; both complete post-edit specs reviewed, preserving ordinary/demo selection, persisted status/null result, acceptance/completion, reset/successor distinctions and all failure/qualification boundaries. |
| Pinned validation | `task spec:check -- clarify-management-status-ownership --type change` passed; `task spec:check` passed 35/35 items, zero failures. OpenSpec 1.14.3. |

Canonical SHA-256 after application:

- data-backup-and-recovery: `9ded2de18623f29bb2067d544b5b226b02185f1e7f2dc7a92c0ae0afed4485dc`.
- demo-household: `9f2a239a56b2dd2349f2e59c7e9a36942a792e43d4df61ad57e93d79980095d0`.

No behavioral test cycle, generated-client or runtime contract change: not applicable. Live API/database/browser/device/provider qualification: not run. No scope expansion to existing contract gaps, deferred overlap/benchmark tooling, schema/loading policy, commit, PR or archive. Final scoped verification record and status are reported in the completion reply; subsequent documentation edits require a fresh identity check.

Final task acceptance: scoped `task verify` passed documentation, strict selected change/spec validation and content identity (`.task/agent-finish/runs/009fcb4938a945d488d23178a1db53f4.json`). Scope check confirmed exactly four task-owned files changed from the application baseline, tracker edits append-only, HEAD/index unchanged, and all 2,398 other baseline files intact. This checkbox/evidence update is followed by a final scoped verification for the resulting document identity; its durable record is reported in the completion reply. All five application tasks are complete; change remains active and unarchived.

## Lifecycle checkpoint — 2026-10-26

User authorized sync and archival after application acceptance. Both deltas were verified already synced, so no canonical rewrite was necessary. All five tasks and four artifact groups were complete. Archived as `2026-10-26-clarify-management-status-ownership`; application verification remains `.task/agent-finish/runs/5ce285ca53d448fda4841eff5ee1f7d5.json` for its original tested identity. Canonical hashes, scenario conservation and runtime qualification limits are unchanged. Post-archive validation/verification is reported with its own durable record in the completion reply. No commit or PR was created.
