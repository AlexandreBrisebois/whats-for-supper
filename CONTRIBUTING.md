# Contributing

Use OpenSpec to plan behavior changes and Taskfile automation to prepare and
validate contributions.

## Development references

- [Local development loop](LOCAL_DEV_LOOP.md): tooling setup, Git hooks and
  development/service commands.
- [Contract and testing](.agents/core/contract-testing.md): approved contract/spec
  → tests → implementation, behavior slices and acceptance evidence.
- [Execution harness](.agents/core/execution-harness.md): command effects,
  preparation, final verification and scope review.

AI assistant instructions start at [AGENTS.md](AGENTS.md). This contributor guide
does not replace those instructions or the detailed references above.

## OpenSpec: research, review, implement, reconcile

1. **Research before proposing.** Follow the OpenSpec workflow configured in
   [openspec/config.yaml](openspec/config.yaml) with the
   [WFS schema](openspec/schemas/wfs/schema.yaml). Inspect relevant requirements and scenarios in
   [canonical specs](openspec/specs/), current implementation and tests, and the
   approved [API contract](specs/openapi.yaml) where affected. Reuse existing capability owners.
2. **Review the proposed behavior before dependent work.** Compare proposed
   behavior with those sources. Address compatibility, failure, recovery and
   concurrency where relevant; resolve consequential unknowns before implementation.
   Document intentional changes, marking breaking changes **BREAKING**, rather
   than rewriting specifications merely to match existing code.
3. **Plan and implement the agreed change.** Create the applicable proposal,
   spec deltas, design and tasks through OpenSpec. Give each task acceptance
   checks, keep changes focused, and preserve unrelated work. Follow the
   contract/testing guidance for each behavior slice.
4. **Verify and reconcile.** Run applicable checks and record their actual results.
   Update affected planning artifacts when decisions change. Mark tasks complete
   only after their acceptance checks pass. Use OpenSpec to sync or archive when
   appropriate, then validate the resulting specs and planning files.

### No spec-level behavior change

The WFS schema supports `skip_specs: true` in a change's `.openspec.yaml` for
pure refactor, tooling or documentation changes with no spec-level behavior
change. Do not invent requirements or spec deltas merely to satisfy validation.
For documentation-only changes, check links, artifacts and consistency; a behavior
red/green cycle is not applicable. Changes to harness instructions or tooling still
need the applicable harness checks, even when the files are Markdown.

## Use Taskfile automation

[Taskfile.yml](Taskfile.yml) is the repository's command interface.
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
For a missing repeatable workflow, inspect existing targets and scripts before
proposing a small Taskfile addition. Avoid redundant wrappers.

## Commits, branches and pull requests

- Use Conventional Commits (for example, `feat: add recipe parser` or
  `fix(api): handle null input`).
- `main` is protected and releasable; `develop` is the integration branch for
  the next release. Use `feature/<short-descriptor>` for feature branches and
  `hotfix/<issue-number>-desc` for hotfixes.
- Keep PRs small and focused, link the related issue, and include testing steps
  and screenshots where applicable.
- Review the final diff against the agreed scope.
  Report actual checks as passed, failed, blocked, not-run or not-applicable,
  with the tested revision or content and supporting evidence. Do not claim runtime
  qualification from documentation or static checks.
- Run applicable harness checks and linters before opening a PR, and ensure
  applicable CI checks pass. Follow the existing local commit/push gates;
  check task acceptance separately from CI success.
- Critical areas require at least one approving code-owner review.

## Reporting security issues

Do not open public issues for vulnerabilities.

Thank you for contributing.
