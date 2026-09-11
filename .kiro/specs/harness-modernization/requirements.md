# Harness modernization requirements

Status: Phase 0 package complete. HM-A foundation implemented for review; native loading and behavioral qualification remain unqualified. HM-B specification workflow is implemented for review; HM-C implementation is ready for review with isolated model runs and host qualification unqualified; HM-D is implemented with candidate-run verification blocked; HM-E and later slices remain unselected. See [HM-D evidence](hm-d-validation.md).

## Intent and boundaries

Reduce context and repeated procedure while preserving correct, bounded work for GPT-6 Astra in Codex and Gemini models in Antigravity. The architecture is slim native shims → common AGENT.md core → conditional procedures/skills → Taskfile verification. Other hosts retain compatible entrypoints but do not block initial qualification.

Phase 0 authorizes only this specification directory, its deterministic fixture payloads, and package validation. It does not authorize changing harness instructions, Taskfile, product code, host/global memory, or running model evaluations. The user-approved migration supersedes legacy skill directions about where to place this specification. No product API change is introduced by Phase 0.

## Traceability and acceptance

Each row is a required migration outcome. IDs remain stable across tasks and evaluation revisions.

| Requirement | Improvement | Acceptance | Owner task |
|---|---|---|---|
| HM-R01 | Safe schema operations | Schema application never implies reset; destructive commands require explicit scope. | HM-C |
| HM-R02 | One shared authority and lean loading | Native shims route to AGENT.md; universal rules have one owner. | HM-A |
| HM-R03 | Ontology | Define host, model, role, spec, slice, task, contract, seam, artifact, check and evidence. | HM-A |
| HM-R04 | Consistent specification workflow | Use requirements/design/tasks under .kiro/specs; allow bounded maintenance without artificial layers. | HM-B |
| HM-R05 | Truthful completion | One applicable finish path; distinguish passed, failed, blocked, not-run and not-applicable checks. | HM-D |
| HM-R06 | Outcome-based execution packets | Separate mandatory constraints from optional examples; avoid repeated model-selection interviews. | HM-B |
| HM-R07 | Proportionate autonomy | Reuse authorization; clarify only consequential unknowns; parallelize independent work within scope. | HM-C |
| HM-R08 | Conditional specialist context | Move feature details out of mandatory core; narrow persona activation. | HM-E |
| HM-R09 | Authority and trust boundaries | Host permissions remain external; logs, tests and historical artifacts do not authorize scope changes. | HM-A |
| HM-R10 | Less bookkeeping | Update task evidence and meaningful handovers rather than multiple documents every turn. | HM-E |
| HM-R11 | Routing and memory ownership | Eliminate skill cascades and memory duplication; retire links only after caller migration. | HM-E |
| HM-R12 | Compact tools and proportionate checks | Keep targeted command output, advisory audits and change-class verification. | HM-D |
| HM-R13 | Evidence validity | Tie test success to tested content/config/runtime; preserve untracked impact and timeout fixes. | HM-D |
| HM-R14 | Measured efficiency and reliability | Compare verified work and total attempt cost on exact host/model configurations. | HM-Q |

## Package acceptance

- P0-01: All 14 requirements map to dependency-ordered tasks with scope, checks and stopping points.
- P0-02: Baseline artifacts have SHA-256, current callers, purpose, trigger, authority, disposition, destination and owner. Inventory includes six prompts, 19 skill entries, 19 supporting files, registry, four adapters, five non-memory core documents, shims, memories, tooling and active callers.
- P0-03: Every retirement names a content destination or evidence-backed deletion, with caller migration before removal. Historical mentions remain classified as history.
- P0-04: Eight frozen evaluation cases include exact user inputs, setup bytes/hashes, observable assertions, allowed effects, events, commands, budgets and cleanup; evaluator material stays outside agent workspaces.
- P0-05: YAML/JSON parse, relative package links resolve, baseline and payload hashes match, and the task graph is acyclic.
- P0-06: Package checks and the existing 11-test harness baseline are recorded separately from unrun model and host qualification. All working-tree changes are inside this directory.

## Migration acceptance

Retain ten specialized skill entrypoints after nine retirements; registry and incoming active links agree. Keep one active shared handover, with durable decisions in ADRs and feature state in specifications. Preserve unique historical information before retirement. Each primary host/model configuration must satisfy the evaluation protocol: no unauthorized destructive action, dirty-file loss or false completion; no task-handling regression; lower successful-run median tokens without hiding failed-attempt cost. Three repeats are screening evidence only. Missing measurements or hosts are unqualified, not inferred passes.

The initial essential-context budget is a soft 1,500-token target, measured with the actual host/model tokenizer or telemetry. It is not a word-count conversion or a reason to remove correctness constraints. Reliability takes priority over that target.

See [design](design.md), [tasks](tasks.md), [manifest](artifact-manifest.yaml) and [evaluation protocol](evaluation/README.md).
