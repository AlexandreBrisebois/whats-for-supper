# Dependency upgrades

Use this procedure when a selected task updates package manifests or lockfiles.
It supplements the shared contract, context-loading, and execution-harness rules.

## Baseline and resolution

Before editing, record the worktree baseline, relevant manifest/lockfile diffs,
and requested formatter result in the package directory. Run `npm outdated` and
`npm ls` (or the equivalent package-manager commands) to identify direct updates
and current resolution errors.

Inspect direct and transitive peer ranges before applying a major release. Validate
the intended dependency set using package metadata plus a non-mutating dry run or
disposable worktree. Do not use a plain `npm install --package-lock-only` as a
preflight because it can write the lockfile. Write package manifests and lockfiles
only after accepting the resolution.

When a newest release has an unsatisfied transitive peer constraint, retain the
newest compatible release and report the constraining package, range, and selected
version. Do not force or silence the conflict with `--force`, `--legacy-peer-deps`,
or an audit fixer unless the selected task explicitly authorizes that approach.

## Kiota-generated PWA clients

When upgrading Kiota TypeScript runtime packages, run `task gen:client:check`.
If it reports drift, `task gen:client` is authorized only when the existing
`specs/openapi.yaml` contract is approved and generated PWA output is within the
selected scope. Treat the generated client files and `kiota-lock.json` as related
outputs. Inspect the generated diff, then rerun the client check, PWA typecheck,
and PWA unit tests. Do not alter the OpenAPI contract merely to remove drift.

## Validation and reporting

Run each required validation command independently and capture its own result; do
not short-circuit later required checks with shell `&&`. Classify every required
check as passed, failed, blocked, not-run, or not-applicable.

Preserve baseline formatter failures separately from upgrade-caused failures.
Generated outputs that intentionally differ from repository formatting rules
should be excluded narrowly by path; application source should be formatted rather
than broadly ignored. Do not report completion until every requested check has a
recorded classification.
