# Context loading and scope

## Entry and conditional loading

Start with the current request and [AGENT.md](../../AGENT.md), this document and
only the active host's adapter. Reuse content already supplied in the session;
do not re-read it merely because another document links to it.

| Load | When |
|---|---|
| Selected spec requirements, design, task and immediate dependencies | A spec task is selected; load only its relevant manifest entries |
| [Mission](mission.md) | Product behavior, UX or engineering posture is relevant |
| [Contract/testing](contract-testing.md) | Planning, implementing or verifying contract, code or test changes |
| [Execution harness](execution-harness.md) | Running commands or validating/completing implementation |
| [Ontology](ontology.md) | Terms or boundaries need clarification |
| Relevant contract and directly affected source/tests | Needed to establish the selected change's behavior |
| [Network topology](network-topology.md) | Network, deployment, cookies or SSE origin work; verify against current configuration |
| [Home E2E reference](../../.kiro/steering/home-e2e.md) | Home SSR/Playwright investigation only |
| HANDOVER via `task agent:status` | Resuming work or resolving active-state ambiguity |
| JOURNAL, ADRs or a specific archived spec | A current question requires historical rationale |
| A specific skill or prompt | Explicitly invoked, or its specialized procedure is needed for the selected task |

Links are navigation, not recursive loading instructions. No skill is a mandatory
startup dependency. Load only the supporting files needed by an activated skill;
do not load the registry or follow skill cascades to orient yourself. Archives and
host memory are optional context under the shared trust boundary.
Repository memory sources are retired; verified facts live with their owners.

## Bound the work

Identify the outcome, authorized files/effects, acceptance checks and stopping
point before edits. Prefer the smallest sufficient change; preserve unrelated
tracked and untracked work. For application behavior, prefer vertical slices through the affected seams with
end-to-end acceptance. Do not fold adjacent cleanup into the task. A selected
slice stays bounded even if later dependencies or unrelated failures are visible.

Resolve consequential unknowns about intent or scope before dependent work.
Existing authorization remains valid within its stated scope. Load targeted
source and immediate dependencies to resolve technical uncertainty; do not expand
to the entire repository. For complex behavior, trace the affected seams before
editing; a named tracing skill is not required for that investigation.

## Decomposition and context hygiene

Keep dependent changes sequential. Where independent work is useful and authorized,
use bounded delegation with explicit inputs, expected output and file ownership.
Only one writer owns a shared file at a time; read-only reviewers may inspect it.
Host adapters describe available delegation mechanics, not a different scope policy.

Summarize findings and narrow context between steps. Check the current task/spec
first, targeted code next, then history only if still needed. A large context
window is not a reason to load unrelated material.

## Investigation

For an unknown or complex path, start at the reported component, route or failing
test. Follow the API wrapper/generated client → approved OpenAPI operation →
controller → service → persistence or workflow boundary, loading only affected
source and immediate dependencies. Use the conditional [WFS source map](wfs-source-map.md)
as navigation, then verify current code. `task agent:slice -- <route>` and
`task agent:api` support discovery; their static output is not proof of live parity.

Record the ordered source paths, representation changes (DTO/entity/client/state),
contract agreement or mismatch, observed side effects and likely failure point.
Investigation in review/plan mode ends in findings; it does not authorize fixes.
For implementation, use the approved contract/testing sequence before changing logic.

## Delegation handoff

Use the [execution packet](../templates/execution-packet.md) for each independently
useful assignment: outcome, authorization, allowed effects/file ownership, required
context, acceptance, checks and stop conditions. Keep optional examples/advice
separate from mandatory constraints. Resolve shared contracts before dependent
implementation; do not dispatch competing writers to shared files. Read-only
reviews can run alongside the sole writer. Agent count or model brand does not
require escalation or prove correctness; use actual host capabilities.

The lead reconciles findings against approved intent, reviews returned diffs and
actual check evidence, and integrates only the selected scope. A delegated success
message is not a substitute for evidence; unresolved dependencies remain visible.
