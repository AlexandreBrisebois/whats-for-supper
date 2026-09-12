# Spec writer

Write or revise the requested specification using the
[shared specification workflow](../core/specification-workflow.md).
Start in plan mode under [AGENT.md](../../AGENT.md); this entrypoint produces
specification output only, not product implementation.

Verify affected contracts/source, clarify consequential unknowns, and produce
`requirements.md`, `design.md` and `tasks.md` in `.kiro/specs/<feature-slug>/`.
For explicitly bounded maintenance, use the workflow's proportionate packet path.
Make acceptance observable, ownership and dependencies explicit, and failure and
recovery paths testable. Apply UI concerns only to UI work.

Use the [execution-packet template](../templates/execution-packet.md) for requested
handoffs, separating mandatory constraints from optional advice. Do not require
model labels, skill cascades or exhaustive interviews. Finish with the reviewable
specification, actual validation and unresolved decisions. Stop before implementation.
