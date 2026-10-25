# Tasks

Archived unfinished on 2026-10-24 at the user's request. These are future implementation tasks from #327, all 10 unstarted; archival does not mark them complete. Consolidating the existing installer does not complete them. Follow [design](design.md) and the [spec delta](specs/installation-assistance/spec.md); #301 qualification/recovery remains separate.

## 1. Verified release to read-only setup handoff

**Outcome and scenarios:** Verify the selected release; use only shipped commands; fresh unconfigured project; machine output discipline; local human secret entry.
**Owners and boundaries:** Existing setup entry point, shared inspection functions, ZIP allowlist, bundle tests and common installation reference. No application/API changes.
**Dependencies and prerequisites:** Accepted proposal; Bash, configured Python/PyYAML for development tests, ZIP tools and Docker Compose for rendering. Synthetic extracted bundles only. Human confirms release trust before invoking bundle code.
**Acceptance boundary:** Actual packaged Bash entry point and JSON encoder; external Docker commands use a rejecting stub. Real Compose rendering is separate and starts no services.

- [ ] 1.1 Add focused tests to `scripts/agent/tests/test_install_bundle.py` for fresh setup `--status-json`, malformed/unknown arguments, absent tools, unavailable Docker, unqualified platform and JSON escaping. Add `task test:install` invoking the existing bundle suite plus `test_install_identity` and `test_dockerhub_release`; route affected installation CI to it without broad harness restructuring. Run `task test:install`, recording the intended missing-mode red result rather than a tooling failure.
- [ ] 1.2 Add opt-in setup inspection and shared encoder/checks before interactive behavior; package every required file. Implement schema/exit meanings from design, fixed diagnostics, 15-second child deadlines and no state-changing commands. Run `task test:install` green; snapshots must show unchanged project bytes/modes/directory entries, exactly one JSON object, no secret sentinels or private fingerprints, `CONFIGURATION_REQUIRED`, public verification not-run and completion false. Preserve legacy interactive fixtures.
- [ ] 1.3 Extend the common technical reference and short human/agent entry points together. Document official origin, exact tag/channel, ZIP/checksum binding including `dist/` records, checksum trust limits, manual download and legacy `STATUS_UNAVAILABLE` handoff. Acceptance: fixture-driven review covers valid/missing/malformed/ambiguous/mismatched checksum, wrong origin/channel and a release lacking advertised flags; no old helper is probed. Run packaged-link/allowlist tests through `task test:install`. Record inherited `awk -v` confidentiality limits and human capture-off configuration/startup choices.

## 2. Existing installation and deliberate update inspection

**Outcome and scenarios:** Inspect update prerequisites; existing configuration; conflicting selection; shared network invariants; backup acknowledgement; bounded dependency failure.
**Owners and boundaries:** Existing update entry point, shared checks, selected Compose/proxy comparisons and bundle test fixtures. No changes to update execution, schema policy or connector topology.
**Dependencies and prerequisites:** Slice 1 green; synthetic old/target bundles, existing project/storage sentinels and nonempty backup-report fixtures.
**Acceptance boundary:** Actual packaged updater/check functions, Docker stub command ledger and real no-start Compose rendering. No real backups, databases, networks, image pulls or deployments.

- [ ] 2.1 Add red update inspection cases for unchanged/changed base, proxy and selected overlay, invalid/missing ZIP, unsafe archive paths, absent/empty backup evidence, conflicting shell selection and ambiguous identity. Assert no `.env.update-check`, version change, environment backup, pull, up, context switch or network creation. Run `task test:install` and retain intended red evidence.
- [ ] 2.2 Implement `update.sh --status-json RELEASE_ZIP BACKUP_EVIDENCE_PATH` using private disposable archive inspection, literal allowlisted configuration and existing compatibility boundaries. Re-run `task test:install` green; known blocks exit 2, inspection failures 3, invalid invocation 64. A backup report is only acknowledged, never certified recoverable; existing `.env` and storage bytes/modes remain identical, scratch space is removed.
- [ ] 2.3 Extend the update/common reference with exact project/directory/context/file selection, manual human action and interrupted-outcome handoffs. Exercise bundled and shared rendering fixtures via `task test:install`: preserve canonical database/app mounts and volume identities, only entry proxy joins the shared external bridge, required alias stays explicit and shared app needs no connector token. Review legacy all-in-one release guidance without adding files to that release or promising DSM import qualification.

## 3. Reinspection and truthful partial completion

**Outcome and scenarios:** Configuration saved but startup skipped; interrupted update; changed inputs; configuration-only approval; changed action target; partial public verification.
**Owners and boundaries:** Shared inspection result, existing helper fixtures and common human/agent verification reference; no durable resume journal or executor.
**Dependencies and prerequisites:** Slices 1–2 green; mutation/timeout fixtures with synthetic credentials and filesystem snapshots.
**Acceptance boundary:** Actual helper reinspection through package seams, external command doubles; public verification is a documented human checklist, not an automated network probe.

- [ ] 3.1 Add red tests for inputs changed during inspection, timed-out external checks, dependent checks left not-run and repeated inspection after configuration saved/startup skipped. Use shell-metacharacter dotenv values and secret-bearing child errors to assert literal parsing/no execution and no leakage. Run `task test:install`, recording intended behavior failures.
- [ ] 3.2 Add input-consistency rechecks and safe resumption outcomes. Run `task test:install` green with unchanged project identity/storage and no mutation/replay on every branch; changed input invalidates readiness and unknown startup/migration outcomes remain unknown. Confirm inspection failure cannot become ready by ignoring an unfamiliar non-passed check.
- [ ] 3.3 Reconcile the common verification checklist and handoff examples: honor existing authorization, name changed targets/effects, decline startup for configuration-only scope and keep external route/network actions explicit. Walk through local-only, health-only and interrupted-update examples; acceptance reports separate HTTPS health, login, assets, API, authenticated SSE and recreation/persistence outcomes and leaves backup/schema/restore qualification explicitly unverified. No live checks are required to validate these examples; no claim of live qualification is permitted.

## 4. Final integration and verification

- [ ] 4.1 Reconcile every spec scenario with its automated fixture or documented human handoff, preserve red/green evidence and prior failed qualification, and run scoped `openspec validate agent-installation-contract --type change --strict`. Review the complete changed-path set and run applicable `task prepare -- <complete changed paths>` followed by `task verify -- <same reviewed set>`; record exact statuses and record_path. Runtime/API/browser/model/database acceptance is not applicable unless implementation expands to those layers; real target-host qualification remains not-run as recorded in the recovery limitations. Do not mark the selected implementation complete with required checks blocked or missing.
