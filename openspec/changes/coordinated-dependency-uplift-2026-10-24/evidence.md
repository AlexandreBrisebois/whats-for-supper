# Dependency uplift evidence

## Source and scope

Based on connector-verified main `e76332c9e35c3d8584cbed6476ea9c43b4d40ea7`, tree `48b7201323c74ee976907e36021cbb2ee0fcfaca`. The cloud checkout was refreshed using connector file reads; blob hashes and the complete Git tree matched. Local snapshot commits are transport scaffolding and will not be published.

Existing EF PR #293 is the intended draft review vehicle. PRs #294, #307, #308, #309 and #320 retain their packages; unrelated feature/spec branches are excluded. Motion #312, lucide #319 and docs #317 were already merged.

## Resolution evidence

- Baseline current-main locked restore, npm dependency tree and PWA formatting passed. `npm outdated` returned its expected nonzero update-available status.
- NuGet Npgsql 11.0.0-rc.2 metadata requires exact EF Core/Relational 11.0.0-rc.2.26504.105. Both project locks now restore successfully in locked mode without dependency warnings or overrides.
- The RC1 query-translation workaround remains unchanged. No upstream query-fix or RC2 runtime qualification is inferred from metadata.
- Clean disposable Node 26.12.1/npm 12.2.1 resolution and dependency-tree checks passed, retaining default fetch/script policies. Clean `npm ci --include=dev` and tree checks passed again in the PWA directory. Native-script warnings for parcel watcher, SWC and unrs-resolver remain visible; ESLint 9 is deprecated but retained for peer compatibility.
- Peer evidence retains ESLint 9.39.5 (eslint-plugin-import excludes 10) and TypeScript 6.0.3 (typescript-eslint requires `<6.1.0`). The follow-redirects lock entry remains byte-equivalent at 1.16.0.
- OpenSpec 1.15.0 validated all 35 current specs/changes before the pin changed. Published image tags were verified for amd64 and arm64; PostgreSQL/pgvector remain on major 18.
- Detailed logs/metadata are retained locally under `.task/dependency-uplift-2026-10-24/`; the PR reports final validation and exact commit checks.

## Runtime acceptance

The full repository harness passed with stable source/runtime identity:
`.task/agent-finish/runs/163166ed3c264e199bc5cfed0821d6be.json`, tested identity
`46476efd65d7360086a3201a5682996106e688636a907b4bb6c1bfd03d3cacd0`.
This precedes the subsequent documentation-only progress/evidence update.

- Passed: strict OpenSpec (35 items), harness regression suite (195 tests; one optional qualification skip), C# and PWA lint, formatting, types, 946 units, 304 browser tests, 1,191 API tests, static contract/mock and Kiota parity, live endpoint parity, and real PostgreSQL integration.
- Browser skips: 17; no failures, flaky tests or retries. General API suite skips: 125 conditional/manual cases. The separate PostgreSQL gate executed 140 tests with zero skips, including report lifecycle/recovery paths: `.task/database-tests/runs/0330b788eb894d51ac7b2f16bb38180c/result.json`.
- Additional passes: API/test Release build, host PWA production build, migration image build, fresh isolated migration and API health; installation Compose syntax with synthetic required inputs; retained SDK/ASP.NET image manifests.
- Earlier PostgreSQL runs remain failed evidence: `2157e608f44d4204804024c695661d71` had nine filesystem failures and changed identity; `269d27da6fae4f71adbc9521a961933d` executed 140 passes but its runtime identity changed during browser installation. Granting test access to synthetic recovery directories under `/home/agent` and freezing installed tooling resolved those prerequisites; no tests were weakened.
- Full preparation initially blocked on unclassified `release-template/synology/compose.yaml`. Its image-only YAML diff was reviewed and Compose-validated separately; supported preparation passed for the other complete task paths, including authorized Kiota generation, which produced no client drift. Final verification included every task path with the conservative union.
- Local PWA image construction failed at `apk add --no-cache curl`: the cloud network's Alpine TLS certificate is not trusted inside the image. No trust check was disabled. Local production API image construction is unrun because it downloads GitHub-hosted binary PDFium notice archives that the connector cannot retrieve. The full local push gate consequently remains blocked at its production-smoke prerequisite; no smoke skip or alternate input is used. Production smoke and install identity must pass in the existing PR CI before qualification is complete.

Additional migration-parser qualification passed all 20 focused Docker-smoke/parser tests with `WFS_TEST_SQLDEF=1`; the normal source pipeline Node suite passed six tests. A full-harness run with that global opt-in flag failed three harness-identity fixture assumptions: those tests expect narrow scope, while the opt-in deliberately requests full runtime identity. That failed diagnostic is retained in `.task/dependency-uplift-2026-10-24/harness-sqldef.log`; the focused parser qualification and default full harness are separate passing results. No assertions or runtime protections were removed.

The staged pre-commit gate passed whitespace, strict OpenSpec, harness, static contracts and PWA formatting. Its generated-client hook was not selected by the changed-file filter; the explicit Kiota check and full harness already passed it.

CI completion will be recorded in the PR description at its exact final head; local production-image failures/limitations are not relabeled as local passes.

No merge, release image publication, deployment, billable AI call or household data operation is authorized.
