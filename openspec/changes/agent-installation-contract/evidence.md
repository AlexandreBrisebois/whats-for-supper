# Evidence and consolidation record

## Identity and preservation

On 2026-10-24, the user first requested a local planning-only continuation, then explicitly authorized one consolidated copy containing the implementation, corrected documentation and proposal, pushed before deleting both old GitHub branches. No merge into main, live deployment or status-feature implementation is authorized by that consolidation.

- Main locally and through the GitHub connector: `fd659bee3875fa672b2e9ca8dcbede98d657e81c`. Its only change after proposal base `ccca940acc6dbf59e20e0fa58591a70ec2bc1540` is the approved CONTRIBUTING simplification. Original checkout is clean and untouched by this work.
- Source branch `installation/shared-cloudflare-tunnel`: `cf1138e2a9571154fc5782d58697713e122abcdb`; original implementation `66292ee289e1bab4393be3ab94b7c64026898234`. The correction removes only a trailing blank line.
- Documentation branch `feature/installation-shared-tunnel-preview-docs`: `41a84b855bea0871b040ede6352566e70897f923`; exactly six Markdown files, already committed and pushed. Both branch tips were refreshed through the connector before consolidation.
- Replacement: `feature/installation-consolidated` in `/Users/alex/Code/wfs-agent-install-proposal`, based on current main. Existing source changes were applied without altering unrelated main history. Source docs supply the complete scenario mechanics; docs-branch compatibility warnings and verification boundaries are reconciled with those contents rather than copying its main-only instructions over the implementation.
- Verified history backup: `/tmp/wfs-install-before-consolidation.bundle` contains complete main/source/docs histories. Original and current partial planning before-images are under `/tmp/wfs-agent-install-planning-before/` and `/tmp/wfs-agent-install-planning-current/`. Existing worktrees and prior logs remain available pending retirement.

Issues [#327](https://github.com/AlexandreBrisebois/whats-for-supper/issues/327) and [#301](https://github.com/AlexandreBrisebois/whats-for-supper/issues/301) were refreshed through the connector: both open, zero comments. No issue update/closure is part of this work.

## Source facts versus proposed behavior

Main/published baseline bundles cloudflared in `compose.yaml`; setup has no option parser and zero does not prove startup. Consolidated development source has bundled/shared overlays, independent connector packaging, persisted `COMPOSE_FILE`, required shared alias and overlay-aware updater validation. Neither these development files nor the proposed JSON inspection interface should be assumed present in an existing ZIP. Status support must be established from trusted matching release docs before invoking flags.

Main omits `agent-install.md` from its ZIP; consolidated source includes it. Packaged relative links are valid only for included targets; other references remain absolute GitHub URLs. Common technical/reference links must be version matched when this proposal is implemented.

Local human secret entry remains required. Existing `awk -v` arguments expose an inherited process-list limitation; no complete confidentiality claim or writer remediation is included. Backup evidence is only an acknowledgement. DSM/architecture/HTTPS/recovery behavior remains unqualified unless independently observed.

The consolidation makes packaging substitutions portable across BSD/GNU sed, resolves temporary test paths before comparing mounts, and feeds terminal test answers after their prompts. These address the three recorded macOS obstacles without altering helper execution or topology. New status behavior remains entirely unimplemented; its tests/tasks are unchecked.

## Prior evidence retained, not rerun or upgraded

Primary historical summary: `/tmp/wfs-install-review.txt`. Its statements that docs were uncommitted/unpushed, and that no source contracts check ran later, are stale. Reconcile them with the user's handoff, local commit `41a84b85`, docs record below and `/tmp/wfs-install-source-contracts-327.log`; do not overwrite the historical summary.

| Status | Check and boundary | Evidence |
|---|---|---|
| Passed, prior | Six-file docs working-tree verification; no deployment behavior established | Docs worktree `.task/agent-finish/runs/c7628539b89148e0b96abec31cb27428.json` |
| Passed, prior | Docs commit/push checks and committed-range gate | `/tmp/wfs-install-docs-precommit.log`; docs worktree `.task/agent-finish/runs/6ca24c90a63242e89f7995d919c11b64.json`; user handoff confirms pushed state |
| Passed, prior | Synthetic documentation ZIP's nine relative links; agent links absolute | `/tmp/wfs-install-main-docs.zip`, `/tmp/wfs-install-main-markdown.patch`, primary summary |
| Passed, prior | Six focused source bundle tests with canonical TMPDIR and temporary sed adapter; real Compose rendering only | `/tmp/wfs-install-bundle-focused.log` |
| Passed, prior | Both prompt-driven setup modes with synthetic credentials and Docker stub preventing deployment | `/tmp/wfs-install-setup-probe.py`; user handoff and primary summary |
| Passed, prior | SDK RC2 installed, tool restore including Kiota 1.36.1, matching Node 26.12.0 and source lockfile npm install | User handoff; `/tmp/wfs-install-source-npm.log` |
| Passed, prior | Generated client parity after installing lockfile dependencies; earlier environment-related drift superseded | `/tmp/wfs-install-source-kiota-pinned.log` |
| Passed, prior | Separate static route/contract checks | `/tmp/wfs-install-source-contracts-327.log` |
| Failed/incomplete, prior | Native full source committed-range gate: GNU sed setup errors | `/tmp/wfs-install-source-push.log` |
| Failed/incomplete, prior | Adapted full source gate: four failures, one skip; path mismatch and terminal timeouts | `/tmp/wfs-install-source-push-adapted.log`; focused later passes did not make this gate pass |
| Not-run, prior | Later full-gate API/PWA/database/smoke after early failure | Primary summary and user handoff |
| Not-run | Live NAS, physical ARM, Cloudflare/routes, HTTPS health/login/assets/API/SSE, recreation, household recovery | Outside this consolidation; #301 retains qualification ownership |
| Not-applicable | New status-feature red/green or application contract changes in this consolidation | Proposal only; all implementation tasks unchecked |

Prior connector-confirmed source CI successes: [original implementation](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/40141799428), [whitespace correction](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/40142840202). These belong to their pinned source commits, not the new consolidated identity.

## Current validation

- Passed: proposal worktree `task init:python`, pinned PyYAML 6.0.3; ignored tooling only.
- Passed: `.venv/bin/python -B -m unittest scripts.agent.tests.test_install_bundle -v`, all seven tests on native macOS without the sed adapter or canonical TMPDIR override. Log `/tmp/wfs-install-consolidated-bundle.log`. Compose config starts no services; interactive Docker stub blocks deployment.
- Initial strict OpenSpec validation found two overly long requirement paragraphs; moved the scratch-space and inherited-confidentiality cases to scenarios before final validation.
- Final scoped OpenSpec, planning verification and consolidated-source checks are recorded by their actual command outputs and generated harness records. A record covers its tested identity only; later edits require fresh applicable checks.

No dependency pins changed. Keep SDK/runtime RC2 and intentional EF/Npgsql RC1 pins; PR #293 remains outside scope. Branch consolidation is not release publication, installation success, a merge or an acceptance claim for #301/#327.

### Consolidated validation results before publication

Planning-only verification passed with the complete six-file set: `.task/agent-finish/runs/fb78e23bb69541b084b937688dc32e3b.json`. Synthetic consolidated ZIP built natively; all 18 relative packaged links resolve. The seven bundle tests and 21 existing release-tooling tests passed without compatibility adapters.

First full verification `.task/agent-finish/runs/941460d9d6ea4fa988cb4874132909ba.json` stopped for runtime identity mutation after passing unit tests: fresh Vitest filesystem cache files appeared under `node_modules/.vitest-cache`. A controlled repeat of the unit suite passed 946 tests with zero changes to those cache bytes. No harness policy or application code was changed to suppress identity checks.

Stable-state full verification `.task/agent-finish/runs/7d38766056364df19154545009fcd96f.json` completed all selected checks but did **not** pass overall. Log: `/tmp/wfs-install-consolidated-verify-stable.log`.

- Passed: documentation, all 36 OpenSpec items, 202 Python harness tests (one existing skip) and six Node tests, lint/format/types, 946 unit tests, static contracts/client parity, 1,191 API tests (125 skips), and 140 disposable PostgreSQL tests (zero skips). Database record: `.task/database-tests/runs/3f240cccebe642d9b6cf573e160ede33/result.json`.
- Failed: development-server browser run, 297 passed / seven failed / 17 skipped. Failures: Quick Find → Search Library URL in `action-pivot.spec.ts`; invite redirect in `auth-flow.spec.ts`; Home entry, three viewport geometry cases and toggle loading setup in `browse-all-stack.spec.ts`. API/PWA/contract sources have no differences from the main base; this establishes a preservation fact, not the cause of these failures. No unrelated UI fixes or blind retries were made.
- Blocked: live endpoint parity at localhost:5001, connection refused. No existing service was started or reconfigured for that probe.
- Passed: final content identity in the stable run. The results above apply before this later evidence-only update; final scoped documentation verification covers that update separately.

The committed-source push gate is a separate acceptance surface: its PWA check builds production output and runs browser suites against that output, unlike the development-server run above. Its result must be reported separately; a production pass cannot erase the development failures or certify a live installation.

### Committed-source gate

`task check:push -- --base fd659bee3875fa672b2e9ca8dcbede98d657e81c` **passed** for consolidation commit `3014f66ef5582551a917e171ef81c0594964c479`, tree `f48fedecf8a496331c6213734cc48c7eecba3946`. Log: `/tmp/wfs-install-consolidated-push-check.log`. Its three parents preserve main and both original installation branch tips.

The gate passed committed whitespace/links, Node, OpenSpec, harness, static contracts, generated client parity, API checks, production PWA checks, database and isolated Docker smoke. Production browser results: 303 passed, one grocery keyboard/delete test passed on retry, 17 skipped, zero final failures. Preserve that flake and the seven development-server failures above; these are distinct runs. PostgreSQL: 140 passed, zero skipped, record `.task/database-tests/runs/dceee5fafaef43c9bbfda4742db393c9/result.json`. Smoke verified its local checks and teardown of owned containers/networks/volumes; it does not establish public HTTPS, NAS, seed or backup/recovery qualification.

This final evidence-only follow-up receives scoped documentation verification and its own committed-range documentation push gate. It makes no change to the installer/runtime inputs tested in `3014f66e`. No main merge or live deployment was performed; the status feature remains a proposal with all implementation tasks unchecked.
