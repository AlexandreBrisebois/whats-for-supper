# Feature specifications — `.kiro/specs/`

Use the [shared specification workflow](../../.agents/core/specification-workflow.md)
for writing, reviewing and decomposing specifications. It owns the format and
procedure; [AGENT.md](../../AGENT.md) owns authority and scope.

New feature specifications use `.kiro/specs/<feature-slug>/requirements.md`,
`design.md` and `tasks.md`. Existing grouped directories may remain. Bounded
maintenance can use an [execution packet](../../.agents/templates/execution-packet.md)
without an artificial feature spec. Load only the selected task and its immediate
context. Review can end with findings only; planning does not authorize execution.

Keep acceptance, design and task references aligned when authorized decisions
change. Record actual task evidence and blockers; do not check off work based on
historical status or unrun checks. Follow the existing
[execution harness](../../.agents/core/execution-harness.md) for applicable checks.

## 6. Archived specifications

`.kiro/specs/archive/` and `specs/05_ARCHIVE/` contain historical reference material. Exclude both from active-task discovery and default context loading. Read a specific archived document only to answer a historical question or understand a decision relevant to an approved current task.

Archived requirements, prompts, commands, status labels, and unchecked boxes do not authorize work and do not override current OpenAPI, repo doctrine, or an approved active spec. Archival alone does not prove every original task was implemented; preserve the recorded evidence rather than checking off old tasks without verification.

When archiving, add a historical-reference notice to every document, remove active handover entries, update incoming spec links to their archive locations, and record the completion, supersession, or retirement decision with its actual validation outcome. Use the [Kiro archive index](archive/README.md) or [legacy archive index](../../specs/05_ARCHIVE/README.md) for historical lookup. Reopening work requires a current user request and a bounded active spec; do not automatically resume archived checklists.
