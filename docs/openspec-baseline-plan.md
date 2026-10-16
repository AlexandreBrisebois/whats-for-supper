# OpenSpec brownfield baseline plan

Progressively document WFS's existing behavior as an OpenSpec baseline. This is
brownfield documentation work. The plan is split by capability so each execution
prompt needs only the shared workflow and its selected capability plan.

## Start a session

1. Read [AGENT.md](../AGENT.md) and its active-host loading rules.
2. Read the [shared workflow, evidence standard and boundaries](openspec-baseline/workflow.md).
3. Open one capability below and use its **Execution prompt**, replacing the session
   instruction with the selected bounded work. Read other owners only for immediate
   dependencies; the complete history is not required.

Each capability file owns its current checkpoint, source/test starting points,
relevant decisions and uncertainties, evidence, lifecycle records and prompt.
Historical next-step recommendations do not authorize successor work.

## Capability plans

Checkpoint: **A86, 2026-10-16**. Eight promoted main capabilities; 22 active changes
recorded at that checkpoint. Counts below are requirements/scenarios for extracted
slices, not whole-capability completion. Runtime qualification remains deferred
under A34. No new extraction, promotion, archive or implementation is authorized
by this split.

| Capability | Recorded baseline | Execution context |
| --- | --- | --- |
| Household identity | Promoted 36/92 | [household-identity](openspec-baseline/household-identity.md) |
| Recipe library | Promoted 55/122; coverage partial (2026-10-16 audit) | [recipe-library](openspec-baseline/recipe-library.md) |
| Recipe sharing | Promoted 9/34 | [recipe-sharing](openspec-baseline/recipe-sharing.md) |
| Recipe capture | Promoted 37/92 | [recipe-capture](openspec-baseline/recipe-capture.md) |
| Recipe quality | Promoted 37/92 | [recipe-quality](openspec-baseline/recipe-quality.md) |
| Recipe search | Not started | [recipe-search](openspec-baseline/recipe-search.md) |
| Recipe discovery | Not started | [recipe-discovery](openspec-baseline/recipe-discovery.md) |
| Meal planning | Promoted 30/70 (week reading and empty-day assignment) | [meal-planning](openspec-baseline/meal-planning.md) |
| Tonight meal decisions | Not started | [tonight-meal-decisions](openspec-baseline/tonight-meal-decisions.md) |
| Grocery shopping | Not started | [grocery-shopping](openspec-baseline/grocery-shopping.md) |
| Cooking | Not started | [cooking](openspec-baseline/cooking.md) |
| Member preferences | Not started | [member-preferences](openspec-baseline/member-preferences.md) |
| App installation | Not started | [app-installation](openspec-baseline/app-installation.md) |
| Household live updates | Promoted 15/38 | [household-live-updates](openspec-baseline/household-live-updates.md) |
| Background processing | Promoted 14/42 | [background-processing](openspec-baseline/background-processing.md) |
| Data backup/recovery | Not started | [data-backup-and-recovery](openspec-baseline/data-backup-and-recovery.md) |
| Demo household | Not started | [demo-household](openspec-baseline/demo-household.md) |

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
