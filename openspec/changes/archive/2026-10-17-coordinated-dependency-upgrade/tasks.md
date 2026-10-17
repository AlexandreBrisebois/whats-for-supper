# Tasks

## 1. Restore a compatible application and database cohort

- [x] 1.1 Record baseline restore failure and published dependency ranges; inspect SDK/CI/runtime/tool references. Dependency-resolution regression uses restore evidence, not an invented product-behavior red test.
- [x] 1.2 Align EF/provider and update supported NuGet packages, SDK, ASP.NET, tools and images; verify restore/build without downgrade or constraint warnings, API tests and real PostgreSQL integration tests. Document exact retained/version decisions.

## 2. Align the browser toolchain

- [x] 2.1 Record baseline formatter/resolution results, validate npm candidate peers in a disposable dry run, then update manifest/lock and Node/npm/container inputs. Verify reproducible npm ci, npm ls, formatting, lint/types, unit tests, production build, Playwright and generated-client parity; preserve approved API and mock contracts.

## 3. Combined runtime acceptance

- [x] 3.1 Review migration/runtime compatibility and complete diff; run full repository harness including live endpoint parity and PostgreSQL tests, with disposable Docker smoke required in CI before main publication. Record real results/skips and any compatibility corrections; do not weaken assertions or contracts.

## Workflow follow-up

- Archive this tooling-only change after acceptance; no capability-spec synchronization is required.
- Verify final documentation, publish a new branch/PR through GitHub connector, and monitor exact-commit CI to terminal. Main publication is authorized after validation; no deployment or release.

Baseline: restore reproduced NU1605/NU1608; PWA format:check passed. Registry metadata and disposable inventory retained under /tmp/wfs-upgrade-inventory.

Checkpoint: compatible npm candidate retains ESLint 9.39.5 and TypeScript 6.0.3 for peer constraints. npm 12.2.0 dry-run fails EALLOWREMOTE for the official Tailwind wasm tarball; npm 11.21.1 is being qualified without policy overrides. SDK RC2 restore requires /home/agent/.dotnet shared-memory writes; a narrowly scoped permission request was denied by automatic review citing obsolete read-only scope. Restore has not been retried after denial.

Progress: aligned restore/build and locked restore passed; API 937 passed/62 opt-in skipped; PWA 824 unit tests, lint, types and client parity passed; migration parser 18/18 passed with WFS_TEST_SQLDEF=1. Initial PostgreSQL verification invalidated its result because dependency/documentation edits were still occurring; final full harness must rerun on stable inputs. SDK permission issue resolved with explicit authorization and narrowly scoped directory creation. npm clean install passed; optional native install-script warnings remain visible, without policy overrides. Production Docker smoke is deferred to repository CI because the Dockerfile directly downloads GitHub-hosted PDFium notices and all interactive GitHub access must use the connector. It remains required before main publication.

Compatibility regression: full harness 12bd11a2180e4c6da93ebd8aa58f9072 passed every gate except PostgreSQL (60 passed/5 failed). RC1 provider cannot translate array Contains in report lifecycle ExecuteUpdate. Add a steps-only/cross-recipe regression before the bounded query correction; preserve single-statement conditional updates and matching-attempt guards.

Regression evidence: new StepsOnlyAttempt test failed before correction (4e0ff6f9c2834115a83a9c9e7ead672c). Equivalent Any translation also failed (4e85aa85e9904ee7a8dee4b2ffde07e9). Parameterized atomic updates passed all 7 RecipeImportReportPostgresTests with zero skips (ce7b69daaddd44caa7c08303a2948983). No assertion, data constraint, API contract or workflow guard was relaxed.

Final local acceptance: full repository harness `.task/agent-finish/runs/1affcb1128fd43c0953bd4e2cac30413.json` passed all selected checks with stable source/runtime identity: 824 unit tests, 267 browser tests/13 existing skips, API tests and 66 real PostgreSQL tests/zero skips; lint/types/format, harness tests, client/contract and live endpoint parity passed. Locked NuGet restore and clean npm ci passed. Docker smoke remains a mandatory PR-CI gate before authorized main publication, not a locally established claim. No schema migration or API contract changes.
