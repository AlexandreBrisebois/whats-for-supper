# Demo household baseline plan

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
| Demo household: operate a resettable showcase | Snapshot capture/restore, activity clearing, restore schedule, health/auth presentation, actual AI bypass boundaries; no blanket no-AI-cost claim | [demo state methods](../../api/src/RecipeApi/Services/ManagementService.cs), [demo seeder](../../api/src/RecipeApi/Services/DemoWorkflowSeeder.cs), [chat blocker](../../api/src/RecipeApi/Services/DemoModeChatClient.cs), [registrations](../../api/src/RecipeApi/Program.cs) | [demo seeder tests](../../api/src/RecipeApi.Tests/Services/DemoWorkflowSeederTests.cs), [management tests](../../api/src/RecipeApi.Tests/Controllers/ManagementControllerTests.cs), [demo browser tests](../../pwa/e2e/demo-mode.spec.ts) | Identity, snapshot data/assets, workflows, provider boundaries / medium |

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
| U07 | Demo chat blocking is narrower than all-AI blocking | [registrations](../../api/src/RecipeApi/Program.cs), [chat decorator](../../api/src/RecipeApi/Services/DemoModeChatClient.cs), [WebAcquisitionAgent](../../api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs), [hero agent](../../api/src/RecipeApi/Services/Agents/RecipeHeroAgent.cs), [embedding provider](../../api/src/RecipeApi/Services/GeminiEmbeddingProvider.cs). Recheck processor names/direct calls; no blanket no-cost guarantee. | Open |

## Slice evidence and lifecycle records

No slice has been extracted. Use the evidence template in workflow.md once a
bounded slice is selected; do not infer behavior from this inventory row.

## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the demo-household OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/demo-household.md.
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
