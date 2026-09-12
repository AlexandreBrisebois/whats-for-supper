# Harness modernization design

Status: HM-A through HM-E are implemented. HM-D, HM-E and HM-Q are complete with the user waiver of model runs, native loading and efficiency measurement on 2026-09-11. Deterministic verification passed; no model qualification or measured efficiency claim. See [completion evidence](hm-q-validation.md).

## Shared architecture and interfaces

Native host shim → AGENT.md → conditional shared procedures and specialist skills → Taskfile.

AGENT.md remains the common authority/entrypoint. AGENTS.md remains a slim native router. Host adapters contain loading, tools, native permission and delegation mechanics; they do not invent different correctness or approval rules by model. Codex and Antigravity loading must be observed in fresh sessions rather than inferred from filenames. Preserve other shims with static compatibility checks.

Assign rule ownership once: mission owns intent; contract-testing owns contract/test/evidence policy; execution-harness owns commands and completion; context-loading owns loading, scope and delegation. Add a compact core ontology and one shared specification workflow; writer/reviewer prompts become distinct entrypoints into that workflow. Add one execution-packet template with outcome, authorized scope/source, acceptance, required context, mandatory constraints, verification and stop conditions. Examples and implementation advice are explicitly optional. Review mode may end with findings without editing a specification.

Modes are review, plan, implement, verify and maintain. Review/plan do not authorize implementation. Verification records evidence; maintain requires an explicitly bounded maintenance request. Existing approval persists for the stated scope. Platform/system permissions are not overridden by repository document precedence. A contract mismatch is resolved against approved intent; it never automatically authorizes rewriting the contract to match code.

Ontology distinguishes host/model/role; spec/slice/harness task/step; contract/seam; authoritative source/derived artifact/historical evidence; check/result/content identity/environment. Explicitly distinguish Taskfile tasks and agent tasks from application WorkflowTask/workflow concepts. Add a conditional WFS source map for recipe import, planning and groceries based on verified code; do not assert storage or API objects are identical. No new runtime type or product API is required.

## Skill and memory disposition

Retain and tighten repository-specific content in: database, openapi-expert, workflow-author, designer, nextjs-qa, dotnet-dev, nextjs-dev, aws-architect, create-a-skill, death-audit. The aws-architect directory currently declares the name aws-well-architected; preserve discovery identity consistently. Death-audit becomes explicitly invoked bounded maintenance. Broad personas and caveman formatting become opt-in without persistent activation or unsupported savings claims.

| Retire entrypoint | Owner | Content disposition |
|---|---|---|
| shared-understanding | HM-B | Keep consequential clarification rules; remove compulsory interviews. |
| prompt-planner | HM-B | Keep scope/dependency decomposition; remove brand tiers and mandatory orchestration. |
| create-prompt | HM-B | Keep outcome, constraints, verification and stop fields; remove prescriptive prompt expansion. |
| team-orchestration | HM-C | Keep bounded delegation and shared-file ownership; remove universal agent-count escalation. |
| tracer | HM-C | Keep investigation sequence and source map; preserve slice tooling. |
| contract-engineer | HM-C | Move API design reference and persistence distinctions; update dotnet caller before removal. |
| testing | HM-D | Keep verification and locator nuance in their owners; remove blanket failure assumptions. |
| test-audit | HM-D | Compare both audit scripts; preserve active Taskfile tooling and unique useful behavior. |
| session-review | HM-E | Keep evidence and meaningful handoff; remove mandatory multi-file turn-end writing. |

Do not concatenate retired skills into the core. Migrate useful unique content, update active callers and registry, then remove the entrypoint and obsolete support files. The active cnf-cross-spec-review documents are callers; preserve their user-facing branch-review behavior while replacing procedural references. Archived mentions are historical evidence, not executable callers.

One shared HANDOVER.md remains the active resume checkpoint. For each active task retain only:

```text
Task/spec:
Worktree/branch:
Authorized scope and source:
Current checkpoint:
Verification evidence and content identity:
Blocker or next action:
```

Load it for resumption/ambiguity, update at meaningful handoffs, and allow each writer to change only its own task section. Completed evidence belongs in the spec. JOURNAL.md gets one unique-history salvage pass, then remains frozen and searchable. Verify and relocate useful facts before retiring .agents/MEMORY.md and .agents/core/memory/. Rules go to their core owner, terms to ontology, current implementation facts to code/config references, durable rationale to ADRs, task state to specs. Historical content never authorizes work. Preserve explicit task agent:status; remove automatic HANDOVER/whole-registry printing from task agent:summary. Host memory is an optional cache; this migration does not edit or synchronize user-global memory.

## Memory salvage ledger

| Source | Known content | Migration decision and required evidence |
|---|---|---|
| .agents/MEMORY.md | Network origin/base-path rules and mandatory one-at-a-time review questions | Verify browser versus internal-server URL behavior against Compose and server-client code before placing network facts in network-topology. Do not copy the claim that both bases must be `/` without verification. Keep useful clarification intent in the shared spec procedure; retire compulsory questioning. |
| .agents/core/memory/2026-05-11-spec-review-evolution.md | Review-process history | Compare with the shared spec procedure; preserve unique durable rationale in an ADR, not another memory rule file. |
| HANDOVER.md | Active release/migration checkpoints and repeated gates | Verify current task paths/status against specs and content evidence. Retain active resume sections only; completion rules belong to core. |
| JOURNAL.md | Historical session records | Inventory unique unresolved facts/rationale, relocate only verified durable information with source provenance, and freeze remaining history. Never treat old commands or checkboxes as current authorization. |

The HM-E evidence record must map each salvaged fact to its source and destination, or record why it is obsolete/duplicated. No source retirement is complete until that record and incoming-link checks pass.

## Migration and evidence design

Migrate A → B → C → D → E → Q sequentially with one lead writer; use at most two independent read-only reviewers when useful. Every slice must leave active routes resolvable. Core A first removes mandatory loading of soon-retired skills, including the stale session-review path. B repoints writer/reviewer references even to skills retired later. C migrates contract guidance and surgical's tracer caller before removals. D fixes evidence semantics and audit ownership. E removes competing handover authority atomically with memory consolidation.

Change classes determine verification: review findings; documentation links/instructions; harness loading/command regressions; application lint/types/affected tests/drift; contract/schema all affected seams, generation and database behavior. Mixed changes take the union. Unknown impact cannot select the lighter class. Required formatting occurs before final tests; final validation does not silently mutate tested content. Existing task agent:finish remains the single completion entrypoint when applicable. Replace post-test-digest caching with evidence tied to actual tested inputs; preserve tracked/untracked coverage and Kiota timeout improvements. Static parity cannot imply live availability or database parity.

Do not route schema apply to dev:clean:sync, which removes volumes/images. Use verified schema preview/application commands with explicit destructive scope when needed. Do not change database behavior during Phase 0. Preserve testid-first interaction guidance while allowing semantic accessibility assertions. Advisory audits must not expand the task into unrelated test cleanup.

## Qualification and rollback

Freeze application/setup content and vary only the harness overlay. Pin exact host version, model ID and exposed settings at run launch; availability cannot be invented in Phase 0. Primary configurations are Astra/Codex and supported Gemini/Antigravity, including a Flash-class configuration for smaller-model reliability. Other hosts receive static routing checks. Reasoning defaults are recommendations to evaluate: High for architecture/review, Medium for bounded implementation, Low for mechanical edits; keep effort constant within each pair.

The eight included synthetic fixtures screen instruction following and evidence behavior cheaply; they are not WFS integration or production qualification. Before adoption, also run affected real WFS gates and host loading probes. Benchmark execution needs dedicated processes, ports, disposable data and synthetic credentials because existing gates kill processes and can format/generate content. A worktree alone is insufficient.

Keep baseline commit and each accepted slice as rollback references. Roll back only migration-owned changes through reviewed reverts or an isolated replacement checkout; never reset a dirty shared workspace. Rollback restores caller and destination changes together. Failed qualification leaves the candidate unadopted with actual results, not adjusted scoring thresholds.
