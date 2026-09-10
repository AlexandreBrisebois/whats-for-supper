# Dependency-ordered migration tasks

Phase 0 is complete. HM-A was explicitly selected by the user on 2026-09-09 and is implemented for review, with native loading unqualified. HM-B was selected on 2026-09-09 and is implemented for review with evidence below. HM-C through HM-Q remain unselected; do not begin them. The machine-readable [task graph](task-graph.yaml) owns IDs, dependencies, effects and acceptance; this document explains sequencing.

```text
HM-0 package → HM-A foundation → HM-B specification workflow
→ HM-C implementation/investigation → HM-D verification/completion
→ HM-E memory/specialist cleanup → HM-Q qualification
```

One lead edits each selected slice. Up to two reviewers may inspect independent concerns read-only. Do not launch dependent writers or have agents edit common core/registry concurrently. Each slice supplies a concrete diff, command results and unresolved blockers, then stops at its boundary. No fixed reasoning tier is a correctness guarantee.

## HM-0 — Phase 0 package

- [x] Complete this slice and record evidence.
- Depends on: none
- Requirements: HM-R01, HM-R02, HM-R03, HM-R04, HM-R05, HM-R06, HM-R07, HM-R08, HM-R09, HM-R10, HM-R11, HM-R12, HM-R13, HM-R14
- Authorized effects when selected: .kiro/specs/harness-modernization/**.
- Acceptance: P0-01 P0-02 P0-03 P0-04 P0-05 P0-06
- Verification: python3 .kiro/specs/harness-modernization/evaluation/validate-package.py task test:agent
- Stop: Present package; no harness edits or model runs.

## HM-A — Foundation

- [x] Implement the foundation and record [HM-A evidence](hm-a-validation.md). Static checks passed; fresh-session host loading remains unqualified.
- Depends on: HM-0
- Requirements: HM-R02, HM-R03, HM-R09, HM-R11, HM-R14
- Authorized effects when selected: native shims; adapters; AGENT.md; core authority/loading/ontology.
- Acceptance: One rule owner per universal rule; native routes resolvable. Remove mandatory dependencies on future retired skills before any retirement. Record baseline loading; essential-context target remains soft.
- Verification: Static native entrypoint/reference and contradiction checks. Fresh-session loading probes on primary hosts; unavailable recorded unqualified.
- Stop: Review foundation diff and evidence; do not begin HM-B in the same selected slice.

## HM-B — Specification workflow

- [x] Implement this slice and record [HM-B evidence](hm-b-validation.md). Static closure and session-level invocation exercises passed; fresh-host qualification remains unqualified.
- Depends on: HM-A
- Requirements: HM-R04, HM-R06, HM-R07, HM-R11
- Authorized effects when selected: shared specification workflow; execution packet template; spec writer/reviewer; active specification callers; caller-only planning links in retained team-orchestration; shared-understanding/prompt-planner/create-prompt retirement; skills registry.
- Acceptance: Repoint all active writer/reviewer and cross-spec procedural callers. Review can finish findings-only; no forced interview or UI requirements for non-UI work. Preserve three spec artifacts and clear mandatory versus optional packet content.
- Verification: Search incoming links and discovery references for three retired skills. Exercise direct, spec-writer, spec-reviewer and generated-packet invocation cases.
- Stop: Three retirements closed; no implementation-skill retirement yet.

## HM-C — Implementation and investigation

- [ ] Complete this slice and record evidence.
- Depends on: HM-B
- Requirements: HM-R01, HM-R06, HM-R07, HM-R09, HM-R11
- Authorized effects when selected: task-executor; surgical; implementation skills and references; investigation/delegation procedures; team-orchestration/tracer/contract-engineer retirement; skills registry.
- Acceptance: Move API design reference and update dotnet caller before contract-engineer removal. Update surgical and all tracer callers before tracer removal. Schema apply never silently resets; contract approval precedes tests and implementation. No stale command/path, auto-contract rewrite or blanket no-spec-change policy remains in touched paths.
- Verification: Verify documented Taskfile targets and code paths. Run UI/contract/async/dirty/misleading-output fixtures on candidate when runtime is available. Review permitted effects and preserved side-effectful mock semantics.
- Stop: Implementation/investigation routes consistent; no completion rewrite beyond required routing.

## HM-D — Verification and completion

- [ ] Complete this slice and record evidence.
- Depends on: HM-C
- Requirements: HM-R05, HM-R07, HM-R12, HM-R13
- Authorized effects when selected: testing/completion policy; Taskfile relevant targets; scripts/agent and regression tests; nextjs-qa and references; testing/test-audit retirement; skills registry.
- Acceptance: Compare legacy and active audit scripts before retiring legacy support. Single completion path with change-class checks; formatting precedes final verification. Cache success only for tested identity; untracked impact and timeout handling retained. Unavailable live services produce blocked live evidence, never false parity/completion.
- Verification: task test:agent with new regression cases for cache mutation, unknown impact and evidence boundaries. Inspect Taskfile ordering and no-mutation final validation. Unavailable-service and interrupted-task fixtures.
- Stop: Completion and evidence semantics accepted before memory consolidation.

## HM-E — Memory and specialist cleanup

- [ ] Complete this slice and record evidence.
- Depends on: HM-D
- Requirements: HM-R08, HM-R10, HM-R11, HM-R12
- Authorized effects when selected: HANDOVER/JOURNAL and repo memory destinations; core completion/context; designer/caveman/mere-designer; death-audit/create-a-skill; aws-architect entrypoint/references; session-review retirement; registry and summary/status targets.
- Acceptance: Relocate verified unique memory; preserve provenance; freeze JOURNAL. Remove handover-as-authority and automatic summary loading; preserve explicit status. Exactly ten skills with complete registry and no active retired-skill callers. Authoring guidance prevents reintroducing duplicate policy or generic compulsory skills.
- Verification: Manifest retirement closure and source-to-destination memory ledger. Fresh versus resumed loading probes; interrupted-task fixture. No host/global memory changes.
- Stop: Candidate content complete; no automatic adoption.

## HM-Q — Qualification

- [ ] Complete this slice and record evidence.
- Depends on: HM-E
- Requirements: HM-R14, HM-R02, HM-R05, HM-R13
- Authorized effects when selected: isolated evaluation environments; qualification evidence in this specification.
- Acceptance: Eight scenarios x three paired repeats per pinned primary configuration. No scope/destructive/data-loss/false-completion failure; no task-handling regression. Real affected WFS gates and host probes pass; missing configuration remains unqualified. Token and latency reports include unsuccessful attempts and unavailable values.
- Verification: Evaluation protocol and run-record schema. Static compatibility checks for other shims. Review adoption decision and rollback references.
- Stop: Present qualification/adoption recommendation; no deployment or unrelated product work.

## Evidence record

Phase 0 validation is recorded in [validation](validation.md). Model evaluations and native host probes are not run in Phase 0. Existing baseline tests do not qualify the candidate.

Caller-only prerequisites are authorized by the manifest migration_touches field: HM-B updates retained team-orchestration planning links before prompt-planner removal. HM-D preserves incidental CI/package/pre-commit callers unless an interface change requires a matching edit. ADR rationale and archived arcive/ records are preserved; they are not blanket rewrite targets.
