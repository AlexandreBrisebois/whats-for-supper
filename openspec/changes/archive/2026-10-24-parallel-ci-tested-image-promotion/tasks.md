# Tasks

## 1. Affected parallel PWA coverage
- [x] 1.1 Add completeness/selection regressions and implement affected capability suites sharing one build; Node tests, Playwright discovery and actionlint establish selection and workflow structure.

## 2. Database smoke and tag-only image packaging
- [x] 2.1 Add no-build smoke/identity/tampering regressions and implement single-AMD database smoke plus tag-only native ARM/AMD build/smoke/archive; verify focused Python tests and Compose parser results.

## 3. Publication and workflow retirement
- [x] 3.1 Add exact-source eligibility and workflow regression coverage; implement source-check reuse/fallback and image-only publication, narrow identity triggers and remove PDF workflow. Verify Python tests and actionlint; document behavior.

## 4. Verification
- [ ] 4.1 Review the owned diff, run final task verify and reconcile actual results before claiming complete.
- [ ] 4.2 Qualify hosted affected-suite fan-out/report merge, native ARM/AMD release smoke, source reuse/fallback and registry manifests in Actions before runtime completion.

## Evidence

- Initial red: three workflow tests failed for absent suite/build, native matrix and source reuse. No-build smoke regression failed because the command contained --build.
- Steering red: workflow tests failed while ordinary smoke still used the native packaging matrix and E2E still used a fixed full matrix; then implementation changed to affected suites and tag-only packaging.
- Focused Python tests ran 56 checks with one opt-in skip; all six Node checks pass. Full `task test:agent` ran 177 tests with one opt-in skip. Real Playwright discovery, Compose parser and actionlint pass. A temporary real Playwright reporter probe generated two unique suite blobs and merged two passing non-browser results. Discovery covers all 303 non-live tests exactly once across the complete four-suite union; 15 live tests remain separate. Discovery is not browser execution.
- Earlier task verify record `.task/agent-finish/runs/0b9fd9d43fd24bf2a62218f7b0b50507.json` failed formatting on eight unrelated PWA files and detected concurrent content mutation. It describes superseded implementation content and is not evidence for the final revision.
- Hosted qualification is not run; no commit, push, release or deployment has been performed.

- Broader verification exposed five affected deployment-identity test failures caused by assumptions about the old publish-job layout. Their shell extraction and architecture/channel assertions were updated for the new reusable native-build workflow, preserving all invalid-version and immutable-channel checks. Type errors in unrelated GroceryList tests and unrelated main-spec validation failures remain outside scope.
- Green: `task test:unit -- src/lib/server/deployment-identity.test.ts` passes all 15 channel/version/architecture assertions. Scoped preparation passes for both changed PWA files. Focused pipeline regressions also run in CI when their tooling changes.
- Final CI implementation verification record `.task/agent-finish/runs/e704ecc7f55a4e5e92fa4d7913cff5b5.json`: documentation, harness, lint, formatting and all 946 PWA unit tests passed; unrelated main-spec validation and GroceryList test typing failed, and concurrent source mutation invalidated final content identity. Remaining API/browser/database checks were not run. This is evidence for that recorded revision, not a current whole-repository success claim.
- User requested archival of both CI and local push scopes after implementation. Archive preserves both incomplete verification tasks above, including unrun hosted architecture/publication qualification.
