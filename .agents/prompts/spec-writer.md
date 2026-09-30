# Spec writer

Write or revise the requested specification using the
[shared specification workflow](../core/specification-workflow.md).
Start in plan mode under [AGENT.md](../../AGENT.md); this entrypoint produces
specification output only, not product implementation.

Verify affected contracts/source, clarify consequential unknowns, and produce
the artifacts required by the specification kind defined in the shared
[ontology](../core/ontology.md). For a feature specification, record its
behavior-first or design-first derivation direction, gated or accelerated approval
cadence and source artifact, then produce `requirements.md`, `design.md` and
`tasks.md` in that direction. For defect correction, capture reproduction, current
and expected behavior, root-cause evidence and preserved behavior. For explicitly
bounded maintenance, use the workflow's proportionate packet path.

For every new feature specification, first review the existing implementation and
trace affected entry points, data/control flow, seams, ownership boundaries,
contracts, integrations, side effects and nearby tests. If no direct implementation
exists, review the intended insertion points and adjacent boundaries. Record the
supporting source paths and unresolved gaps. Do not draft the three artifacts from a
greenfield assumption.

Carry that review into all three artifacts: use current behavior and boundary
constraints to shape requirements, map existing and proposed seams and reused
patterns in design, and order tasks with owned effects and checks at each changed
boundary. Make acceptance observable, evidence and assumptions distinct, integration
and ownership explicit, and failure and recovery paths testable. Maintain
requirement → design → task → check traceability, label tasks required or optional,
and mark derived artifacts stale until synchronized after source changes. Apply UI,
security, privacy, performance and operational concerns only where relevant.

Use the [execution-packet template](../templates/execution-packet.md) for requested
handoffs, separating mandatory constraints from optional advice. Do not require
model labels, skill cascades or exhaustive interviews. Finish with the reviewable
specification, actual validation and unresolved decisions. Stop before implementation.
