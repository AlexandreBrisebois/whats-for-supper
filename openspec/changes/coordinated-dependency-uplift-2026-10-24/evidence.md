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

## Immutable CI qualification

Implementation head `19b721b81b57bad5dfec6b476344a96048633367` completed both [push CI](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/40134650888) and [PR CI](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/40134652620) successfully. The PR merge revision `14ba1e5185a28761882262bd26b194fae77d8bb4` has an empty file diff against that head, verified through the connector.

- CI API tests: 1,329 passed, 15 conditional/manual skips. CI capability browser suites: 304 passed, two skips, no reported retries/flakes; local default discovery additionally includes 15 live opt-in skips.
- Production AMD64 API (including PDFium notices), PWA and migration images built successfully. [Production smoke](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/40134652620/job/120993548469) passed fresh migration, PostgreSQL/API/PWA health, endpoint parity and teardown. This qualifies that CI platform and those checks; ARM64 runtime and broader seed behavior are unrun.
- [Installation identity](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/40134652711) passed native AMD64 stable/beta with demo off and on, using the tested PR merge source. No release images were published.
- Both C# and JavaScript/TypeScript CodeQL analysis jobs succeeded. The [CodeQL aggregate](https://github.com/AlexandreBrisebois/whats-for-supper/runs/120995941314) is neutral: two legacy main JavaScript/TypeScript configurations are absent, so introduced-alert comparison is unavailable. No security workflow or baseline was changed to clear that note.
- Independent connector diff review found no blocking source issue; both locks are confined to declared updates/transitives, other PR-owned packages are unchanged, and `RecipeImportReportService` matches main.

The final evidence/task update changes documentation only; its verification and exact final-head CI are recorded in the PR description. The final OpenSpec task stays open because the full implementation-range local push gate remains blocked at its production-smoke prerequisite. CI qualification does not relabel local failures or unrun checks as local passes. The change remains active and draft; no archive, merge, release or deployment is claimed.

No merge, release image publication, deployment, billable AI call or household data operation is authorized.
