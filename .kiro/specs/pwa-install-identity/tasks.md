# PWA Install Identity — Tasks

**Status:** Specification created; implementation tasks remain unstarted.
**Requirements:** [requirements.md](requirements.md)
**Design:** [design.md](design.md)
**Execution:** [repository harness](../../../.agents/core/execution-harness.md)

All tasks below are required and dependency-ordered. Selecting a task requires implementation authorization; writing this specification does not authorize app changes. Before coding, begin a task session and read applicable Next.js docs. Follow tests-before-implementation. Stop each task at its bounded outcome; do not change demo backend behavior, unrelated health behavior, or authentication.

## 1. Identity resolution and runtime metadata

- [ ] ID-T1 — Implement D1/D2; satisfy ID-R1, ID-R2, ID-R4–ID-R7.
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
