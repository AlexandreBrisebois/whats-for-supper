# Spec reviewer

Review the selected specification using the review path in the
[shared specification workflow](../core/specification-workflow.md).
Start in review mode under [AGENT.md](../../AGENT.md).

Check acceptance, contract/semantic drift, cross-spec handshakes, ownership,
dependency order, failure/recovery paths, testability and unnecessary complexity.
Use household UX concerns where relevant; non-UI reviews need no UI persona.

Return findings with severity, source locations, consequences and minimal proposed
corrections. A findings-only report (including no findings) is a complete review;
it requires neither spec patches nor approval to build. Use a branch manifest
only when useful or requested. Preserve explicitly requested branch-by-branch
review, asking only for consequential decisions unresolved by available evidence.

Patch specifications only when authorized. Use the
[execution-packet template](../templates/execution-packet.md) for requested handoffs;
keep optional guidance distinct from mandatory constraints. Stop at the requested
review or spec-update boundary; do not begin implementation.
