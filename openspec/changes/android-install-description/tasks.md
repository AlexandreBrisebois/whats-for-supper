# Tasks

## 1. App-controlled description

**Outcome and scenarios:** Publish consistent app-controlled description / Read public description metadata; preserve existing installation identity.
**Owners and boundaries:** Base manifest, root metadata, existing unit identity matrix and public install-identity browser test. No API contract changes.
**Prerequisites:** Repository toolchain and browser fixtures. Device qualification is separate.

- [x] 1.1 Update identity matrix and public HTML/manifest assertions; run `task test:unit -- src/lib/server/app-identity.test.ts` before implementation and observe exact tagline failures.
- [x] 1.2 Set the base description and reuse it in HTML metadata; pass the focused identity and PDF manifest units without changing other identity fields.
- [x] 1.3 Pass `python3 pwa/e2e/run-install-identity.py` for stable/beta × demo/production; document source tracing and refresh constraints in evidence.

## 2. Android qualification

**Acceptance boundary:** Supported real Android device/emulator, exact original installed-app details screen. Manifest/HTML/browser emulation does not qualify this boundary.

- [ ] 2.1 Capture actual screen navigation, current text, Android/Chrome versions and installation mechanism; verify fresh-install before/after text without altering an existing installation.
- [ ] 2.2 Verify existing-install refresh separately, record timing/status and unchanged identity; if the surface is browser/OS-owned, evidence that limitation and bring a supported alternative for review. Do not claim completion or reinstall to force success.

## 3. Final integration

- [ ] 3.1 Prepare reviewed paths, scope-review the complete diff and run `task verify` with all task paths; report the invocation record and every failed/blocked check.
- [x] 3.2 Check equivalent PRs, publish a separate draft PR and inspect final-head CI; keep issue #274 open and this change active while Android qualification is incomplete.

The final local harness completed with one unreproduced Home/QuickFind timeout; 3.1 remains incomplete as an all-green verification claim. Five traced repetitions and exact implementation-head CI passed. See evidence and PR #286 for final documentation-head CI.

## Workflow follow-up

- Archive only after required qualification and verification genuinely complete; no deployment or production operation is authorized.
