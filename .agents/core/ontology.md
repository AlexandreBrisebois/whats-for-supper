# Harness ontology

These terms describe repository work, not new application types.

| Term | Meaning |
|---|---|
| Host | Tool environment executing the session; owns exposed tools and permission mechanics. |
| Model | Inference model selected by the host; neither a role nor an authority level. |
| Role | Assigned responsibility, such as writer or read-only reviewer, within the authorized task. |
| Specification | Versioned artifacts expressing intent, constraints, acceptance, design decisions and planned work; its approval state determines authority. |
| Approved specification | A specification whose designated decisions and acceptance have been accepted as authoritative for the selected scope. |
| Specification kind | The planning shape selected from the work: feature, defect correction or bounded maintenance. |
| Feature specification | A specification for introducing or materially changing observable capability. |
| Defect-correction specification | A specification anchored in reproducible divergence between current and expected behavior, including behavior that must remain unchanged. |
| Maintenance packet | A proportionate bounded plan for work that does not justify a full feature or defect-correction specification. |
| Derivation direction | The declared direction in which authoritative decisions are derived and synchronized across specification artifacts. |
| Behavior-first direction | Establish observable requirements before deriving technical design and implementation tasks. |
| Design-first direction | Establish and validate technical constraints or architecture before deriving observable requirements and implementation tasks. |
| Approval cadence | Whether derivation phases use intermediate approval checkpoints. |
| Gated cadence | Pause at designated approval checkpoints before deriving the next artifact. |
| Accelerated cadence | Produce the normal artifacts without intermediate approval checkpoints; evidence, validation and implementation-authorization rules still apply. |
| Source artifact | The artifact that owns the upstream decisions for the selected derivation direction. |
| Derived artifact | An artifact whose correctness depends on decisions in a source artifact. |
| Synchronization | Reconcile derived artifacts after an upstream decision changes while preserving unchanged identifiers and traceability. |
| Stale artifact | A derived artifact not yet reconciled with a changed source artifact; it is not ready for dependent execution planning. |
| Requirement | A testable statement of required behavior, quality, constraint or invariant without unnecessary implementation prescription. |
| Structured requirement | A requirement with an explicit condition or event and an observable system response. |
| Functional requirement | Required observable system behavior. |
| Non-functional requirement | A measurable quality or constraint such as latency, security, reliability, accessibility or compliance. |
| Preserved behavior | Existing behavior that must remain unchanged while another behavior is modified or corrected. |
| Acceptance criterion | An observable condition used to decide whether a requirement has been satisfied. |
| Design | The documented technical approach for satisfying requirements and constraints. |
| Architecture level | Selected design granularity: system/component structure or implementation-level interfaces, algorithms and data structures. |
| Integration map | Affected components, owners, interfaces, seams, data flows, state transitions and side effects. |
| Traceability | Maintained relationships from requirements through design decisions and specification tasks to checks. |
| Specification task | A bounded planned implementation unit tied to requirements, design, dependencies, effects, checks and a stopping condition. |
| Required task | A specification task necessary to satisfy accepted requirements. |
| Optional task | A specification task that may improve the result but is not necessary to satisfy accepted requirements. |
| Task dependency | A semantic or operational condition requiring one specification task to precede another. |
| Concurrency wave | Independent tasks that may execute concurrently without conflicting ownership or unresolved dependencies. |
| Approval checkpoint | A point where the next derivation phase waits for an authorized decision; it is not implementation authorization. |
| Finding | A demonstrated defect or contradiction supported by evidence. |
| Risk | A consequential possibility supported by incomplete evidence and requiring validation or a decision. |
| Open question | Missing information that materially affects scope, behavior, design, acceptance or execution. |
| Suggestion | A non-required improvement that does not identify a correctness or acceptance defect. |
| Slice | Bounded outcome with its own acceptance and stop boundary; may cross application seams or change the harness alone. |
| Agent task | Authorized unit assigned to an agent, such as HM-A. |
| Taskfile task | Named executable command target in Taskfile.yml, such as `agent:finish`; running it is a step, not authorization for an agent task. |
| Step | One operation within a task; completing it does not imply the whole task passed. |
| Contract | Authoritative interface/schema expectation, including the OpenAPI API contract. |
| Seam | Boundary between components or representations where behavior/data must agree; API, generated client, mocks and persistence may have distinct representations. |
| Artifact | A file or output: authoritative source (approved contract/spec), derived artifact (code/generated client/test), or historical evidence (past log/decision). Its category determines how it may be used. |
| Check | A named validation with defined inputs and an observable result. |
| Result | The observed outcome of a check; a process exit alone does not establish untested behavior. |
| Evidence | Recorded observation supporting a claim, tied to the checked content, command/configuration and environment. It supplies no new authorization. |
| Resume checkpoint | Compact active-task context in HANDOVER; stale until checked, and never authority or proof of completion. |
| Content identity | Commit and/or digest identifying the actual content checked, including relevant dirty/untracked inputs. |
| Environment | Runtime, service availability, host/model and configuration relevant to a check. Static inspection does not prove live behavior. |

Application `WorkflowTask` and workflow instances are runtime domain concepts.
They are not agent assignments, specification checkboxes or Taskfile targets.
Do not infer equivalence between API objects, storage entities and workflow data
from shared names. Use the conditional [WFS source map](wfs-source-map.md) for verified navigation;
check current source before relying on a mapping.
