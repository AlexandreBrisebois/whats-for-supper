# Design

## Context and Existing Ownership

Project manifests own NuGet dependencies; global.json and CI select the SDK; Dockerfiles select runtime/build images. PWA package.json/package-lock.json own JavaScript resolution. Existing database tests own persistence acceptance; the OpenAPI document and generated client remain unchanged unless generator output requires synchronization.

## Decisions and Tradeoffs

- NuGet metadata proves Npgsql 11.0.0-rc.1.1 requires exactly EF Core/Relational 11.0.0-rc.1.26425.128. Align Core, Relational, Design, InMemory and dotnet-ef to that version. The owner approved this narrow correction from main's RC2. Do not suppress NU1605/NU1608 or force resolution.
- SDK 11.0.100-rc.2.26504.105, ASP.NET packages and runtime RC2 are published. EF RC1 targets net11.0; exercise this combination through restore, real PostgreSQL and container tests. Align SDK references across local/CI/container builds.
- Prefer newest compatible stable npm packages, retaining TypeScript 6.0.3 because typescript-eslint 8.71.2 requires <6.1.0. Retain ESLint 9.39.5 because eslint-plugin-import, jsx-a11y and react peer ranges exclude 10. Use a disposable manifest and dry-run before changing the real lockfile. Align Node 26.12.0 and npm 11.21.1 across local, CI and container preparation.
- Commit NuGet lockfiles and enforce locked restore in CI/container builds. Pin formerly floating NuGet versions and record explicitly retained container major lines. Do not upgrade PostgreSQL's data-directory major version or replace native rendering dependencies merely because prereleases exist.

## First Observable Slice

Reproduce the baseline NuGet restore failure, then align the API/test/provider cohort and establish successful restore/build and PostgreSQL operations. This is dependency resolution rather than new product logic, so a fabricated behavior red test is not applicable. Existing integration tests exercise real persistence and HTTP seams. Widen to PWA/browser/container verification only after restore works.

## Compatibility, Rollout and Reversal

No OpenAPI shape, SQL schema, vote semantics or data migration changes are intended. Generated-client checks and real database tests must establish preserved compatibility. A new PR contains the complete cohort; main publication is authorized only after full validation, including CI smoke; no deployment is performed. Application revision rollback remains possible without a schema rollback. Existing opt-in test skips must be reported, not silently treated as tested.

## Provider compatibility correction

The real PostgreSQL suite reproduced failures translating array membership in the two recipe-report lifecycle updates; both Contains and equivalent Any forms fail under this cohort. Use parameterized PostgreSQL UPDATE statements for attempt-start and success only, preserving atomic predicates, statuses and matching-attempt guards. No read-then-write workaround or schema change. Existing mixed/duplicate/missing/stale-attempt tests plus a new steps-only cross-recipe test establish preserved behavior.
