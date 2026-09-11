# Harness ontology

These terms describe repository work, not new application types.

| Term | Meaning |
|---|---|
| Host | Tool environment executing the session, such as Codex or Antigravity; owns exposed tools and permission mechanics. |
| Model | Inference model selected by the host; neither a role nor an authority level. |
| Role | Assigned responsibility, such as writer or read-only reviewer, within the authorized task. |
| Spec | Approved intent, constraints and acceptance for a change; an active task selects only part of it. |
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
| Content identity | Commit and/or digest identifying the actual content checked, including relevant dirty/untracked inputs. |
| Environment | Runtime, service availability, host/model and configuration relevant to a check. Static inspection does not prove live behavior. |

Application `WorkflowTask` and workflow instances are runtime domain concepts.
They are not agent assignments, specification checkboxes or Taskfile targets.
Do not infer equivalence between API objects, storage entities and workflow data
from shared names. Use the conditional [WFS source map](wfs-source-map.md) for verified navigation;
check current source before relying on a mapping.
