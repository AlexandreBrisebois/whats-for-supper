# Native loading and invocation probes

Status: Not run. Execute in HM-A/HM-Q only in disposable host profiles. These probes do not modify user-global memory or existing host settings.

For each probe record host/version, model ID/settings, fixture/harness hashes, exact prompt, native context trace (when exposed), tool/file reads, file-body duplicate occurrences and measured tokens. A model statement that it read a file is not sufficient evidence. If the host does not expose native loading, mark that observation unconfirmed and use documented host diagnostics; do not fabricate it from the response.

| ID | Setup and exact prompt | Observable acceptance |
|---|---|---|
| LP-01 | Fresh root session: `Review only: identify this repository's common harness entrypoint and the task command used for targeted test impact. Cite the files you actually inspected. Do not edit files.` | Native shim discovered; common AGENT.md route resolved; answer identifies actual target without blanket skill/history loading. |
| LP-02 | Fresh nested pwa session: `Review only: identify which repository instructions apply here and how they route to the common core. Do not edit files.` | Native root/nested precedence is documented accurately; no unsupported claim that repo instructions override platform rules. |
| LP-03 | Fresh root session: `Use the database skill for a read-only review of the schema-application command. Identify whether it deletes volumes, with command evidence. Do not apply schema changes.` | Relevant skill discovered and loaded; no unrelated skill body cascade; reset effects distinguished from application. |
| LP-04 | Fresh session, supply F01 user_prompt exactly. | A fully specified task proceeds without task/model selection or historical memory; required core bodies are not duplicated through shim/adapter/native imports. |
| LP-05 | Fresh profile with F07 payload; supply its user_prompt exactly. | Handover is used only for resumption; stale evidence checked; host memory is unnecessary. |
| LP-06 | Invoke spec-writer with: `Plan only: specify a backend-only fixture report reason duplicate that persists and never retries; retain existing reasons. Produce requirements, design and tasks under .kiro/specs/loading-probe-report/. No implementation or UI work.` | Three spec artifacts; no compulsory UI/mockup/persona expansion; any questions address actual consequential gaps. |
| LP-07 | Invoke spec-reviewer on LP-06 output with: `Review only this specification for missing acceptance or contradictions. Return findings; do not edit files or start implementation.` | Review finishes with findings and no forced patch, interview or approval-to-build loop. |
| LP-08 | Invoke task-executor with complete F03 task and its exact user_prompt. | Known spec/task/scope is reused; mandatory constraints and optional advice are distinguished; approved task runs without redundant selection. |
| LP-09 | Use candidate shared execution-packet template to encode F01's exact outcome/scope/check/stop fields, preserving the user_prompt. | Generated packet adds no scope, interview requirement or brand-based correctness rule. Record actual packet bytes/tokens; compare same generator inputs across variants where supported. |

LP-06/07/09 are separate procedure probes, not substitutes for the eight paired fixed scenarios. Missing baseline template support is recorded as unsupported; it is not forced into a fabricated paired token score. Primary behavioral targets are Codex/Astra and Antigravity/Gemini. Gemini CLI behavior must not be assumed to represent Antigravity. Other native shims receive reference/discovery compatibility inspection without implying paid behavioral runs.
