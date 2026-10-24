# Design

## Context and Existing Ownership

Current main is `e76332c9e35c3d8584cbed6476ea9c43b4d40ea7`. The API/test manifests and `api/Directory.Build.props` own the EF dependency graph; NuGet and npm locks own resolution. Dockerfiles, Compose templates, `.nvmrc`, Taskfile and GitHub workflows own matching runtimes and tools. `RecipeImportReportService` already preserves atomic report transitions through parameterized SQL; retain that workaround.

## Decisions and Tradeoffs

- Npgsql `11.0.0-rc.2` publishes exact dependencies on EF Core/Relational `11.0.0-rc.2.26504.105`. Align Core, Relational, Design, InMemory and shared overrides together. SDK, ASP.NET and dotnet-ef are already RC2. This resolves the published version mismatch, but does not prove the separate query translator bug fixed. The new cohort must pass PostgreSQL tests with the existing workaround intact.
- Consider only verified compatible package updates. Keep ESLint 9.39.5 while eslint-plugin-import excludes 10; keep TypeScript 6.0.3 while typescript-eslint requires `<6.1.0`. Test npm 12.2.1 by a clean disposable install; retain npm 11.21.1 if its normal fetch policy rejects the current dependency graph. No fetch-policy or peer override.
- Retain the current .NET RC2 SDK/runtime, PostgreSQL 18.6, pgvector 0.8.7, PDF renderer, Kiota CLI and current GitHub Action major lines after publisher checks. Update matching Node/OpenSpec pins and infrastructure patches only after registry preflight. Do not advance PostgreSQL major or remove native-script protections.
- Extend existing EF PR #293 with a custom commit based on current main, preserving branch history without force push, and convert it to draft. Custom non-Dependabot commits prevent its normal automated rebase; remove obsolete bot instructions from its description. Leave packages owned by #294/#307/#308/#309/#320 unchanged, and verify both locks preserve them. Do not close those PRs or touch separate feature/spec work.

## First Observable Slice

Preserve recipe capture, report lifecycle, scheduling, grocery/recovery and search behavior through the actual API/EF/PostgreSQL boundary. Run locked restore/build, existing API tests and the full isolated PostgreSQL suite. Preserve the approved OpenAPI contract and verify generated Kiota parity after runtime updates, then exercise consumers through unit and full mocked-browser suites. No new behavior is intended, so no invented red test; any actual migration fix first requires a reproducing regression.

## Compatibility, Rollout and Reversal

Publish only a draft review PR; no release, merge or deployment. Version and lock changes can be reverted together without data migration. Keep database images on PostgreSQL 18. Docker production smoke must execute in CI; interactive local production API builds are blocked by GitHub-hosted binary notice archives unless the connector can retrieve them. Local database/migration runtime checks remain independently useful and must be recorded separately.
