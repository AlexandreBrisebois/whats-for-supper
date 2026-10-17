# OpenSpec brownfield baseline plan

## Current ownership after five capability splits — 2026-10-16

Recipe library, Search, quality, household identity and backup/recovery are now organized into the 13 owners below. Their combined **260 requirements / 609 scenarios** are preserved unchanged. Earlier combined-owner counts and ownership statements are historical; the prior meal-planning split and its current directory remain in effect. This reorganization adds no runtime qualification.

| Current capability | Requirements / scenarios | Responsibility |
|---|---:|---|
| [recipe-library](../openspec/specs/recipe-library/spec.md) | 46 / 100 | Catalog browsing, stored detail/facts, summaries and readiness |
| [recipe-editing](../openspec/specs/recipe-editing/spec.md) | 25 / 54 | Content, ratings, notes, discoverability and shared PATCH effects |
| [recipe-media](../openspec/specs/recipe-media/spec.md) | 12 / 27 | Original sources/photos, image assets and hero regeneration requests |
| [recipe-recycle-bin](../openspec/specs/recipe-recycle-bin/spec.md) | 13 / 31 | Soft deletion, Recycle Bin, restore and PIN-protected purge |
| [recipe-search](../openspec/specs/recipe-search/spec.md) | 39 / 90 | Search/filter/retrieval/ranking, Similar and continuation |
| [search-indexing](../openspec/specs/search-indexing/spec.md) | 10 / 19 | Search publication, filter/affinity materialization and bounded repair |
| [recipe-quality](../openspec/specs/recipe-quality/spec.md) | 28 / 74 | Saved-recipe issues, contextual re-import, review and resolution |
| [capture-recovery](../openspec/specs/capture-recovery/spec.md) | 16 / 37 | Failed captures, retry/clear, bulk imports and workflow summaries |
| [household-identity](../openspec/specs/household-identity/spec.md) | 12 / 37 | Household authentication, shared access and invitations |
| [household-members](../openspec/specs/household-members/spec.md) | 14 / 35 | Member record creation, rename and removal |
| [member-context](../openspec/specs/member-context/spec.md) | 16 / 33 | Active-member selection/recovery, identity transport and binding |
| [data-backup-and-recovery](../openspec/specs/data-backup-and-recovery/spec.md) | 24 / 58 | Data export, reconstruction and report/search sidecar compatibility |
| [scheduled-maintenance](../openspec/specs/scheduled-maintenance/spec.md) | 5 / 14 | Recurring maintenance, commands, cleanup and reports |

Historical evidence and original BSL/U/A mappings remain in [recipe-library](openspec-baseline/recipe-library.md), [recipe-search](openspec-baseline/recipe-search.md), [recipe-quality](openspec-baseline/recipe-quality.md), [household-identity](openspec-baseline/household-identity.md), [data-backup-and-recovery](openspec-baseline/data-backup-and-recovery.md). Search-indexing retains provenance from both Search and backup/recovery.

## Current meal-planning ownership — 2026-10-16

Meal-planning documentation is organized into six owners with **111 requirements / 263 scenarios**, matching accepted upstream `e4a48c85` after PR #242 reconciliation. The original split conserved 104/249; incoming Tomorrow changes add seven requirements and fourteen scenarios and update four existing blocks under their current owners. Earlier combined-owner counts, active-change totals and extraction records below are historical; use this directory for current planning ownership. Shared evidence remains in the [meal-planning evidence record](openspec-baseline/meal-planning.md). Qualification limits and historical source identities remain unchanged.

| Current capability | Requirements / scenarios | Responsibility |
|---|---:|---|
| [meal-planning](../openspec/specs/meal-planning/spec.md) | 17 / 44 | Week reads, navigation, display and direct suggestion reads |
| [deployment-calendar](../openspec/specs/deployment-calendar/spec.md) | 7 / 20 | Timezone, date context, captured references and rollover |
| [meal-assignment](../openspec/specs/meal-assignment/spec.md) | 29 / 64 | Quick Find, assignment, first-open placement and replacement recovery |
| [meal-rescheduling](../openspec/specs/meal-rescheduling/spec.md) | 26 / 65 | Movement, drag, defer, recipe removal and shared deletion |
| [non-cooking-plans](../openspec/specs/non-cooking-plans/spec.md) | 18 / 39 | Recipe-free supper plans and editing/clearing UI |
| [planning-lifecycle](../openspec/specs/planning-lifecycle/spec.md) | 14 / 31 | Voting, locking, day validation and overdue finalization |

Progressively document WFS's existing behavior as an OpenSpec baseline. This is
brownfield documentation work. The plan is split by capability so each execution
prompt needs only the shared workflow and its selected capability plan.

## Current baseline — consolidated and archived, 2026-10-16

The user approved acceptance/promotion of the two final drafts and archival of
all 98 baseline changes. **17 main capabilities, 648 requirements / 1,559 scenarios;
zero active changes.** The complete baseline change history is retained under
`openspec/changes/archive/2026-10-16-baseline-*`. Ten older changes retain their
approved missing-optional-design warning. No older delta was replayed over later
corrections. Application code and existing staged work were preserved; nothing
was committed or deployed.

For new work, begin with the main capability spec and the
[prioritized resolution backlog](openspec-baseline/backlog/README.md), then create
one new bounded change. The [accepted Tomorrow and deployment-calendar policies](openspec-baseline/backlog/decisions.md)
are desired behavior; existing implementation gaps remain explicit in the backlog.
Archival closes documentation lifecycle work, not those defects or runtime qualification.
See the [completion and preservation record](openspec-baseline/backlog/consolidation-completion.md).
The checkpoints below retain extraction and promotion provenance; they are not an
active generation queue.

## Historical extraction workflow

1. Read [AGENT.md](../AGENT.md) and its active-host loading rules.
2. Read the [shared workflow, evidence standard and boundaries](openspec-baseline/workflow.md).
3. Open one capability below and use its **Execution prompt**, replacing the session
   instruction with the selected bounded work. Read other owners only for immediate
   dependencies; the complete history is not required.

Each capability file owns its current checkpoint, source/test starting points,
relevant decisions and uncertainties, evidence, lifecycle records and prompt.
Historical next-step recommendations do not authorize successor work.

## Capability plans

Historical promotion checkpoint: **all then-active deltas promoted, 2026-10-16**. Eight promoted main
capabilities; all 42 then-active changes reconciled into the main specs, with newer
recipe-library corrections taking precedence over their original ADDED wording.
Changes are archived; this paragraph records the earlier promotion checkpoint. Counts below are requirements/scenarios for extracted
slices, not whole-capability runtime acceptance. Runtime qualification remains
deferred under A34. This promotion authorizes no successor extraction,
implementation or archival.

| Capability | Recorded baseline | Execution context |
| --- | --- | --- |
| Household identity | Ordinary generation reconciled; promoted 42/105; exclusions/A34 retained | [household-identity](openspec-baseline/household-identity.md) |
| Recipe library | Promoted 96/212, including all 11 reviewed remaining drafts and five corrections; limitations/A34 retained | [recipe-library](openspec-baseline/recipe-library.md) |
| Recipe sharing | Accepted/promoted 11/37, including pending-actions 2/3 (RS-P01); discrepancies/A34 retained; changes archived | [recipe-sharing](openspec-baseline/recipe-sharing.md) |
| Recipe capture | Approved scope accepted/promoted 41/110, including intake boundaries, completion advice and processing-language requests; exclusions/A34 retained | [recipe-capture](openspec-baseline/recipe-capture.md) |
| Recipe quality | Accepted/promoted 44/111 including all three remaining reviewed deltas (RQ-P01); qualifications/A34 retained; changes archived | [recipe-quality](openspec-baseline/recipe-quality.md) |
| Recipe search | Accepted/promoted 47/105 from all five reviewed deltas (SR-P01); limitations/A34 retained; changes archived | [recipe-search](openspec-baseline/recipe-search.md) |
| Recipe discovery | Accepted/promoted 21/47 from three reviewed deltas (DISC-D03); U04/DISC-U01–U08 exclusions and A34 retained; changes archived | [recipe-discovery](openspec-baseline/recipe-discovery.md) |
| Meal planning | Ordinary household baseline accepted/promoted 96/222, including all five remaining deltas (MP-P01); owner exclusions/uncertainties and A34 retained; changes archived | [meal-planning](openspec-baseline/meal-planning.md) |
| Tonight meal decisions | Accepted/promoted 27/57 from all three reviewed deltas (TM-P01); exclusions/TM-U01–TM-U10 retained; A34 not-run; changes archived | [tonight-meal-decisions](openspec-baseline/tonight-meal-decisions.md) |
| Grocery shopping | Accepted/promoted 37/82 from seven reviewed deltas (G06); U06/U100 and other qualifications retained; changes archived, runtime deferred | [grocery-shopping](openspec-baseline/grocery-shopping.md) |
| Cooking | Promoted 26/58; exclusions retained; runtime deferred | [cooking](openspec-baseline/cooking.md) |
| Member preferences (language, browse, Feature Flags / Preview features) | Accepted/promoted 26/57 from all five drafts (MP-P01); limitations retained; A34 not-run; changes archived | [member-preferences](openspec-baseline/member-preferences.md) |
| App installation | Ordinary source-supported baseline complete/promoted 17/41 across three slices (AI-D01); U11/U74 and exclusions retained, runtime deferred; changes archived | [app-installation](openspec-baseline/app-installation.md) |
| Household live updates | Promoted 30/79, including three remaining shared-scope deltas; A34/U95–U101 retained | [household-live-updates](openspec-baseline/household-live-updates.md) |
| Background processing | Promoted 30/98, including remaining shared behavior (BP-R01); qualifications retained | [background-processing](openspec-baseline/background-processing.md) |
| Data backup/recovery | Accepted/promoted 31/76 from six reviewed deltas (DBR-P01); DBR-U01–U08/U12/A34 retained; changes archived | [data-backup-and-recovery](openspec-baseline/data-backup-and-recovery.md) |
| Demo household | Accepted/promoted 26/62 from six verified deltas (DH-P01); U07/DH-U01–DH-U09 retained; A34 deferred; changes archived | [demo-household](openspec-baseline/demo-household.md) |

## Independent audit and human-guided resolution — 2026-10-16

The [live backlog and implementation-wave proposal](openspec-baseline/backlog/README.md)
supersede the earlier no-supported-omissions conclusion. The entry-driven audit
found missing Planner gesture and search/operator producer coverage; two new
documentation-only changes were generated and subsequently accepted, promoted and archived under the current checkpoint above. The
[coverage matrix](openspec-baseline/backlog/coverage-matrix.md) maps all 17 owners
and links exact journey/scenario/assertion evidence; the
[discrepancy register](openspec-baseline/backlog/discrepancy-register.md) preserves 232
original U identifiers. Feature Flags already have 12 requirements/28 scenarios
under member-preferences and need no duplicate capability.

The user has now settled [Tomorrow push-through-following-weeks and deployment-local
UX dates with injected clocks](openspec-baseline/backlog/decisions.md). These are
corrective backlog requirements, not claims that current code conforms. Human
review, promotion and runtime qualification remain separate; no fixes are authorized
by the queue. Current checks and limits are in
[verification](openspec-baseline/backlog/verification.md).

## Current promotion checkpoint — DBR-P01, 2026-10-16

The user accepted and authorized promotion of the six remaining backup/recovery
review drafts with “promote”. All 17 approved capability paths now have promoted
main specs: **633 requirements / 1,525 scenarios**, with 96 source changes still
active. The reconciled supported documentation generation/review/promotion queue
is complete. This is not application-wide runtime acceptance: A34, explicit
exclusions, unresolved policy and device/deployment qualification remain in force.
See [the promotion record](openspec-baseline/data-backup-and-recovery.md#dbr-p01--acceptance-and-promotion-2026-10-16)
and [updated reconciliation checkpoint](openspec-baseline/reconciliation.md).
No archival, application implementation or runtime qualification was performed.

## Historical reconciliation — R12, 2026-10-16

All 17 approved capability plans and their scoped workflows are accounted for in
[the phase-12 review](openspec-baseline/reconciliation.md). Actual inventory:
16 previously promoted main specs (602 requirements / 1,449 scenarios), 96 active
changes, and six existing backup/recovery drafts (31/76) awaiting human review.
No genuinely missing supported extraction was found; no draft was regenerated,
accepted, promoted or archived in R12. Remaining documentation lifecycle work is
human review of those six drafts, then separately authorized promotion. The overall
baseline is **not accepted or baseline-complete**. A34, existing unresolved policy,
explicit exclusions and deferred device/deployment qualification remain intact.
Historical initial phase/progress labels are not the current generation inventory.

## Shared ownership and provenance

The [shared workflow](openspec-baseline/workflow.md) retains approved ownership,
phase sequencing, evidence templates, validation rules and global decisions.
The [historical record](openspec-baseline/history.md) preserves the original
cross-session approvals, uncertainties, checkpoints, session log and former
all-plan prompt through A84. Consult it only for historical provenance; use the
capability prompts for new sessions.

Existing links to this path remain valid as navigation. References to a BSL/A/U
record resolve through the named capability; global A decisions are also in the
shared workflow. Evidence IDs and source identities are unchanged. Moved Markdown
links have been adjusted for their new directory; historical command/path text
continues to describe its original session.

For new work, update the selected capability file. Keep this index small, and do
not append per-slice evidence or a second full session ledger here.
