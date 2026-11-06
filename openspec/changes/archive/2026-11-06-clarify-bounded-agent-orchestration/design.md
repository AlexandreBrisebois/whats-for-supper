# Design

## Context and Existing Ownership

The [proposal](proposal.md) bounds a guidance-only change. The [agent assessment](agent-assessment.md) separates official claims, installed-client observations and recommendations; custom-agent definitions are not part of this implementation.

The current checkout is `recipe-view-redesign` at `92bd234bfd156101a32e14ecacb053f421ee910e`, with two unrelated Planner edits. The earlier product proposals are already archived. No application requirement changes in this proposal; `skip_specs: true` prevents an invented canonical agent capability.

| Existing owner | Already covers | Actual gap / proposed edit |
|---|---|---|
| `AGENT.md` | Authorization, selected task scope, trust and modes | None; leave unchanged |
| `.agents/core/context-loading.md` | Conditional loading, minimal context, bounded scope, dependent work, conditional delegation, one writer, handoff scope/ownership/acceptance/stopping point and lead review | Add proportionate assignment selection, reuse/fresh-context judgment and elapsed-time/progress reassessment within these existing sections |
| `.agents/adapters/codex.md` | Native mechanics, shared policy and host restrictions | No duplication or new settings; leave unchanged |
| `.agents/core/execution-harness.md` | Worktree/resource caveat, command effects, invocation records/durations and final integration checks | Add practical coordination for concurrent ports/DBs/processes and broad CPU-heavy runs; reuse existing evidence rules |
| OpenSpec config and task template | Dependency-ordered slices, test-first seams, actual acceptance and artifact context | Leave unchanged; delegation must preserve required context rather than summarize it away |
| Taskfile/scripts/skills | Reproducible checks and reusable procedures | Leave unchanged; do not turn executors into agents |

One bounded read-only reviewer compared shared owners while the lead investigated official docs and local compatibility. This is actual parallel research in the existing session; it is not evidence that the proposed guidance improves elapsed time or token consumption. No comparable performance benchmark was run.

## Decisions and Tradeoffs

1. **Extend the existing owner, not the entrypoint.** Put coordination judgment in context-loading and test-resource mechanics in execution-harness. An extra coordinator skill, mandatory agent persona, global config or duplicated adapter rule would add another place to drift.
2. **Use a decision rule, not an agent quota.** Substantial work merits identifying the critical dependency chain and independently useful assignments. Parallelize only when authorized, safely separable and worth coordination cost. A trivial edit, tightly coupled shared contract or one critical unresolved decision can stay direct. Do not require subagents merely to satisfy a process.
3. **Use minimum sufficient context, including all required context.** Start from the selected spec/task, relevant approved dependencies, affected owners and concrete evidence. Handoffs inherit the existing scope/output/ownership/acceptance/stopping-point contract. Prefer a targeted handoff to unrelated full history when the host supports it, but never omit mandatory artifact loading or claim a summary is proof of contract agreement.
4. **Reuse context deliberately.** Continue a worker on a related bounded slice when its context and checkpoint remain valid. Prefer a fresh worker for unrelated/noisy history or independent review. Revalidate stale assumptions and ownership on resume; never restart a still-running command because a conversation turn ended. A fresh native worker is not authorization for a new remote/cloud session.
5. **Make time visible without making it a quality deadline.** At meaningful boundaries and during unexpectedly long work, inspect actual process/worker status, results, elapsed time and contention. Report progress/blockers factually. Re-scope staffing or sequence to reduce waste without stopping owned checks casually, repeating unchanged runs, or dropping required acceptance. No hard timeout, polling loop, stopwatch telemetry or performance promise is introduced.
6. **Coordinate shared resources explicitly.** Source-file independence does not imply independent test ports, DBs, server processes or CPU. Plan dedicated resources when tests can safely overlap; otherwise serialize the conflicting/heavy runs. Do not kill shared processes or change test topology to manufacture concurrency. Existing invocation-specific records and the lead's integration responsibility remain authoritative.
7. **Defer custom-agent files.** Optional roles are assessed, not installed. Version/help observations do not qualify standalone definition loading or hosted support. These unknowns do not block a host-neutral guidance change because it requires no such capability.

## Proposed Insertion Text for Review

This section preserves the approved insertion wording. Implementation integrates it with the existing sections rather than adding duplicate policy owners; qualification is recorded below.

### Context-loading: extend decomposition and context hygiene

> For substantial work, identify the dependency chain and bounded assignments with concrete outcomes. When delegation is authorized, use independent assignments in parallel where their expected benefit exceeds coordination cost; continue useful critical-path work while they run. Keep trivial, tightly coupled or unresolved-dependent work direct. More agents are not a completion criterion.
>
> Reuse a worker for a related bounded assignment when its relevant context, evidence and ownership remain valid. Prefer fresh scoped context for unrelated work, noisy history or an independent review. Pass the existing handoff fields and required OpenSpec dependencies; do not copy unrelated conversation history or replace mandatory context with a summary. Recheck actual worker and command state before resuming or retrying uncertain work.
>
> Consider elapsed time at meaningful boundaries and when work takes unexpectedly long. Inspect actual progress, results, blockers and contention, then adapt the remaining assignments or sequence and communicate material changes. Do not claim workers are running without evidence, restart active checks for a status update, or reduce required verification to meet a time estimate. Use the execution-harness owner for concurrent test-resource coordination.

### Execution-harness: extend preparation and verification resource guidance

> Before overlapping test or service work, coordinate ownership of ports, databases, server processes and output records, as well as shared CPU/memory capacity. Use distinct task-owned resources where supported; serialize runs that contend or require shared mutation. Avoid redundant simultaneous broad gates. Inspect ownership and uncertain outcomes before cleanup or retry, and clean up only the resources that task owns. Keep each run's invocation-specific evidence and the required combined integration verification; parallel results do not automatically establish an integrated pass.

## First Observable Slice

Review the context-loading insertion against two worked assignments: one small local edit that stays direct, and one substantial investigation with an authorized independent source review and documentation review. Each must have a clear outcome, bounded context, required spec dependencies, ownership, acceptance and stopping point. This is instruction-meaning review, not a model benchmark or application behavior test.

The resource paragraph then adds a concrete cross-owner scenario: two source-independent tasks both require the same test server/port. Their source reviews can overlap, but conflicting service runs must coordinate separate owned resources or serialize. They retain their own invocation records and one lead-controlled final integration check.

## Representative Acceptance Review

| Situation | Expected interpretation | Evidence appropriate to this change |
|---|---|---|
| Small reversible single-file adjustment | Direct work is appropriate; no mandatory staffing or packet | Reviewer can follow the proposed wording without inventing an agent |
| Two authorized independent read-heavy assignments | Bounded workers may run concurrently while lead preserves the selected critical path | Worked assignment scopes include required inputs, outcomes and stopping points |
| Shared contract unresolved | Resolve its ownership/behavior before dependent parallel implementation | Plan does not dispatch competing writers or incompatible contracts |
| Closely related follow-up with valid worker checkpoint | Reuse the worker after state/evidence/ownership check | Handoff states what remains relevant and what must be reread |
| Unrelated history or independent second opinion | Fresh scoped context can reduce noise/bias | No full transcript dump, omitted required artifact or implied new-session permission |
| Two tests need the same port/database or heavy broad gates | Allocate supported independent owned resources or serialize | No process killing, shared DB mutation or claimed speedup from contention |
| Long test or stopped tool result | Inspect actual status/outcome; report known results and blockers | No blind retry, invented parallelism, unconditional cancel or quality shortcut |
| Separate worker test passes | Lead reconciles raw records with current integration state and required acceptance | `record_path`/identity remain invocation-specific; no last-run substitution |

## Compatibility and Reversal

The proposed instructions are shared across hosts and subordinate to host/user authorization. They require no named TOML support, model override, tool availability, remote session, persistent settings or change to permission modes. The Codex adapter retains its existing native routing. Reversal removes only these task-owned paragraphs, preserving unrelated guidance and all existing verification commands.

## Risks and Deferrable Questions

Over-delegation can cost more time and tokens; under-scoped handoffs can omit requirements; reused context can retain stale assumptions; parallel tests can compete for a shared server even when source writes do not overlap. The proportional decision rule, existing context/acceptance owners, explicit resource coordination and final scope review mitigate these risks. Static validation cannot guarantee future agent compliance or a performance improvement.

Whether a named scope reviewer offers enough repeated benefit is a later optimization question. It cannot change this guidance-only task or authorize definitions. No product/host behavior question remains unresolved for this proposal.

## Implementation and acceptance evidence — 6 November 2026

Alex explicitly authorized apply. The two shared owners now contain the accepted guidance; no adapter, script, Taskfile, skill, config/hook or custom-agent definition changed. The prior source observations and compatibility assessment remain scoped to their original preparation; this implementation adds no custom-agent discovery or runtime performance claim.

| Representative case | Applied guidance / review outcome |
|---|---|
| Small single-file task | Decomposition explicitly keeps trivial work direct; no agent quota |
| Independent authorized assignments | Dependency chain, bounded outcomes and expected coordination benefit determine parallelism; lead continues useful work |
| Shared unresolved contract | Dependent changes remain sequential and unresolved-dependent work stays direct; one writer and existing handoff ownership remain intact |
| Related valid follow-up | Worker reuse requires valid relevant context, evidence and ownership |
| Unrelated history / independent review | Fresh scoped context is preferred without omitting required OpenSpec dependencies or mandatory reading |
| Shared port/DB or heavy gates | Execution-harness requires resource ownership, distinct supported resources or serialization, and avoids redundant broad gates |
| Long or uncertain command | Elapsed-time inspection checks actual progress/outcomes; it does not justify blind retry, cancelling an active check for status or weakening verification |
| Separate worker passes | Each invocation retains its evidence and combined integration remains required; existing lead reconciliation still applies |

The lead reviewed the task-owned diff against before-images; a reused bounded read-only reviewer independently found no issue across the eight cases. The optional reviewer is not a completion gate. The actual two-file change is 31 added lines and two replaced lines. A malformed initial patch was rejected before edits; the corrected patch applied successfully. A later optional `ps` inspection was denied by the Mac sandbox before execution; no retry or escalation was needed, and the existing tool session supplied the check outcome.

Slice verification `.task/agent-finish/runs/cf2ce84d52344e4a84066ba6e7c71833.json` passed documentation, all 37 strict OpenSpec items, the existing 220-case Python harness run (219 passed, one explicit skip) and Node harness checks. Source/runtime identity `f9cbc295ed313d9be6f85bbf2d6d8c7d2871a1bb13262c135ea7e587edc771da` remained stable. Its runtime scope conservatively used the full fingerprint because `python3` and the verifier resolved different interpreter installations; the selection was not weakened. No new tests were introduced for prose, and application/API/database checks were not applicable.

This later task/evidence publication has its own final reviewed-scope verification. Final records, before-images, exact selected paths and preservation results are in `.task/harness-orchestration-apply/outcome.json`; the earlier slice result retains its original content identity. No performance gain, product integration behavior or named-agent compatibility is established by these documentation/harness checks.
