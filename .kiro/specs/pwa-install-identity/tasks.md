# PWA Install Identity — Tasks

**Status:** ID-T1 complete; ID-T2 background correction implemented, fresh finish pending; ID-T3/ID-T4 unstarted.
**Requirements:** [requirements.md](requirements.md)
**Design:** [design.md](design.md)
**Execution:** [repository harness](../../../.agents/core/execution-harness.md)

**ID-T3 scope override — October 4, 2026:** User explicitly excluded AWS work
from this execution. AWS frontend/backend propagation, synth/tests, and actual
Amplify SSR qualification are not applicable to this selected slice. Do not infer
AWS support from Docker verification. Stop before ID-T4.

**Name decision — October 4, 2026:** User directed the same app name for every
version. Stable, demo, beta and beta-demo all use "What's for Supper?" in the
manifest and initial Apple/browser metadata. Existing icon markings and hints
remain. This explicitly supersedes the earlier beta-name policy.

**Build boundary — October 4, 2026:** User directed that amd64 builds run only
in GitHub Actions. Local image verification builds arm64 stable/beta only; amd64
acceptance must come from GitHub Actions. Do not run local emulated amd64 builds
or claim arm64 success proves architecture agreement.

All tasks below are required and dependency-ordered. Selecting a task requires implementation authorization; writing this specification does not authorize app changes. Before coding, begin a task session and read applicable Next.js docs. Follow tests-before-implementation. Stop each task at its bounded outcome; do not change demo backend behavior, unrelated health behavior, or authentication.

**Implementation constraint:** This feature is not gated by a feature flag. Do not introduce or require a preview, opt-in, or rollout flag for identity resolution, metadata, icons, or hints. Existing DEMO_MODE and the image release channel determine the identity directly. Preserve unrelated feature gates such as PDF share-target configuration.

## 1. Identity resolution and runtime metadata

- [x] ID-T1 — Implement D1/D2; satisfy ID-R1, ID-R2, ID-R4–ID-R7.
  - Outcome: server resolver and public /manifest.json plus initial Apple/browser metadata agree.
  - Allowed effects: pwa/src/lib/server/app-identity.ts (new), manifest Route Handler (new), removal of pwa/public/manifest.json, pwa/src/app/layout.tsx, targeted tests; channel artifact scaffold in pwa/Dockerfile where needed.
  - Context: current manifest/layout, DemoModeOptions, PWA local instructions, installed Next.js guides, existing proxy access policy.
  - Write meaningful tests first for all decision-table cases, boolean parsing parity, initial HTML, manifest preserved fields, public access, and runtime cache isolation.
  - Checks: task test:unit; task typecheck; task lint; targeted Playwright via task test:e2e.
  - Stop if static evaluation or access policy prevents request-time public metadata; resolve within this slice without relaxing authentication.

## 2. Icon assets and UI hint

- [ ] ID-T2 — Implement D3 after T1; satisfy ID-R1, ID-R3–ID-R6, ID-R8.
  - Outcome: demo changes only the icon corner and quiet app hint; beta icon is clearly distinct.
  - Allowed effects: new versioned pwa/public/icons assets, shared IdentityHint component, Header, welcome page, directly used locale files and component/E2E tests.
  - Context: current icon artwork, existing theme tokens, header/welcome layout, locale conventions, T1 resolver output.
  - Write component tests before UI logic; verify no hint for production, Demo/Beta texts and accessible overlap description, original brand wording, and no extra interaction.
  - Checks: task test:unit; task typecheck; task lint; targeted task test:e2e; inspect image dimensions and maskable crop previews.
  - Stop before unrelated palette/layout changes. Final shade/geometry must pass small-size visual review.

## 3. Existing env propagation and automatic beta images

- [ ] ID-T3 — Implement D4 after T1/T2; satisfy ID-R2, ID-R4–ID-R7.
  - Outcome: existing DEMO_MODE drives demo identity at runtime; beta channel is embedded automatically and survives deployment.
  - Allowed effects: pwa/Dockerfile, .github/workflows/publish-dockerhub.yml, docker/compose/apps.yml, release-template/synology/compose.yaml, targeted AWS frontend/backend config wiring, directly affected deployment docs and config tests.
  - Context: validated release tag grammar, existing API demo configuration, merged Compose overrides, Amplify build/runtime behavior.
  - Test first: stable/beta tag-to-channel mapping; reject invalid channel; final image contains channel metadata; API/PWA DEMO_MODE parity.
  - Checks: docker compose config with synthetic inputs; stable and beta Docker builds, same-image restarts with DEMO_MODE on/off, metadata HTTP assertions; existing AWS synth/tests for touched constructs; task test:unit.
  - Confirm both published platform outputs use the same channel. Do not publish or deploy as part of verification without authorization.
  - Stop if AWS SSR configuration cannot be verified; record that blocker rather than claim build variables prove runtime availability.

## 4. End-to-end and device acceptance

- [ ] ID-T4 — Verify D1–D4 after T3; satisfy ID-R1–ID-R8.
  - Allowed effects: targeted PWA tests, directly relevant install/config documentation, evidence in this tasks file.
  - Assert full stable/beta × demo-on/off matrix, exact names, Apple metadata, public icon availability, hints, preserved manifest fields, backend-independent rendering, and invalid demo fallback.
  - Assert identity behavior is available without any feature-enable flag; only DEMO_MODE and the baked release channel select the identity variant.
  - Run task agent:prepare, inspect task agent:session:status and scope diff, then task agent:finish; classify each result accurately. Use targeted task test:e2e:ci for production-build behavior.
  - Real-device acceptance: install production/demo/beta from separate origins together on iOS and Android; inspect names, ribbons, maskable cropping, light/dark presentation, and update/reinstall behavior. Record device/OS/browser and tested image identity.
  - Stop with explicit blocked device/deployment evidence if unavailable; do not substitute screenshots or browser mocks for actual installation evidence.

## Spec-only evidence and handoff

- Authorized scope: this new specification's requirements, design, and tasks on spec/pwa-install-identity.
- Private baseline: main commit 44dcd91dd987b46f3612c6942db886e82fb75613; tree 8b73ce3935dec5ac9e055873ed1b921b0c44a5dd. Only three new Markdown files are intended.
- Repository clone was blocked because the execution environment's configured proxy was unreachable. Specification work uses GitHub connector reads/writes; local task agent:begin/prepare/finish are unavailable. Equivalent baseline and scope are recorded here; no application verification is claimed.
- Spec validation: relative Markdown links and whitespace checked before commit; requirement → design → task coverage reviewed for ID-R1–ID-R8.
- Application tests/builds, deployment checks, and real-device acceptance: not-run (spec-only scope).
- Next action: review the proposed beta name/color and overlap policy, then select implementation work. No implementation task is checked off.

## ID-T1 dependency acceptance — October 3, 2026

- Existing T1 source hashes matched the prior private scope review before T2 edits.
- Current verification: `task test:unit` passed (603 tests / 67 files); `task typecheck` passed; targeted stable/non-demo Playwright passed (1 test).
- User-provided local evidence: `task lint` passed (API verified 208 files, formatted 0; PWA ESLint passed). User confirmed all four cases in `python3 -B .task/identity-T1/run-matrix.py` passed. This covers stable/beta × demo off/on, independent PDF gates, public metadata/icons, initial HTML agreement, cache headers and retained auth access policy; local matrix output was not retained by this agent.
- Prior stale harness session was retired with explicit user approval; official `ID-T2` session started at bb76d775cc57cd43787263036068836eeb94f064. No T1 fixes or deployment changes were made for dependency acceptance. T2 preparation/scope review/finish will qualify the resulting application changes separately.
- T1 dependency accepted from the required task checks; production-image restart, deployment and device qualification remain T3/T4 obligations.

## ID-T2 implementation checkpoint — October 3, 2026

- Task session: `ID-T2`, baseline bb76d775cc57cd43787263036068836eeb94f064. T1 dependency accepted above; existing T1 scaffolding, unrelated spec edits and generated Next.js declarations preserved.
- Assets: 24 PNG/ICO files under `pwa/public/icons/install-v1/{demo,beta,beta-demo}`. Families provide 16/32px favicon PNGs, two-frame favicon ICO, 180px Apple, 192/512px normal and maskable PNGs. Shortcuts reuse each family's normal 192px icon. Production files are unmodified; hashes are retained in private task evidence.
- Artwork: original flame/sun/leaf artwork inspected before derivation. Demo adds only a small dark DEMO corner marking. Beta uses violet (#5B2C91) on the edge-connected background with a prominent cream BETA marking; beta-demo adds DEMO. Original foreground artwork is retained. Maskable DEMO geometry differs from normal geometry and fits the 80% safe circle. Native 32px, circular, rounded-square and safe-circle previews visually reviewed; automated pixel comparisons verify corner-only demo edits and maskable mark containment.
- Wiring: resolver selects versioned assets; manifest normal/maskable/shortcut paths and initial favicon/Apple metadata agree. Root layout supplies only public demo/channel facts to the shared non-interactive localized hint. Header, welcome and existing Header-hidden shell receive one hint without reserving layout space. Brand wording, theme tokens, controls, auth and PDF share-target policy remain intact.
- Test-first: new component imports/assets and three variant wiring cases failed before implementation; focused component, welcome, metadata and asset tests then passed. Full PWA unit suite passed (613 tests / 69 files) and typecheck passed before the final additional three pixel invariants; those invariants passed separately. Final harness results supersede intermediate evidence.
- Playwright: expanded targeted suite covers initial metadata/icon availability, both locales, welcome/planner/capture, 320px/768px control overlap and layout stability. Agent execution blocked at server startup (`listen EPERM 127.0.0.1:3017`); no T2 browser success claimed yet. User local matrix handoff: `python3 -B .task/identity-T1/run-matrix.py` (three tests per case, twelve total).
- Preparation passed; final scope review/finish evidence remains in the private harness records. ID-T2 stays unchecked pending required acceptance. No T3 deployment, publication or AWS work was performed. Production-image and real-device acceptance remain not-run and outside T2.

### ID-T2 verification handoff

- `task agent:prepare` passed; all post-begin paths reviewed against task scope, including six overlaps with pre-existing T1 files. Production icon SHA-256 hashes matched before finish.
- `task agent:finish` attempted at content identity `a8c0ca5880bb9360572ce03c262b75ff618a4e842320859ba4a0380dcbd10a7e`; overall exit 1, not accepted. Passed: documentation, PWA formatting, typecheck, PWA unit tests (616 tests / 69 files), immutable content check. PWA ESLint also passed separately.
- Environment-blocked checks (recorded as failed Task exits by the harness): API lint named-pipe bind denied, impact Playwright listener bind denied at 127.0.0.1:3000, API testhost TCP bind denied. Kiota client check timed out after 20 seconds (blocked). Static route/schema/reconciliation checks passed.
- The mock audit initially failed on the legitimate manifest URL id `/`. The exact assertion was preserved as `expect(manifest.id).toBe('/')`, avoiding the domain-entity mock heuristic; `task agent:drift:mocks` subsequently passed. Preparation, typecheck and PWA lint passed again after this test-only correction. No harness audit rule or mock contract was changed.
- The E2E assertion correction and this documentation are later content than the finish identity above; that record is not a success for final content. Final scope review and current hashes are retained under `.task/identity-T2-preflight/`. T2 browser acceptance is still pending; T1's earlier user-reported matrix success is not T2 evidence.
- Next local checks from the repository root: `python3 -B .task/identity-T1/run-matrix.py` (all four cases, three tests each), then `task agent:finish`. Keep ID-T2 unchecked until these required checks pass; stop before ID-T3. No committed, published or deployed changes.

### ID-T2 acceptance complete — October 4, 2026

- User confirmed the updated `python3 -B .task/identity-T1/run-matrix.py` passed all four identity cases, three tests per case (12 total). The targeted suite covers English/French accessible hints, beta-demo description, unchanged welcome branding, welcome/planner/capture placement, control overlap/layout geometry at 320px/768px, public icon URLs and initial metadata agreement. Matrix success is user-reported; individual local run output was not retained by this agent.
- Successful local `task agent:finish` record verified on disk and supplied by the user: all applicable automated checks passed, including lint, formatting, typecheck, unit tests, impact E2E, API tests, and static contracts/client checks. Immutable tested identity: `dcd3f501b3a57f94ce4183da7dd4cb8e37c5d4327bbfb8dbf72a500e63e9cfbb`. Content check passed. Earlier environment blockers and corrected mock-audit failure are historical and superseded by this local success.
- The 40 reviewed task paths still matched the private scope-review fingerprints before this acceptance bookkeeping; original production public files matched the task baseline byte-for-byte. Scope attribution and six T1 overlaps were reviewed. All required ID-T2 acceptance checks passed; ID-T2 is complete.
- These final task/HANDOVER updates are documentation after the tested finish identity, checked separately for links and whitespace. No application code or assets changed after acceptance verification; do not represent the prior finish digest as covering this later documentation.
- ID-T3 and ID-T4 remain unstarted. Deployment/publication/AWS work and real-device/install qualification were not run. No commit, publish or deploy action was performed.

### User-directed beta background correction — October 4, 2026

- User rejected the beta/beta-demo violet backgrounds and explicitly requested their original backgrounds back, superseding the prior background treatment in ID-R4/D3. Retained all existing BETA/DEMO labels and positions, icon sizes, paths and identity/UI wiring.
- Re-derived only the 16 beta/beta-demo PNG/ICO assets directly from their corresponding untouched production originals with the existing badge overlays. No background extraction/recoloring remains; the original texture, shadow, flame and leaf are intact.
- Test-first background-region comparisons failed for both families before regeneration and passed afterward; all eight asset tests passed, including dimensions/formats, small demo changes and maskable safe-area invariants. Normal, circular, rounded-square and safe-circle previews reviewed again.
- Prior local full matrix/finish success belongs to the previously accepted assets. It does not establish a fresh full completion gate for this asset correction. Known sandbox socket restrictions remain; no application behavior, deployments or successor task changed.

- Correction finish attempted at identity `ccd98425c7fbfe269342cff789a8816892f01acbb459a9dae9f34a3ce21d1850`: documentation, formatting, typecheck, all 618 unit tests and immutable content passed. Static route/schema/mock/reconciliation checks passed. Full lint, impact E2E and API tests were environment-blocked by named-pipe/TCP listener permissions (harness records failed Task exits); Kiota timed out (blocked). ID-T2 reopened solely for fresh correction completion evidence; local handoff `task agent:finish`. Earlier matrix evidence covers unchanged identity/UI/URL wiring; the new asset tests and visual review cover the restored background bytes. No browser/deployment/device success is inferred for new bytes from the prior record.

## ID-T3 implementation checkpoint — October 4, 2026

- Dependencies reviewed before editing: T1 acceptance above; a newer local ID-T2
  correction finish reports all applicable automated checks and immutable content
  passed at `060ba1dd82f86d5a8c5a4ce27147ff3cfc6671227230a3cad25a2499c6643a4f`.
  All 42 correction-review fingerprints match current files, including restored
  asset bytes. The full finish identity includes runner environment/tool inputs;
  it is not asserted to equal this sandbox's identity. Earlier pre-correction
  success was not substituted for this fresh record.
- Preserved the ID-T2 session and successful finish under ignored
  `.task/identity-T3/predecessor-ID-T2/`; began task-local ID-T3 at
  `bb76d775cc57cd43787263036068836eeb94f064`, preserving 48 ambient paths.
- Changes: shared Compose and Synology PWA runtime `DEMO_MODE` now use the exact
  API interpolation/default. Docker Hub derives stable/beta from the validated
  version and passes it only to the PWA build on both published architectures.
  The final PWA image retains inspectable `/app/release-channel.json`, in addition
  to the predecessor's compiled immutable resolver input. Publication and Synology
  docs describe recreation, channel inspection and install refresh limitations.
- Test-first: all 15 new deployment tests failed before implementation, then
  passed. Focused identity/config/asset tests passed 52 tests across four files;
  `task test:unit` passed all 633 tests across 70 files. Invalid channel rejection
  is exercised by executing the Dockerfile's existing artifact-generation program.
- Passed: 30 real `docker compose config --format json` parity cases with synthetic
  inputs across base, development, CI, both production override combinations and
  Synology. Missing, false, true, whitespace TRUE and invalid values agree between
  services. Private results: `.task/identity-T3/compose-results.json`.
- Blocked: Docker daemon socket permission denies image verification. Stable/beta
  final-image builds, same-image demo-off/on HTTP assertions and actual amd64/arm64
  output agreement have not run. Workflow wiring alone is not architecture-output
  proof. Local command: `python3 -B .task/identity-T3/verify.py --images` now builds two
  unpublished arm64 images and checks four runtime cases against exact image IDs,
  including an opposite runtime channel override and initial Apple/browser metadata.
  The previous four-image local matrix was superseded by the user's GitHub-only
  amd64 build boundary. GitHub Actions amd64 evidence remains pending.
- Preparation: `task agent:prepare` blocked before writes because Synology YAML
  is classified unknown. Scope review classifies it as the one runtime demo
  pass-through; no harness classifier/gate changes are authorized in this slice.
  The new test was explicitly formatted; this is not claimed as successful harness
  preparation. Finish must retain the conservative selected checks.
- Scope review: workflow owns channel derivation/build propagation; both Compose
  files own runtime parity; Dockerfile owns final JSON copy; the new PWA test owns
  configuration coverage; two deployment docs own operator guidance; this task
  evidence and the ID-T3 HANDOVER section own the incomplete handoff. The only
  application overlap is Dockerfile: compared with its saved ambient bytes, only
  the final JSON copy was added. Existing PDF gates, backend semantics, auth,
  identity/UI logic and all T2 icon assets remain unchanged. AWS is not applicable
  per the user's scope override; ID-T4, commit, publish and deploy are not run.
- ID-T3 remains unchecked pending image/runtime acceptance and required finish
  evidence. Final harness results are recorded separately; no completion claimed.

### ID-T3 finish and final handoff

- `task agent:finish` completed unsuccessfully at identity
  `2528e02ac0ef1eefa66b41f83c175ceb3ed52168e5a65dc1ec76f169dec36456`.
  Passed: documentation, all 98 harness tests, PWA formatting, all 633 PWA unit
  tests and immutable content. Static route/schema/mock/reconciliation checks
  passed. Full lint, impact E2E and API tests were blocked by sandbox named-pipe
  or TCP listener permissions (recorded as failed Task exits). Kiota timed out;
  live endpoint parity was unavailable; the conservative database-evidence gate
  remained blocked. No gate was weakened or bypassed.
- Typecheck failed on the new subprocess test environment's missing `NODE_ENV`.
  Added `NODE_ENV: 'test'` after finish completed. Then `task typecheck` passed;
  both channel/deployment test files passed all 21 tests; changed-file ESLint and
  Prettier checks passed. This correction and later documentation are newer than
  the finish identity; that record is not final-content success.
- All 48 public asset fingerprints matched the T3 baseline during scope review.
  Final private review fingerprints are retained in `.task/identity-T3/`.
- Remaining: run `python3 -B .task/identity-T3/verify.py --images` with Docker
  access, then obtain fresh applicable `task agent:finish` evidence. Preparation's
  unknown Synology classification and the conservative live/database selection
  remain explicit harness blockers, not task-specific database changes. AWS is
  excluded by the user. ID-T3 is implemented but incomplete; ID-T4 is unstarted.

### User-directed common app name

- Updated resolver, unit/E2E expectations, requirements/design, deployment docs
  and private image verifier to the common name. Removed the obsolete deployment
  paragraph describing different beta/demo names. Icon assets and hints unchanged.
- Test-first: two beta-name assertions failed before the resolver change. After
  implementation, all 52 focused identity/config/asset tests, `task typecheck`,
  changed-file ESLint/Prettier and diff whitespace passed. Unit cases verify
  manifest name/short_name and initial Apple/browser metadata for all four variants,
  while preserving independent PDF gate assertions.
- Browser/image/full-finish acceptance remains blocked as recorded above; no
  successful old finish is asserted to cover this newer user-authorized change.

### Local arm64 image acceptance — October 4, 2026

- User completed the local image verifier; saved
  `.task/identity-T3/image-results.json` inspected and contains all four passing
  stable/beta × demo-off/on arm64 cases.
- Stable image: `sha256:e7a4d41cb363afb955e793537dddfb2fb6e0e20398251ed36f5be1b9f16f93e6`.
  Beta image: `sha256:a5eefcfe9880bdd1a60b8c2a7570797ff55a59789551adf7c2846c4cdf6ddfa1`.
  Off/on cases use the same exact image ID within each channel.
- The verifier checks final channel JSON, image architecture, immutable runtime
  channel selection, common manifest/browser/Apple name, variant icon availability,
  manifest cache policy and retained default PDF share behavior. These results
  qualify those arm64 images; they do not establish amd64 or device acceptance.
- Still pending: GitHub Actions amd64 verification and fresh successful harness
  preparation/finish. ID-T3 remains unchecked; AWS excluded and ID-T4 unstarted.

### Local finish follow-up — October 4, 2026

- User supplied a newer finish; matching on-disk record verified at identity
  `979aa5b92be79ff7b6d23c568f8ef9488d8d0c682d4974977b2d125827e6cdb5`.
  All automated code/static checks passed: documentation, harness tests, lint,
  formatting, typecheck, units, impact E2E, API tests, contract/client checks and
  immutable content. Non-documentation task files still match the saved final
  scope-review fingerprints. This supersedes earlier socket/Kiota/type failures
  for this tested local identity; later evidence edits are documentation only.
- Finish exits blocked solely on live endpoint parity (no API listening at
  `http://127.0.0.1:5001/openapi/v1.json`) and the database-behavior evidence gate.
  Deployment paths currently select contract/unknown classes. No OpenAPI, API
  endpoint, persistence or database configuration changes are part of this task;
  no harness classification exception has been implemented and no blocked result
  has been rewritten as passed.
- GitHub Actions amd64 evidence and harness preparation/classification closeout
  remain pending. ID-T3 stays unchecked; ID-T4 remains unstarted.

### T3 closeout support — October 4, 2026

- User accepted closing the remaining T3 harness/amd64 gaps before moving to T4.
  Added a narrow session-baseline-aware classifier for the exact PWA environment
  addition in the two existing Compose files. API demo/default changes, removals,
  image/mount/database changes, corrupted or missing baselines and mixed unknown/
  contract changes retain conservative checks. All application checks remain;
  existing preview-switch classification and immutable evidence rules are preserved.
- Test-first: new classification acceptance tests failed before implementation.
  Native-build/workflow tests failed before the new shared verifier and workflow
  existed. `task test:agent` now passes all 105 tests. The current session selects
  application/documentation/harness checks; unrelated live/database gates remain
  intact and are not selected for this verified deployment-only delta.
- `task agent:prepare` now passes, formatting only the four task-local PWA source/
  test files, with no content changes. Current scope review preserves all 48 public
  asset fingerprints and the existing index; no session or source reset performed.
- Added `scripts/agent/install_identity.py`, sharing the previously accepted image
  assertions, with native architecture guards and source-revision evidence. Local
  default is arm64; amd64 requires GitHub Actions and a native x86 runner. The old
  private `verify.py` command delegates to this shared script. Its 30 rendered
  Compose cases passed. New actual image runs are not claimed from mocked guard tests.
- Added `.github/workflows/install-identity-validation.yml`: manual/relevant-PR
  native amd64 stable/beta matrix; demo off/on against each exact image ID; evidence
  artifacts; read-only repository permission; no secrets, registry login, push or
  deployment. Workflow execution is not-run because these changes have not been
  committed/pushed; the original no-commit instruction remains in force.
- Scope extension: `finish.py` owns exact configuration classification;
  `test_completion.py` owns positive and fail-closed coverage; shared verifier and
  `test_install_identity.py` own native/CI restrictions; new workflow owns
  non-publishing amd64 acceptance; execution-harness and publication docs explain
  the rule and commands. No AWS or T4 work performed.
- Next local command: `task agent:finish`. Earlier local success for code checks
  does not cover these later harness/workflow changes. A qualified local fresh
  finish and actual successful GitHub amd64 matrix remain required to check T3.

### Fresh local finish accepted — October 4, 2026

- User supplied successful finish; matching on-disk ID-T3 record verified at
  `80a658b9c6e2cdf3841c184a707e78072b308ffb009ca976d843a4db8d3f7735`.
  All applicable automated checks and immutable content passed: docs, harness
  tests, lint, formatting, typecheck, units, impact E2E, API tests and static
  contracts/client checks. Live endpoint/database gates are correctly not
  applicable to the verified selected delta, not converted from blocked to passed.
- All non-Markdown task paths match the saved final scope-review fingerprints.
  Preparation/scope review and local finish obligations are satisfied. These later
  evidence edits are documentation only and are checked separately.
- Local arm64 image acceptance remains recorded above. The sole remaining T3
  acceptance is actual native amd64 stable/beta demo-off/on GitHub workflow
  evidence. No commit/push authorization has yet been received; no GitHub run or
  successful architecture agreement is claimed. ID-T3 remains unchecked until
  that evidence passes. AWS excluded; ID-T4 remains unstarted.
