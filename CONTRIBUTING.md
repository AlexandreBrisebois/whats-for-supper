# Contributing

This guide applies to human developers and AI agents. Both must use the repository's
OpenSpec methodology and development harness, within the authorized scope.

## Start with the shared owners

- [AGENT.md](AGENT.md): authority, scope and the OpenSpec workflow; agents enter
  through [AGENTS.md](AGENTS.md) and load their active host adapter.
- [Context loading](.agents/core/context-loading.md): load only relevant context,
  inspect existing changes and preserve unrelated work.
- [Contract and testing](.agents/core/contract-testing.md): approved contract/spec
  → tests → implementation, behavior slices and acceptance evidence.
- [Execution harness](.agents/core/execution-harness.md): command effects,
  preparation, final verification and scope review.
- [Local development loop](LOCAL_DEV_LOOP.md): tooling setup, Git hooks and
  development/service commands.

These documents own the detailed rules; this guide is a practical route through
them, not a separate policy or approval process.

## OpenSpec: research, review, implement, reconcile

1. **Research before proposing.** Use the installed OpenSpec workflow and
   [project configuration](openspec/config.yaml), which selects the
   [WFS schema](openspec/schemas/wfs/schema.yaml). Follow its artifact discovery
   and lifecycle instructions rather than inventing a parallel process. Inspect
   the capability inventory and relevant full requirements/scenarios in
   [canonical specs](openspec/specs/), current implementation and tests, and the
   approved [API contract](specs/openapi.yaml) where affected. Reuse existing
   capability owners and exact paths.
2. **Review the proposed behavior before dependent work.** Compare proposed
   requirements/scenarios with those sources. Identify contradictions, assumptions,
   compatibility impacts, behavior that must remain working, and relevant
   boundary, failure, recovery and concurrency cases. Distinguish implementation
   drift from intended behavior: do not silently rewrite specifications to match
   code. State intentional changes and their consequences in the existing
   proposal/spec review, marking breaking changes **BREAKING**. Resolve
   consequential unknowns before dependent design, tasks or implementation; keep
   this proportional, without a new mandatory report or approval phase.
3. **Prepare the applicable artifacts.** Follow the installed workflow to create
   the proposal, applicable spec deltas/design and bounded, dependency-ordered
   tasks with named acceptance checks. Planning readiness and task checkboxes
   are not implementation authorization. Implement only the accepted, authorized
   scope, following the shared contract/testing policy for each behavior slice.
4. **Verify and reconcile.** Record actual task acceptance as well as harness
   results. When decisions change, reconcile affected requirements, design,
   tasks and evidence while preserving unaffected work. Mark tasks complete only
   after required acceptance passes; distinguish implemented, verified and
   archived states. Sync/archive through the installed OpenSpec workflow when
   appropriate, review the resulting canonical specs, validate after those writes
   and verify the final planning-file state. Archival does not prove acceptance.

### No spec-level behavior change

The WFS schema supports `skip_specs: true` in a change's `.openspec.yaml` for
pure refactor, tooling or documentation changes with no spec-level behavior
change. Do not invent requirements or spec deltas merely to satisfy validation.
Documentation-only work has no behavior red/green cycle: use applicable artifact,
link and reconciliation checks and report behavior checks as not-applicable.
Harness edits retain their applicable harness checks; they are not exempt merely
because some of their files are Markdown.

## Use Taskfile automation

[Taskfile.yml](Taskfile.yml) is the command interface for both humans and agents.
Use existing targets for supported workflows, from the repository root. Follow
the local development loop for prerequisites and pinned tooling; inspect target
and script effects before execution, especially process stops or data resets.

| Purpose | Command |
|---|---|
| Discover available automation | `task -l` |
| Research specs and active changes | `task spec:search -- <pattern>` |
| Validate OpenSpec artifacts | `task spec:check` |
| Preview selected checks and reasons (no execution/evidence) | `task verify:plan -- <paths>` |
| Prepare applicable formatting/generation with reviewed paths | `task prepare -- <paths>` |
| Final repository checks with the complete reviewed task path set | `task verify -- <complete-task-paths>` |

The angle-bracket values are placeholders for your pattern or repository-relative
changed paths. Include new/deleted files and task/evidence updates in the complete
task path set. Documentation/harness-only changes need no preparation run.
Review scope and any generated output before final verification; later edits
require fresh applicable verification.

Use the [execution harness](.agents/core/execution-harness.md) for focused unit,
API and E2E commands, contract/client checks and scoped spec validation. Use the
[local development loop](LOCAL_DEV_LOOP.md) for setup and development commands.
`task gate` provides development feedback, not final acceptance; it stops
dev/test processes, so inspect its effects and use dedicated resources.
Previews, static spec/contract validation and focused tests do not prove runtime
behavior or replace task-specific acceptance and applicable final checks.

**Missing automation:** inspect existing targets and scripts first. If a needed
repeatable operation is missing, identify the gap and propose the smallest
reusable Taskfile target or extension to existing automation instead of an ad hoc
bypass. Do not add redundant wrappers or tooling merely for completeness.

## Commits, branches and pull requests

- Use Conventional Commits (for example, `feat: add recipe parser` or
  `fix(api): handle null input`).
- `main` is protected and releasable; `develop` is the integration branch for
  the next release. Use `feature/<short-descriptor>` for feature branches and
  `hotfix/<issue-number>-desc` for hotfixes.
- Keep PRs small and focused, link the related issue, and include testing steps
  and screenshots where applicable.
- Review the final diff against the authorized scope and linked policy owners.
  Report actual checks as passed, failed, blocked, not-run or not-applicable,
  with the tested content identity and evidence. Do not claim runtime
  qualification from documentation or static checks.
- Run applicable harness checks and linters before opening a PR, and ensure
  applicable CI checks pass. Follow the existing local commit/push gates;
  neither CI nor a passing command replaces selected task acceptance.
- Critical areas require at least one approving code-owner review.

## Reporting security issues

Do not open public issues for vulnerabilities.

Thank you for contributing.
