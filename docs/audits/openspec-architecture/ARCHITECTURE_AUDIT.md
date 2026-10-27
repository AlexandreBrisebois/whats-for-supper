# OpenSpec architecture audit — design review

Completed audit snapshot and design review. The subsequent one-at-a-time review approved P0 inventory-only tooling; see [INVENTORY_TOOL.md](INVENTORY_TOOL.md) for its separate implementation evidence. Audit measurements below retain their original source identity.

Date: 2026-10-26 (America/Toronto). Repository: `AlexandreBrisebois/whats-for-supper`; local branch `main`; source HEAD `a3232949b1fd627771ebe9ee68a975170f1798ad`. Initial working tree was clean. Only this audit directory is added. Canonical specifications, Taskfile and agent instructions retain their original content. At finalization, the checkout advanced outside audit commands to `e680fb7966978da3fbde25453a241c7e69e2b2a1`, changing only `.github/workflows/container-candidate.yml` and `pwa/.dockerignore`; those unrelated committed changes are preserved. All 34 canonical hashes still match the audited source revision. See [final-revision-reconciliation.json](evidence/final-revision-reconciliation.json). No branch, PR or commit was created.

## Review outcome

The corpus has 34 capabilities, 808 requirements and 2,165 scenarios. All 34 pass strict OpenSpec 1.14.3 validation. One pair repeats the same readiness-finalization obligation for URL/photo capture; this is proven textual repetition, not proof of a bad architectural boundary. Management-status projection ownership needs clarification. The other 53 reviewed pairs express intentional overlap, dependency, endpoint exception or distinct behavior. All 51 generated candidates plus four targeted pairs were reviewed, with both source spans and hashes verified. The lexical search is bounded and does not prove there are no additional semantic duplicates or contradictions.

Measured context savings do not justify a new loading policy. Scoped index+selected exploratory payloads are 33–38% smaller than full source, but including required initial review and final verification makes totals 31–33% larger than two full phases, and 9–11% larger than measured existing overview plus those same phases. Actual model token counts are unavailable; no token or billing savings are asserted.

Recommendation: implement deterministic inventory/evidence reporting first, if approved. Retain current capability boundaries, full relevant-spec review and existing OpenSpec selective discovery. No embeddings, persistent index, automatic consolidation or schema rewrite in v1.

## Complete capability inventory and size analysis

Canonical inputs were enumerated from the sorted filesystem glob `openspec/specs/**/spec.md`, not from code-search results. Each file SHA-256, raw Purpose/headings, requirement description/block and scenario span/hash is retained in [inventory.json](evidence/inventory.json) and [requirements.json](evidence/requirements.json). Source spans use one-based inclusive lines. CSV is retained as data in [experiment-sources.json](evidence/experiment-sources.json) and can be regenerated outside the repository.

| Capability | UTF-8 bytes | Characters | Physical lines | Requirements | Scenarios |
|---|---:|---:|---:|---:|---:|
| [app-installation](../../../openspec/specs/app-installation/spec.md) | 18,221 | 18,221 | 273 | 18 | 42 |
| [application-time](../../../openspec/specs/application-time/spec.md) | 1,489 | 1,489 | 27 | 1 | 4 |
| [background-processing](../../../openspec/specs/background-processing/spec.md) | 36,934 | 36,924 | 565 | 32 | 104 |
| [capture-recovery](../../../openspec/specs/capture-recovery/spec.md) | 18,293 | 18,283 | 263 | 18 | 42 |
| [cooking](../../../openspec/specs/cooking/spec.md) | 26,441 | 26,416 | 425 | 32 | 71 |
| [data-backup-and-recovery](../../../openspec/specs/data-backup-and-recovery/spec.md) | 31,023 | 30,995 | 531 | 32 | 90 |
| [demo-household](../../../openspec/specs/demo-household/spec.md) | 49,734 | 49,684 | 670 | 37 | 120 |
| [deployment-calendar](../../../openspec/specs/deployment-calendar/spec.md) | 9,554 | 9,554 | 129 | 7 | 20 |
| [grocery-shopping](../../../openspec/specs/grocery-shopping/spec.md) | 54,643 | 54,637 | 899 | 59 | 162 |
| [household-identity](../../../openspec/specs/household-identity/spec.md) | 15,846 | 15,846 | 233 | 12 | 37 |
| [household-live-updates](../../../openspec/specs/household-live-updates/spec.md) | 49,552 | 49,536 | 674 | 41 | 122 |
| [household-members](../../../openspec/specs/household-members/spec.md) | 14,355 | 14,355 | 223 | 14 | 35 |
| [installation-assistance](../../../openspec/specs/installation-assistance/spec.md) | 13,739 | 13,739 | 183 | 10 | 31 |
| [meal-assignment](../../../openspec/specs/meal-assignment/spec.md) | 37,398 | 37,396 | 526 | 33 | 90 |
| [meal-planning](../../../openspec/specs/meal-planning/spec.md) | 24,363 | 24,337 | 299 | 17 | 44 |
| [meal-rescheduling](../../../openspec/specs/meal-rescheduling/spec.md) | 31,447 | 31,445 | 434 | 27 | 74 |
| [member-context](../../../openspec/specs/member-context/spec.md) | 16,802 | 16,802 | 225 | 16 | 33 |
| [member-preferences](../../../openspec/specs/member-preferences/spec.md) | 23,687 | 23,673 | 360 | 26 | 58 |
| [non-cooking-plans](../../../openspec/specs/non-cooking-plans/spec.md) | 17,313 | 17,303 | 250 | 18 | 39 |
| [planning-lifecycle](../../../openspec/specs/planning-lifecycle/spec.md) | 27,299 | 27,299 | 376 | 21 | 67 |
| [recipe-capture](../../../openspec/specs/recipe-capture/spec.md) | 43,660 | 43,644 | 631 | 41 | 109 |
| [recipe-discovery](../../../openspec/specs/recipe-discovery/spec.md) | 30,838 | 30,834 | 536 | 30 | 86 |
| [recipe-editing](../../../openspec/specs/recipe-editing/spec.md) | 27,332 | 27,290 | 388 | 27 | 64 |
| [recipe-library](../../../openspec/specs/recipe-library/spec.md) | 44,230 | 44,194 | 670 | 50 | 109 |
| [recipe-media](../../../openspec/specs/recipe-media/spec.md) | 12,951 | 12,887 | 177 | 12 | 27 |
| [recipe-quality](../../../openspec/specs/recipe-quality/spec.md) | 35,229 | 35,209 | 469 | 29 | 78 |
| [recipe-recycle-bin](../../../openspec/specs/recipe-recycle-bin/spec.md) | 15,616 | 15,580 | 215 | 15 | 34 |
| [recipe-rotation](../../../openspec/specs/recipe-rotation/spec.md) | 10,789 | 10,789 | 191 | 10 | 36 |
| [recipe-search](../../../openspec/specs/recipe-search/spec.md) | 48,216 | 48,216 | 860 | 49 | 127 |
| [recipe-sharing](../../../openspec/specs/recipe-sharing/spec.md) | 14,776 | 14,776 | 199 | 11 | 37 |
| [scheduled-maintenance](../../../openspec/specs/scheduled-maintenance/spec.md) | 9,491 | 9,489 | 149 | 8 | 23 |
| [search-indexing](../../../openspec/specs/search-indexing/spec.md) | 9,702 | 9,698 | 141 | 10 | 19 |
| [tonight-meal-decisions](../../../openspec/specs/tonight-meal-decisions/spec.md) | 43,746 | 43,711 | 618 | 35 | 103 |
| [weekly-household-interest](../../../openspec/specs/weekly-household-interest/spec.md) | 8,859 | 8,859 | 160 | 10 | 28 |
| **Total** | **873,568** | **873,110** | **12,969** | **808** | **2,165** |

The preliminary remote sample agrees on capabilities, requirements, scenarios and characters. All 34 files end in newline; counting `split('\n')` elements yields exactly 13,003 instead of 12,969 physical lines. The remote SHA was not supplied, so equal totals do not prove revision equality.

Median capability size is 24,025 bytes; smallest is application-time (1,489), largest grocery-shopping (54,643). The five largest—grocery-shopping, demo-household, household-live-updates, recipe-search and recipe-library—contain 246,375 bytes (28.20% of the corpus). This distribution does not establish poor cohesion or justify a size-based split.

Pre-requirement preambles occupy 68,105 bytes (7.80%); normative descriptions 268,689 bytes (30.76%); scenario blocks 481,112 bytes (55.07%). Remaining bytes include requirement titles and structural material. These categories are measured source spans, not a recommendation to discard evidence or scenarios. Ten repeated scenario headings occur under different requirements; none repeats within its requirement. Treat them as navigation warnings. No malformed/orphan normative headings were observed by the corpus-specific extractor.

### Current purposes

- **app-installation**: Expose install-facing identity and household entry points, and describe conditional share handoff into existing capture journeys without certifying device installation or delivery.
- **application-time**: Make API application time-dependent behavior deterministic while preserving UTC operational timestamps and established scheduling semantics.
- **background-processing**: Expose the persisted lifecycle of accepted background workflows, dependency-based task progression and bounded automatic retries, so callers can distinguish saved work from execution and completion.
- **capture-recovery**: Let household members inspect, retry and clear failed capture workflows and request bulk imports for unnamed stored recipes, distinguishing workflow acknowledgements and summary counts from repaired recipes and completed cleanup.
- **cooking**: Let household members prepare and follow the viewed recipe, then request recording that recipe as cooked while keeping calendar matching with meal planning.
- **data-backup-and-recovery**: Export and reconstruct retained application data, including report and compatible search sidecars, while preserving current merge, legacy-data and partial-failure boundaries independently of scheduled maintenance.
- **demo-household**: Describe the existing resettable showcase, its access presentation, snapshot effects, scheduling and bounded AI suppression so operators and household visitors can distinguish supported behavior from unqualified guarantees.
- **deployment-calendar**: Provide authoritative deployment-local supper dates and Monday-based weeks, captured calendar references and expiry boundaries, independently of browser and server operating-system timezones.
- **grocery-shopping**: Describe existing household grocery derivation and shopping progress, with explicit compatibility and recovery boundaries.
- **household-identity**: Establish shared household access through passphrase entry and member invitations, apply household access-cookie and API authentication rules, and hand accepted access to separately owned member-context selection.
- **household-live-updates**: Provide the shared household live-update connection and initial schedule snapshot, and describe how received snapshots reconcile the displayed week and Today without implying lossless recovery or complete state convergence.
- **household-members**: Let household members create, rename and remove household member records, with the existing validation, response, pending-feedback and identity-handoff boundaries.
- **installation-assistance**: Let a human or agent assess the existing versioned server installation path, hand off privileged or secret-bearing work safely, and report observed progress without creating another installer or implying unperformed qualification.
- **meal-assignment**: Let household members choose recipes for dated planner slots, assign them, and resolve occupied targets through caller-specific recovery without conflating suggestions with persisted assignments.
- **meal-planning**: Let household members read and navigate planner weeks, interpret displayed schedule and pending suggestions, and distinguish successful reads from retained content. This capability owns week presentation and direct suggestion-read boundaries; assignment, non-cooking plans, rescheduling, lifecycle transitions and calendar policy have dedicated owners.
- **meal-rescheduling**: Let household members rearrange or remove existing dated meal content through dragging, movement, deferral and shared date deletion, preserving each operation’s existing completion and recovery boundaries.
- **member-context**: Select and recover the active household member and carry that context through browser and server requests, preserving the distinction between context binding, member existence and shared household access.
- **member-preferences**: Adapt the household experience using member language and browsing preferences and member-specific preview resolution, while distinguishing browser choices from persisted member settings.
- **non-cooking-plans**: Let household members create, edit and clear recipe-free supper plans, with dated drafts, message validation, pending controls, conflict feedback and a handoff from Home to Planner.
- **planning-lifecycle**: Let household members open and close weekly voting, lock persisted plans and validate day status, and describe overdue finalization without treating stored completion as proof of actual cooking.
- **recipe-capture**: Capture recipes from photos, web links, descriptions and PDFs into the household library. This capability covers source entry and shared-link review, validation and metadata, intake acceptance, background extraction, initial readiness feedback, duplicate advice and configured processing-language requests.
- **recipe-discovery**: Collect member recipe preferences and expose discovery queues and voting suggestions while keeping suggestions distinct from persisted meal assignments.
- **recipe-editing**: Let household members edit existing recipe content, ratings, notes and discoverability, preserving the supported partial-update, persistence, search-invalidation and file-projection boundaries.
- **recipe-library**: Let household members browse eligible reusable recipes, read stored detail and summary facts, and navigate list or stack presentation. This capability retains catalog eligibility, persisted fact representation, readiness reads and vegetarian fact classification.
- **recipe-media**: Let household members view original recipe sources and photos, obtain recipe image assets, append original photos and request hero regeneration while distinguishing dispatch from completed asset delivery.
- **recipe-quality**: Let household members report and review saved recipe issues, request eligible contextual re-import, observe attributed attempts and explicitly resolve reports without conflating feedback with failed-capture management.
- **recipe-recycle-bin**: Let household members move eligible recipes to the Recycle Bin, inspect and restore deleted recipes, and request PIN-protected permanent purge with existing eligibility and failure boundaries.
- **recipe-rotation**: Coordinate cooked cooldown, persistent household rotation intent and supper suitability through existing Discovery and nightly Dreaming surfaces.
- **recipe-search**: Let household members search and filter existing household recipes, retrieve and rank candidates, inspect Similar results, and continue or recover result navigation using published search state.
- **recipe-sharing**: Exchange portable recipes between households via privacy-scrubbed export bundles (native share or file download fallback) and bundle import intake, schema validation, preview presentation, duplicate detection advisory warning, cancellation, and acceptance into the recipe library as a ready recipe.
- **scheduled-maintenance**: Schedule and compose recurring application maintenance, process due maintenance commands and write local reports, distinguishing launch acceptance from child workflow completion and cleanup outcomes.
- **search-indexing**: Produce and repair published recipe search documents and materialized filter and affinity state, preserving lexical availability, embedding compatibility and superseding-content guards independently of search requests.
- **tonight-meal-decisions**: Help ordinary households understand tonight’s supper and choose or recover a meal using existing planning, recipe and cooking capabilities.
- **weekly-household-interest**: Preserve positive household interest from completed planning rounds independently of mutable live votes, without creating individual preference histories.

## Ownership and overlap evidence

Detailed two-sided spans, raw text, hashes, scenario review and per-pair rationale are in [OVERLAP_FINDINGS.md](OVERLAP_FINDINGS.md), [overlap-candidates.json](evidence/overlap-candidates.json) and [overlap-reviewed.json](evidence/overlap-reviewed.json).

| Boundary | Current ownership | Preservation consequence |
|---|---|---|
| Planning / assignment / lifecycle | meal-planning reads; meal-assignment chosen-recipe changes; meal-rescheduling movement/defer/shared date deletion; non-cooking-plans recipe-free journey; planning-lifecycle voting/lock/day lifecycle; deployment-calendar dates | Preserve mutation triggers, explicit dates, partial follow-ups and separate browser-promotion/durable-close boundaries. |
| Discovery / live updates | recipe-discovery eligibility/votes/consensus; household-live-updates transport/publication/reconciliation; meal-planning initial composition | Suggestion is not assignment; received event is not guaranteed delivery. |
| Search / indexing / library | recipe-search retrieval/ranking; search-indexing materialization; recipe-library catalog/detail; recipe-quality report membership; recipe-recycle-bin deletion | Keep retrieval, indexing and persisted eligibility separate; restore has a different indexing trigger. |
| Capture / quality / recovery | recipe-capture intake/readiness; recipe-quality saved issues/contextual attempts; capture-recovery failed intake and retry/clear; background-processing execution; scheduled-maintenance cleanup | Source availability is not contextual eligibility; acceptance is not execution or completed correction. |

**C0041 — proven repeated normative text.** `recipe-capture/spec.md:93–106` and `:263–276` have byte-identical descriptions and matching scenario bodies, with different requirement/first-scenario titles. They cover URL/photo paths invoking shared finalization. Any consolidation must explicitly preserve both path scenarios, requirement mappings and qualifications; deleting a block on the strength of equality would lose traceability. No canonical edit is proposed in this audit.

**C0007 — unresolved ownership, no proven contradiction.** `data-backup-and-recovery/spec.md:65–76` and `demo-household/spec.md:373–384` both project the latest completed non-null management-task result; demo also selects across ordinary/demo workflow types. Outcomes agree, but authoritative ownership of shared projection is not explicit. Clarify before consolidation; prefer a shared projection owner with demo-specific selection as a consumer if a later design confirms that boundary. No new capability is justified yet.

**Challenges that changed interpretation.** Quick Find recency-first versus Discovery likes-first ranking are distinct query contracts (C0031); stream cookie-only checks versus general header precedence are explicitly different action boundaries (C0021); browser Close Voting promotion is non-atomic while persisted round-close is atomic (M001). App-installation preserved wording names a former combined identity owner, but its relocation preamble resolves the member-context owners (C0001). Dropping preambles would manufacture an apparent ownership defect.

Exact-title duplicate pairs: 0. NFC + whitespace-normalized description duplicate pairs: 1. Cross-capability lexical candidates: 50, using lowercased ASCII alphanumeric identifiers, a fixed stop list, Jaccard ≥0.25 and at least five shared terms. All 51 generated pairs and four targeted pairs were reviewed. One remains unresolved on ownership; none remains unreviewed. No contradiction was established in this set. Same-capability paraphrases and cross-capability similarities below the threshold may be missed; semantic recall is not measured.

All 171 recognized inline relative Markdown links resolve syntactically under the bounded local slug checker. This does not validate all Markdown syntax, remote provenance links, semantic ownership or runtime behavior.

## Context and token benchmark

See [BENCHMARK.md](BENCHMARK.md) for workload definitions, exact paths/selection criteria, recall challenge, generation I/O, reads, character counts and exclusions; [benchmark-results.json](evidence/benchmark-results.json) and [benchmark-payloads.json](evidence/benchmark-payloads.json) preserve reproducible payloads.

| Workload | Reviewed requirements / scenarios | Full phase bytes | Scoped index + whole selected blocks/preambles | Initial + final full baseline | Discovery + both full phases | Total overhead |
|---|---:|---:|---:|---:|---:|---:|
| small-ui | 4 / 16 | 14,776 | 9,867 | 29,552 | 39,419 | +33.39% |
| planner-cross-capability | 33 / 100 | 130,762 | 85,068 | 261,524 | 346,592 | +32.53% |
| background-lifecycle | 11 / 36 | 38,423 | 23,844 | 76,846 | 100,690 | +31.03% |

Sparse initial title picks missed 3/31/10 reference requirements and 14/95/33 scenarios. Expanded selections preserve every whole requirement/scenario in the manually reviewed reference sets and all source preambles, with zero recorded omissions relative to those sets. That preservation result is not independent proof of exhaustive semantic completeness or automatic selector recall. Full-scope hash verification and deterministic regeneration passed.

Local generation reads 34 files / 873,568 bytes, plus two metadata artifacts in the benchmark builder; generation I/O is accounted separately from model context and shared once across source-identical workloads. The builder’s roughly 0.03-second time excludes prior inventory parsing. A separate complete inventory-plus-index/benchmark pipeline measured 0.173 seconds, with 68 canonical reads / 1,747,136 bytes plus two metadata reads / 3,141,982 bytes; see [generation-pipeline.json](evidence/generation-pipeline.json). These local application-level I/O counts are separate from model payloads, and one observation is not production performance acceptance. A rich global index alone costs 230,046 bytes: do not inject it universally. No observed cache/frequency data supports amortized model savings.

The pinned CLI already exposes `--no-scenarios`, `--requirements` and one-based `--requirement`. A lead-measured comparison with existing overview payloads plus the same initial/final full phases is retained in [existing-overview-comparison.json](evidence/existing-overview-comparison.json):

| Workload | Current overview bytes | Current overview + both full phases | Proposed discovery + both full phases | Additional bytes |
|---|---:|---:|---:|---:|
| Small UI | 5,957 | 35,509 | 39,419 | +3,910 (+11.01%) |
| Planner | 53,372 | 314,896 | 346,592 | +31,696 (+10.07%) |
| Background | 15,385 | 92,231 | 100,690 | +8,459 (+9.17%) |

This comparison measures the explicit selected-discovery protocol, not an optimal selector or production model run. Context accounting excludes equal shared instructions, request text and tool wrappers. Exact token counts, tokenizer name/version and encoding are unavailable/null because no usable tokenizer was found in the inspected installed environments; no dependency was installed and no characters-per-token estimate substituted. Runtime model cost, latency, cache behavior and reasoning quality were not tested.

## Minimal design, priorities and acceptance

The proposed implementation contract is [DESIGN.md](DESIGN.md): stdlib-only `scripts/agent/openspec_audit.py`, focused tests and an additive `spec:audit` task. Default stdout/read-only; explicit output path; stable ordering/source spans/raw hashes; no persisted index or embedding service. All CLI flags, parser limits, exit behavior, test acceptance, performance targets and rollback are specified there. Proposed production tooling remains unimplemented.

| Priority | Bounded implementation slice after approval | Acceptance / dependency |
|---|---|---|
| P0 | Inventory JSON/text, exact capability filter, spans/hashes/diagnostics and explicit output handling | Test-first Unicode/fences/nesting/malformed/duplicate/span fixtures, deterministic subprocess outputs, zero implicit writes; reconcile all 34 canonical sources and pinned CLI. |
| P1 | Exact duplicate groups and advisory lexical candidates with two-sided evidence | Preserve raw bodies and full scenarios; equal text is not a semantic merge decision; version threshold/stopwords; separate machine output and manual review. Depends on P0. |
| P2 | Optional benchmark mode with versioned curated workload definitions and stale-source checks | Reproduce exact bytes/chars/read arithmetic including generation and full phases; tokens null without compatible installed tokenizer; reference changes fail stale checks. Depends on P0; no loading-policy change. |
| Separate decision | Clarify management-status owner; optionally evaluate shared readiness description | Separate approved canonical change only, exact requirement/scenario/provenance conservation and owner-link reconciliation. No automatic merge. |

No CI gating on similarity scores. Follow test-first harness policy and applicable `task test:agent`, `task spec:check` and scoped final verification for an approved tooling change. Proposed local performance target: inventory median <1s, overlap median <3s, peak RSS <100 MiB over ≥5 warm runs; these targets have not been qualified. Rollback removes additive tooling/task/tests, with no application deployment or data migration.

## Risks and decisions for approval

Parser drift against OpenSpec, lexical false positives/negatives, unstable one-based CLI requirement positions, stale hashes and preamble omissions are material risks. Keep the pinned validator authoritative, whole selected scenarios and owner/evidence qualifications intact, and force review when workload references drift. Rich indexes may cost more context than they save. Runtime and semantic guarantees require evidence beyond structural validation and static accounting.

1. Approve P0 reporting-first tooling implementation, followed by P1/P2 only as bounded accepted slices, or approve the full proposed CLI scope together. No tooling implementation is authorized by this report.
2. Decide the authoritative shared management-status projection owner before any canonical consolidation. The audit leaves this unresolved rather than inventing a new capability.
3. Decide whether URL/photo readiness should remain explicit per-source coverage or enter a separate conservation-preserving consolidation change. Recommendation: leave canonical text intact for now.
4. Retain current full relevant-file review. Any policy replacing that gate with selective reads requires a separate decision and stronger independent recall/model evidence. No tokenizer installation is needed for the proposed byte-only v1.

## Verification and resumption

Passed: strict OpenSpec validation (34/34); independent filesystem metrics and all requirement/scenario source spans/hashes; deterministic inventory/candidate/benchmark regeneration; reviewed pair evidence and explicit classification; bounded canonical-link check; tracked-file preservation at the recorded checkpoint, followed by reconciliation of the unrelated two-file concurrent commit; audit-only worktree scope confirmed. Source check evidence is in [evidence](evidence/). The final repository documentation check is reported in the completion message with its durable run record.

Not available: actual model token counts. Not run: model-quality/latency/billing evaluation and external-store CLI qualification. Not applicable: API, database, browser/device/runtime tests, because application behavior and canonical specifications were unchanged. No audit finding is promoted into runtime qualification.

Resume from [AUDIT_TRACKER.md](AUDIT_TRACKER.md). Verify HEAD, audit-relevant guidance/tool inputs and every canonical source hash before reusing this evidence; a later source change invalidates recorded spans/reference sets. The final unrelated commit leaves canonical content identical; the strict replay script still requires the original recorded HEAD and does not switch branches for the user. [REPRODUCE.md](REPRODUCE.md) describes regeneration in an external temporary directory. Original [PLAN.md](PLAN.md) is copied verbatim; the user-approved audit-directory writes supersede its earlier no-repository-write wording only for audit deliverables. Temporary evidence remains at `/tmp/wfs-openspec-audit.Gst1Xs`; durable payloads, records and experiment source are archived here.
