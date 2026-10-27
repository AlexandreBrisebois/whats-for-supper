# OpenSpec architecture audit — execution plan

Repository: `AlexandreBrisebois/whats-for-supper`
Mode: read-only until design approval. No branch, PR, canonical spec, or configuration changes.
Execution location: user's Mac (run by a local orchestrator). This plan was prepared remotely and has **not** been executed on the Mac.

## Orchestration rules
- Orchestrator owns `AUDIT_TRACKER.md`, checkpoints, decisions, and final report. Delegate bounded tasks to independent workers; workers return evidence, never edit canonical specs.
- Start from the existing local clone; record branch, HEAD SHA, dirty worktree, OpenSpec version, Python version, and `task --version`. Do not checkout, reset, stash, or install tools without approval.
- Before each stage, record `in_progress`; after evidence review, record `complete` or `blocked` with paths and commit SHA. Never mark a stage complete based only on a worker's assertion.
- Use `git status --short` before and after each stage; leave existing work untouched. Generated artifacts belong in a temporary directory outside the repository until reviewed.
- Avoid concurrently writing the same report or tracker; only the orchestrator edits tracking state.

## Stage 0 — Local preflight
1. Locate clone, confirm repository identity, branch, HEAD and existing changes.
2. Inspect `AGENT.md`, `.agents/core/context-loading.md`, `openspec/config.yaml`, `openspec/schemas/wfs/schema.yaml`, `Taskfile.yml`, and existing audit scripts/tests.
3. Record command availability and exact versions; use existing repo tooling, no dependency changes.
**Gate:** inventory inputs and toolchain recorded; no repository changes.

## Stage 1 — Complete canonical inventory (worker A)
1. Walk `openspec/specs/**/spec.md` from filesystem, sorted by normalized POSIX path; do not use code-search results as the source of truth.
2. Parse top-level purpose, requirement titles, requirement body spans, scenario titles/spans, and headings, preserving raw text.
3. Report file size in UTF-8 bytes, characters, lines, SHA-256, requirements, scenarios, and warnings for malformed or duplicated headings.
4. Reconcile totals against preliminary remote sample (34 capabilities, 808 requirements, 2,165 scenarios, 13,003 lines, 873,110 characters); explain any difference using recorded commit SHA.
**Gate:** 100% of canonical files inventoried; all counts reproducible.

## Stage 2 — Ownership and overlap audit (worker B)
1. Extract requirement records with `capability`, exact title, source span, exact normative body, scenarios, hash.
2. Detect exact title duplicates and normalized-body duplicates deterministically; preserve raw evidence.
3. Generate candidate overlaps by lexical similarity with explainable shared terms; do not label semantic duplicates automatically.
4. Prioritize four boundaries: planning/assignment/lifecycle; discovery/live-updates; search/indexing/library; capture/quality/recovery.
5. Human-review candidate pairs for same trigger and outcome, contradiction, or intentional dependency. Mark unresolved candidates explicitly.
**Gate:** every flagged pair links to two canonical file/line spans; no speculative duplicate counts.

## Stage 3 — Context loading and benchmark (worker C)
1. Inspect current schema instructions and conditional-loading rules; document existing selective `openspec show` behavior and available flags for the pinned version.
2. Define three workloads: small UI correction, cross-capability planner change, background lifecycle change.
3. Measure baseline full-file context versus capability index + selected requirements/scenarios. Include source paths and selection criteria; assess recall against full-file review.
4. Report UTF-8 bytes, tokenizer name/version (if available), actual token counts (if available), number of reads, and missed obligations. Never present 4 chars/token as measured tokens.
5. Include the cost of index generation and final full-scope verification in comparisons.
**Gate:** no omissions in selected reference sets; savings reported only when measured.

## Stage 4 — Minimal implementation design (orchestrator)
1. Propose `scripts/agent/openspec_audit.py` and `scripts/agent/tests/test_openspec_audit.py` with an additive Taskfile `spec:audit` entry; these are **proposals only**.
2. CLI: `--format text|json`, `--capability`, `--overlaps`, `--benchmark`, `--output` (explicit path only). Default is stdout/read-only.
3. Stable ordering, stable source spans, content hashes; no persistent index or embedding service in v1.
4. Tests: Unicode, nested Markdown, heading parsing, duplicate names, malformed specs, reproducibility, zero writes, no false-positive certainty.
5. Specify integration and acceptance checks, performance budget, migration-free rollback, and risks.
**Gate:** design review with user before any repository modification or PR.

## Stage 5 — Review package and stop
1. Assemble inventory CSV/JSON, overlap candidates with evidence, benchmark methodology/results, design proposal, and unresolved decisions.
2. Check `git status --short` unchanged and list any temp artifacts created outside repo.
3. Present findings and request approval. Do not implement until explicitly authorized.

## Suggested local orchestrator prompt
"Operate in my local What's for Supper clone on this Mac. Follow PLAN.md and maintain AUDIT_TRACKER.md as the single source of task state. Coordinate independent inventory, overlap, and context-benchmark workstreams; use parallel read-only workers only where safe. Record exact commit SHA and evidence paths, review worker results before marking stages complete, preserve my worktree, and stop at the design-review gate. Do not edit canonical specs, config, schema, Taskfile or scripts, create branches, commit, push, or open PRs without my explicit approval."
