# Tasks

These tasks track the documentation reorganization authorized by the user’s apply instruction. Every group is documentation-only: behavior red/green, API/client/mock changes and application/unit/browser/database/model/device qualification are not applicable. No services or external-provider doubles are required. Preserve known evidence limitations; passing document checks does not qualify runtime behavior.

## 1. Library catalog, editing, media and Recycle Bin

**Outcome and scenarios:** Preserve all 96 library requirements / 212 scenarios, including detail Save failure, discoverability optimism, original-photo fallback and purge rejection, under the exact destinations in design.md.
**Owners and boundaries:** recipe-library 46/100, recipe-editing 25/54, recipe-media 12/27, recipe-recycle-bin 13/31; current dependent navigation only.
**Dependencies and prerequisites:** Accepted change artifacts, the five recorded source identities, absent/unconflicted new owner paths, installed OpenSpec/documentation tools, and a private apply-entry before-image. Existing meal-planning work is already dirty and must be preserved.
**Acceptance boundary:** Exact block hashes, evidence preservation and resolvable documentation links; no application behavior changes.

- [x] 1.1 Capture staged/unstaged/untracked state and private before-images/identities for all five sources and every overlapping navigation document. Match source SHA-256 and all 260 mapped block identities to design.md; reconcile any drift before editing. Completion evidence: matching or explicitly reconciled map, identified pre-existing changes and unchanged staged work.
- [x] 1.2 Transfer the 50 library requirements in its REMOVED delta into the three destination mains, keeping 46 at recipe-library; write the four Purposes from design.md and preserve non-Purpose preamble text. Completion evidence: all 96 original blocks / 212 ordered scenarios occur exactly once across the four mains, canonical hashes match and no delta headers/TBD Purpose remain.
- [x] 1.3 Add the library owner directory, originating evidence/qualification links and exact-title navigation for detail reads, shared PATCH effects, stack discoverability, original assets, delete eligibility and search exclusion. Update current dependent navigation and the library baseline's current ownership section without rewriting normative bodies or old digest tables. Completion evidence: all introduced anchors resolve and the original library evidence and other consuming requirement blocks are unchanged; `openspec validate --specs --strict --no-interactive` passes for the current intermediate inventory.

## 2. Search producers, recovery repair and scheduled maintenance

**Outcome and scenarios:** Preserve the combined Search and backup/recovery 78 requirements / 181 scenarios, including embedding failure with lexical readiness, fingerprint guards, restore sidecar incompatibility, bounded repair, child-launch acceptance and cleanup guards.
**Owners and boundaries:** recipe-search 39/90, search-indexing 10/19, data-backup-and-recovery 24/58, scheduled-maintenance 5/14.
**Dependencies and prerequisites:** Group 1 and its unchanged main/evidence identities; both source deltas participate in the search-indexing transfer. No competing search-indexing creator or duplicate copy is allowed.
**Acceptance boundary:** Four-owner documentation conservation and current consumer links; lexical/provider/restore behavior remains unqualified by this migration.

- [x] 2.1 Apply Search's eight removals and backup/recovery's seven removals as one coherent documentation group. Create search-indexing from eight Search plus two recovery blocks and scheduled-maintenance from five recovery blocks; retain serving and file reconstruction rules as mapped. Completion evidence: exactly 78 original titles / 181 scenarios across these four mains, with matching block hashes and the per-owner counts above.
- [x] 2.2 Write all four Purposes, preserved evidence preambles, owner directories and exact-title links among serving, indexing, sidecar recovery, Dreaming, planning-lifecycle finalization and background-processing. Search-indexing must link both originating evidence records; add current ownership sections to both baseline records and retarget current dependent navigation. Completion evidence: unchanged source digests/historical claims and preserved meal-planning navigation; all producer/recovery/maintenance links resolve to one authoritative rule owner; `openspec validate --specs --strict --no-interactive` passes.

## 3. Saved-recipe quality and capture recovery

**Outcome and scenarios:** Preserve all 44 quality requirements / 111 scenarios, including manual-only Duplicate policy, unchanged-feedback suppression, attributed import access, failure-reference copying, failed-row retry/clear, usable-content protection and bulk acceptance/count distinctions.
**Owners and boundaries:** recipe-quality 28/74 and capture-recovery 16/37; scheduled-maintenance consumes queued cleanup and background-processing retains generic lifecycle semantics.
**Dependencies and prerequisites:** Groups 1–2; the recipe-quality source and exact map are unchanged or reconciled. Issue-form failure references stay with quality; bulk imports require no inferred failed-capture predicate.
**Acceptance boundary:** Two-owner documentation conservation and current caller/evidence links; no worker, clipboard, cleanup or re-import execution is claimed.

- [x] 3.1 Transfer exactly the failed-capture management and bulk import/summary requirements in the quality REMOVED delta into capture-recovery. Keep contextual feedback, manual review/resolution, copy-reference controls and attributed import reads in quality. Completion evidence: 44 unique titles / 111 ordered scenarios across the two mains with all original hashes matching.
- [x] 3.2 Write both Purposes, preserve the original quality evidence text, and add evidence/qualification links and current dependency navigation for report observation, identity binding, shared task reset, recipe retention and maintenance cleanup. Update current Settings/capture/report consumer navigation and the quality baseline directory without rewriting their requirement bodies. Completion evidence: current links/anchors resolve, legacy evidence and pre-existing edits remain intact, and `openspec validate --specs --strict --no-interactive` passes.

## 4. Household access, member records and active context

**Outcome and scenarios:** Preserve all 42 identity requirements / 105 scenarios, including access-before-context, invite cookie ordering, failed member recovery, duplicate-name conflicts, creation/rename handoffs and header/cookie precedence.
**Owners and boundaries:** household-identity 12/37, household-members 14/35 and member-context 16/33. Shared authentication stays under its existing path; member-preferences retains saved/effective settings.
**Dependencies and prerequisites:** Groups 1–3; unchanged/reconciled identity source and new owner paths. Member-context's onboarding list/selection is separate from creation/rename/removal, not a new account model.
**Acceptance boundary:** Three-owner documentation conservation, preserved scope notes and dependency references; no new security, cookie or membership-validation guarantee.

- [x] 4.1 Transfer the 30 mapped identity requirements to household-members and member-context, retaining access/invite requirements at household-identity. Completion evidence: exactly 42 unique titles / 105 ordered scenarios across the three mains, matching canonical hashes, and the existing page-gate scope note is retained unchanged.
- [x] 4.2 Write the three Purposes and owner directories; add current evidence/qualification and exact-title dependency links for access cookie options, member creation/handoff, selection/recovery, shared SDK/SSR transport, binding and capture attribution. Update the identity baseline's current directory and current consumer navigation, including earlier family links where applicable. Completion evidence: protected-API authentication links still target household-identity, moved context/member references resolve to their owners, consumer normative blocks/digests remain unchanged and `openspec validate --specs --strict --no-interactive` passes.

## 5. Final Integration and Verification

- [x] 5.1 Reconcile the 13-owner union against the five original sources: 260 unique requirement titles / 609 ordered scenarios with every canonical block hash and per-owner count in design.md matching. Verify every REMOVED title has one identical destination, all evidence/preamble text outside replaced Purposes and scope notes is preserved, and current dependency/navigation links resolve. Review baseline index/reconciliation current sections together without changing archived/backlog/history/digest records. Completion evidence: conservation/link/preservation results recorded and no stale current ownership route to a moved title.
- [x] 5.2 Run `openspec validate split-remaining-broad-capabilities --strict --no-interactive`, `openspec validate --all --strict --no-interactive` and `git diff --check`; reconcile task evidence and review the full documentation-only diff. Run `task verify:plan -- <complete reviewed changed task paths>` then `task verify -- <same paths>`, including every changed main, current navigation and final task/evidence file. Completion requires all applicable checks passed and no missing acceptance; report failed/blocked/not-run/not-applicable statuses and the unique record_path. Verify pre-existing dirty/staged work and application/contract/client/test/SQL/configuration inputs are unchanged. Stop before archival, commit, deployment or further decomposition.

## Workflow follow-up

- Applied on 2026-10-16 following the user’s apply instruction. Archival remains a separate workflow.
- Archive only after a subsequent explicit request and after verifying the synced state, including retained Purposes, evidence, navigation and all cross-source transfers.

## Apply evidence — 2026-10-16

- Entry: all five source SHA-256 values and 260 canonical block hashes matched design.md. Captured private before-images, full staged/unstaged/untracked status and content identities before edits. Existing meal-planning work and the current planning artifacts were already dirty; no staging or reset was performed.
- Conservation: all 260 original titles, descriptions and 609 ordered scenarios appear exactly once under the 13 mapped owners. Each family and the final combined inventory matched canonical hashes and per-owner counts. All existing consuming-main normative blocks are unchanged.
- Ownership: library 46/100, editing 25/54, media 12/27, Recycle Bin 13/31; Search 39/90, indexing 10/19, backup/recovery 24/58, scheduled maintenance 5/14; quality 28/74, capture recovery 16/37; household access 12/37, member records 14/35, active member context 16/33. Indexing contains exactly eight Search and two recovery-origin requirements.
- Evidence/preamble preservation: retained all original non-Purpose preamble statements, page-gate scope note, historical evidence lines and digests. New owners link all originating evidence records; indexing links both Search and recovery provenance. Current owner directories and exact-title links resolve legacy owner references without changing policy. Original meal-planning navigation is retained.
- Reference checks: intermediate checks detected a stale recipe-editing link after indexing moved out of Search; dependency links were retargeted, then all exact-title targets and anchors passed. The full-union check is applicable after all family transfers; its final result passed 260/609. Required checks were rerun before marking the affected groups complete.
- Validation: `openspec validate --specs --strict --no-interactive` passed for each completed family inventory. Final `openspec validate split-remaining-broad-capabilities --strict --no-interactive` and `openspec validate --all --strict --no-interactive` passed (31 items / 0 failures); `git diff --check` passed.
- Scope review: changes comprise the five splits, eight new main specs, current owner/dependency navigation and task evidence. All other application/contract/client/test/SQL/configuration inputs, archived changes, backlog/history, recorded source digest tables and staged work remain unchanged. Existing overlapping documentation edits are preserved. Preparation, red/green and application/runtime qualification are not applicable. Final documentation harness statuses and its unique record_path are reported in the completion response.
