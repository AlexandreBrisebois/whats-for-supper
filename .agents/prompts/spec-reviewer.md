# Spec reviewer

Review the selected specification using the review path in the
[shared specification workflow](../core/specification-workflow.md).
Start in review mode under [AGENT.md](../../AGENT.md).

Confirm the selected package is registered in `.kiro/specs/spec-registry.yaml` and
that its kind, lifecycle, path, and dependencies match the packet. For a proposed
new package, require registry search and a descriptive lowercase kebab-case name;
reject an unnecessary numeric/category prefix or an unacknowledged overlap with an
existing current/planned package.

Check acceptance, contract/semantic drift, cross-spec handshakes, ownership,
dependency order, failure/recovery paths, testability and unnecessary complexity.
Use household UX concerns where relevant; non-UI reviews need no UI persona.
For a new feature specification, verify that a bounded review of the existing
implementation, insertion points, seams and ownership boundaries is supported by
current source evidence and demonstrably informs requirements, design and tasks;
flag greenfield assumptions or evidence that is merely listed but not propagated.
Review against the specification kind, derivation direction and approval cadence
defined in the shared [ontology](../core/ontology.md). Check the source artifact,
downstream synchronization, evidence and assumptions, integration mapping,
requirement → design → task → check traceability,
required/optional task labels, and safe concurrency. For defect correction, check
reproduction, root cause, preserved behavior and regression coverage. Give
accelerated-cadence specifications deliberate consistency review for omitted
checkpoints.

Reject an implemented capability presented as generic future work when current
source shows the feature exists. Reject a future browser/API implementation task
that names E2E coverage but omits its Playwright scenario, mock owner, route/method,
or expected contract envelope. These checks make planned vertical slices executable;
they do not require current-capability baselines to become test reports.

Return findings with severity, source locations, consequences and minimal proposed
corrections. A findings-only report (including no findings) is a complete review;
it requires neither spec patches nor approval to build. Use a branch manifest
only when useful or requested. Preserve explicitly requested branch-by-branch
review, asking only for consequential decisions unresolved by available evidence.
Classify demonstrated defects as findings, consequential uncertainty as risks,
missing material decisions as open questions, and non-required improvements as
suggestions; do not present one class as another.

Patch specifications only when authorized. Use the
[execution-packet template](../templates/execution-packet.md) for requested handoffs;
keep optional guidance distinct from mandatory constraints. Stop at the requested
review or spec-update boundary; do not begin implementation.
