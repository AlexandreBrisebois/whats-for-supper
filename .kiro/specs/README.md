# Feature specifications — `.kiro/specs/`

Use the [shared specification workflow](../../.agents/core/specification-workflow.md)
for writing, reviewing and decomposing specifications. It owns the format and
procedure; [AGENT.md](../../AGENT.md) owns authority and scope.

New active feature specifications use `.kiro/specs/<feature-slug>/requirements.md`,
`design.md` and `tasks.md`. New slugs are descriptive lowercase kebab-case names;
do not extend legacy category/number prefixes. Search the canonical
[specification index](SPEC_INDEX.md) before creating or revising a package, then
register the resulting package in [spec-registry.yaml](spec-registry.yaml).
Existing grouped directories and legacy prefixes may remain. Bounded maintenance
can use an [execution packet](../../.agents/templates/execution-packet.md) without
an artificial feature spec. Load only the selected task and its immediate context.
Review can end with findings only; planning does not authorize execution.

Keep acceptance, design and task references aligned when authorized decisions
change. Record actual task evidence and blockers; do not check off work based on
historical status or unrun checks. Follow the existing
[execution harness](../../.agents/core/execution-harness.md) for applicable checks.

## Naming, roadmap, and preview rollout

Keep spec folders and registry slugs stable throughout planning and rollout. Do not
add `roadmap-` or `preview-` folder prefixes. Use the canonical registry and generated
index as the roadmap: unsettled ideas are explorations; scoped future features use
`kind: planned-feature` and `lifecycle: planned`, with dependencies and a concrete
`next_action`. Approval for implementation does not establish preview availability.

Temporary preview flag keys use `preview-<feature-slug>`, as defined in the
[feature-flags requirements](feature-flags/requirements.md). Record the flag key in
the feature spec, with an owner, graduation criterion, and removal task before
rollout. Deployment mode (`off`, `opt-in`, or `on`) is separate from planning
lifecycle. Keep the key stable until graduation, then delete the flag and legacy
path and update the registry and capability documentation based on verified
implementation and acceptance evidence. The spec folder keeps its original name.

## 6. Archived specifications

`docs/archive/specs/`, `docs/archive/legacy-lanes/`, `docs/archive/legacy-build-prompts/`, and `docs/archive/adr/` contain historical reference material. Exclude these trees from active-task discovery and default context loading. Read a specific archived document only to answer a historical question or understand a decision relevant to an approved current task.

Archived requirements, prompts, commands, status labels, and unchecked boxes do not authorize work and do not override current OpenAPI, repo doctrine, or an approved active spec. Archival alone does not prove every original task was implemented; preserve the recorded evidence rather than checking off old tasks without verification.

When archiving, add a historical-reference notice to every document, remove active handover entries, update incoming spec links to their archive locations, and record the completion, supersession, or retirement decision with its actual validation outcome. Use the [spec archive index](../../docs/archive/specs/README.md) or [legacy build-prompts index](../../docs/archive/legacy-build-prompts/README.md) for historical lookup. Reopening work requires a current user request and a bounded active spec; do not automatically resume archived checklists.
