# Tasks

All walkthrough/extraction tasks are pending. The [inventory](../../../docs/telemetry/journey-inventory.md) is a source-backed seed written during planning, not completion of these tasks. This change uses `skip_specs: true` because it changes no application behavior. Documentation checks replace TDD. Use the [session prompt](../../../.agents/prompts/telemetry-session.md), mode `investigate`, for one group only.

## 1. I1 — Planning and multi-vote Discovery

**Outcome and scenarios:** Inventory rows J02–J04: open, participate, personal exhaustion, family convergence, close promotion/commit and lost-response recovery.
**Owners and boundaries:** Canonical `planning-lifecycle`, `recipe-discovery`, `meal-planning` and `household-live-updates`; Planner/Discovery pages, week/discovery stores, API wrappers/OpenAPI, Schedule/Discovery controllers/services/VotingSession, current tests named in the inventory.
**Dependencies and prerequisites:** None for source work. Isolated UI/synthetic data for a live walkthrough; absence remains not-run. F1–F3 are not required to document current behavior.
**Acceptance boundary:** Exact source/contract/commit/presentation chain for each row, proposed event owners and one bounded successor candidate; no instrumentation.

- [ ] 1.1 Trace J02–J04 in current specs/source/tests, including in-flight votes after convergence and partial promotion before failed close. Update every coverage-card field, source identity and exact owner references; verify cited contract methods and tests exist, with no claim that reading them ran them.
- [ ] 1.2 Walk the selected paths and one failure/recovery path using an existing isolated UI with synthetic data when available; record actual environment/steps/results or explicit not-run/blocked cells. Reconcile observed contradictions as findings, without editing product behavior. Deliver one recommended next proposal boundary in the inventory and run scoped `task verify` for owned docs.

## 2. I2 — Assignment, non-cooking and movement

**Owners and prerequisites:** J05–J07; `meal-assignment`, `meal-rescheduling`, `non-cooking-plans`, `tonight-meal-decisions`, planner/Home/Quick Find/recovery components, week/today stores, generated wrappers, ScheduleService and its Assignment/Tomorrow parts. Read I1 only where round/plan state affects a selected scenario.

- [ ] 2.1 Fill J05–J07 coverage cards after tracing assign/replace, no-cook save/clear, move/swap/defer/remove, cancellation and recoverable partial success to actual trusted boundaries. Verify contracts and targeted tests; document proposed emitters without business IDs, dates or notes and name each unresolved semantic decision.
- [ ] 2.2 Record isolated UI success and failure/recovery walkthroughs or explicit unavailable statuses; verify no movement/assignment is inferred from a preview or later failed read. Update inventory/tracker, recommend one bounded successor and run scoped documentation verification; stop before any emitter or contract change.

## 3. I3 — Grocery checks and extras

**Owners and prerequisites:** J08–J09; `grocery-shopping`, GroceryList, useSchedule/week/planner stores, ScheduleController/ScheduleService grocery methods, GroceryCheckCoordinator/GroceryExtraService, grocery check/extras tests. Review concurrent writes and future/historical extra semantics.

- [ ] 3.1 Fill J08–J09 cards for presented lists, check/uncheck, extras add/check/rename/category/delete and failure/reconciliation. Separate optimistic state, persisted map/extra state and publication failure; verify cited API methods, concurrency rules and tests. Record that no saved shopping-trip completion exists.
- [ ] 3.2 Walk synthetic phone/wide presentation and persisted/rejected changes where available; record actual statuses. Propose a precise all-current-items-checked observation with pending writes, extras, empty lists, unchecking, list changes and remote updates considered; leave its emitter unapproved until semantics are resolved. Update tracker and run scoped documentation verification; stop before adding completion behavior.

## 4. I4 — Entry, finding recipes and cooking

**Owners and prerequisites:** J01, J10–J12; `household-identity`, `member-context`, `household-members`, `recipe-search`, `recipe-library`, `cooking`, `tonight-meal-decisions`; exact UI/API/store/test owners in the inventory.

- [ ] 4.1 Trace invitation/login/member recovery, Search/Browse/detail, GOTO/tonight decisions and cooking/return-to-original/finish. Fill cards with actual trust boundaries, handled failures and interruption/long-pause behavior. Verify source/test/contract links and identify missing event owners without collecting queries, recipe/person IDs or content.
- [ ] 4.2 Record available isolated walkthroughs and unknown/device cells honestly; distinguish automatic overnight finalization from a user cooking completion. Update inventory/tracker and one successor recommendation; run scoped docs verification. No cookies, authentication behavior, preference policy or cooking UI changes.

## 5. I5 — Capture, repair, sharing and library maintenance

**Owners and prerequisites:** J13–J16; `recipe-capture`, `capture-recovery`, `recipe-quality`, `recipe-sharing`, `recipe-recycle-bin`, background processing; current feature/API/workflow/test owners in the inventory. Do not enable real AI/provider collection or use household content.

- [ ] 5.1 Trace acceptance versus readiness/failure, retained-work retry, issue-save/reimport/review/resolve, export/import and bin/restore. Fill coverage cards; identify bounded async operation correlation and any restart/cross-document privacy conflict before proposing a mechanism. Verify each test/source/contract boundary; do not reuse persistent business IDs as telemetry identity.
- [ ] 5.2 Record available synthetic UI evidence and receiver gaps, with real provider, deployed sharing and physical-phone cells separate. Update tracker/inventory and recommend one bounded successor; run scoped docs verification. Stop before instrumentation, package/deployment changes, mass successor generation or receiver implementation.

## 6. Investigation reconciliation

- [ ] 6.1 Reconcile inventory source identity and evidence states across selected groups; task boxes remain unchecked for missing required source/owner work or required walkthrough evidence. Validate this change with `openspec validate inventory-telemetry-journeys --strict --no-interactive`, review scope and run `task verify -- <complete reviewed docs>`. Report exact status and `record_path`; propose future journey changes separately rather than embedding their implementation here.
