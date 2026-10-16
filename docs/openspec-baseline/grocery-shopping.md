# Grocery shopping baseline plan

## Current checkpoint and scope

Discovery/extraction not started at A84 (2026-10-16). No placeholder OpenSpec
specification is created by this plan.
Runtime qualification remains not-run/deferred under A34. Next action: await a
separately selected bounded slice or lifecycle action; no successor is authorized
by this reorganization. Slice headings and next-step recommendations retained
below are historical; later promotion records supersede earlier draft labels.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Grocery shopping: derive needs and share shopping progress | Structured supply/text fallback, normalized names and unit buckets, quantities, aisle/manual overrides, individual/bulk checks, duplicate rendered rows/shared display-name check state | [recompute service](../../api/src/RecipeApi/Services/GroceryRecomputeService.cs), [category service](../../api/src/RecipeApi/Services/IngredientCategoryService.cs), [GroceryList](../../pwa/src/components/planner/GroceryList.tsx) | [recompute tests](../../api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs), [grocery integration](../../api/src/RecipeApi.Tests/Integration/GroceryItemsIntegrationTests.cs), [UI tests](../../pwa/src/components/planner/GroceryList.test.tsx) | Calendar, ingredients, units/categories, live updates / high computation; concurrent writes medium |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

No capability-specific authorization is recorded yet.

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U06 | Grocery keys, aggregation and concurrency need precise language | [GroceryRecomputeService](../../api/src/RecipeApi/Services/GroceryRecomputeService.cs), [grocery toggle](../../api/src/RecipeApi/Services/ScheduleService.cs), [UI duplicate-row tests](../../pwa/src/components/planner/GroceryList.test.tsx). Do not promise multilingual canonical identity or atomic concurrent map updates. Aisle correction has implemented UI controls and focused tests. | Open |
| U100 | Raw connected grocery dictionary misses AdditionalDataHolder path | BSL-household-live-updates-002/003: server plain dictionary → hook JSON.parse → applySnapshot reads only additionalData; wrapper-built unit assertion cannot prove wire reconciliation. | Record check-map retention alongside groceryItems replacement; withhold complete grocery reconciliation and atomic multi-store visibility; no code/contract fix |

## Slice evidence and lifecycle records

No slice has been extracted. Use the evidence template in workflow.md once a
bounded slice is selected; do not infer behavior from this inventory row.

## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the grocery-shopping OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/grocery-shopping.md.
Use these as the execution context; do not read the full history or other
capability plans unless an immediate dependency requires a specific section.
Resolve installed OpenSpec workflow/root before artifact writes. Preserve staged,
unstaged and untracked work. Recheck source identity and affected evidence.

Current user messages define scope. Reuse recorded decisions without asking for
approval again within already authorized work. Do not infer new drafting,
promotion, archive, implementation or runtime qualification authority from history.
Trace one selected observable journey through source, contracts and actual test
assertions/substitutions. Keep disputed claims non-normative. No application,
test, contract, client, SQL, configuration or dependency edits.

Update this capability plan's evidence/mappings, decisions, uncertainty, artifact
status, session log and next action. Update the small index only if its routing or
summary changes. Validate selected artifacts and run task verify with every changed
path. Distinguish passed, failed, blocked, not-run and not-applicable; source
support is not runtime verification. Stop at the authorized session boundary.
```

## Next-session record

Use this section for new capability sessions after the split. The earlier evidence
and lifecycle records above retain their original chronology.

```text
Session/date:
Branch, commit, relevant dirty inputs:
Current user authorization and selected capability/slice:
Completed discovery/evidence IDs:
Artifact paths and status (draft/validated/accepted/promoted separately):
Human decisions and unresolved questions:
Checks: passed / failed / blocked / not-run / not-applicable, with reasons:
Limitations and excluded assertions:
Exact next bounded action:
```
