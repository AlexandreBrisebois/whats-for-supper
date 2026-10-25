# Design

## Context and Existing Ownership

[Proposal](proposal.md) defines scope; [the delta](specs/installation-assistance/spec.md) defines observable requirements. The pinned baseline and prior results are in [evidence](evidence.md).

Observed owners on main and the consolidated development copy:

- `release-template/synology/setup.sh` owns interactive secret generation/configuration and optional startup. It does not parse options; an existing `.env` exits zero, as do several paths after saving configuration without startup.
- `release-template/synology/update.sh` owns deliberate image-tag updates, byte comparisons of Compose/proxy files, private environment backup and pull-failure restoration. Its backup-evidence argument is an acknowledgement, not backup/schema verification.
- `scripts/release/build-install-zip.sh` selects bundle contents; `.github/workflows/publish-dockerhub.yml` binds release/image versions and emits ZIP/checksum assets. Its checksum records include `dist/` paths.
- `docs/install/quick-start.md`, `updates.md`, `cloudflare.md` and `release-template/synology/README.md` own the human route and technical reference. The consolidated branch carries the agent guide and both overlays; none is yet shipped on main.
- `scripts/agent/tests/test_install_identity.py` and `test_dockerhub_release.py` cover existing release tooling on main. `test_install_bundle.py` and its direct CI invocation are carried into the consolidated branch from the unmerged source. Reuse these fixtures; keep legacy bundled release handoffs valid.

The application API, PWA and recovery capability own no new behavior in this increment. Historical issue #301 records the separate installation and recovery qualification scope. Its administrative closure does not establish that qualification.

## Decisions and Tradeoffs

### 1. Trust is established before a helper runs

The human downloads from `AlexandreBrisebois/whats-for-supper` GitHub Releases. Guidance resolves the stable entry point once to an exact tag, records channel and image version, then verifies the matching versioned ZIP with its matching SHA-256 asset using host tools. A prerelease needs an explicit channel selection. Do not execute a downloaded verification script to establish its own trust.

Parse exactly one SHA-256 record for the selected asset; compare that digest to the selected local file. Never let a checksum's build path select a local filesystem target. Missing, ambiguous or mismatched evidence blocks execution. This verifies integrity under the selected GitHub origin, not an independent signature. No automatic downloader, release lookup service or new signature infrastructure is introduced.

The matching release documentation must advertise the inspection interface before it is invoked. The unversioned main guide or a successful checksum alone cannot establish command support for an older ZIP. If support is absent, report `STATUS_UNAVAILABLE` in the agent's handoff and use the legacy human instructions; do not probe helpers with proposed flags, including `--help`.

### 2. Add one opt-in mode to existing entry points

Proposed interface, **not supported by current helpers**:

- Setup: `bash setup.sh --status-json`
- Update: `bash update.sh --status-json RELEASE_ZIP BACKUP_EVIDENCE_PATH`

Dispatch this exact mode before terminal checks or any mutation. Preserve existing interactive invocations and exit semantics. Unknown inspection arguments fail without entering interactive setup. A small shared Bash inspection file may serve both entry points and must then be in the ZIP allowlist; do not introduce a second executable installer or require Python/jq on household hosts. Centralize the result encoder and shared checks rather than duplicating policies.

Inspection reads fixed allowlisted dotenv keys as literal data; never source/eval configuration. Inspect Bash/required host tools, host OS/architecture, Compose plugin, current Docker context/access, required files, version and configuration presence. Pin every Docker read to the reviewed host/context; never switch contexts. Use only Docker read operations and private `compose config --quiet`, discarding raw output. Never emit resolved Compose JSON or child errors. Missing host tools or unsupported environments produce human actions, never installations or sudo.

For update, inspect the already verified ZIP and existing byte-comparison/version boundaries using private temporary space. Validate member paths before extraction; reject traversal, absolute paths, duplicate required entries and links escaping that space. Do not run code from the target ZIP. A nonempty backup report means only `acknowledged`; no schema or restore readiness is inferred. Configuration differences or uncertain project identity block progression under the existing manual review path.

### 3. Keep the wire contract small and explicit

One UTF-8 JSON object on stdout; no prompts or progress. Proposed schema version `1` has these required fields:

| Field | Meaning |
|---|---|
| `schemaVersion` | Integer `1`; consumers reject unsupported major versions |
| `operation` | `setup` or `update` |
| `target` | Non-secret directory, project, Docker context, selected Compose files, layout, installed/target image versions; unavailable values are null |
| `checks` | Ordered objects with stable `id`, `status`, `code`, `nextAction` |
| `readiness` | `ready`, `blocked` or `unknown`; applies only to local inspection |
| `configuration` | `absent`, `present` or `unknown`; presence does not prove valid secret values |
| `backupEvidence` | `not-applicable`, `missing` or `acknowledged`; never `recoverable` |
| `publicVerification` | `not-run`; this mode does not contact the public application |
| `installationComplete` | Always false; inspection cannot establish completion |

Check statuses are `passed`, `blocked`, `failed`, `unknown`, `not-run`. Codes and next actions come from a fixed allowlist; arbitrary diagnostic text is excluded. Initial codes cover `READY`, `CONFIGURATION_REQUIRED`, `EXISTING_STATE_REVIEW`, `TOOL_MISSING`, `DOCKER_UNAVAILABLE`, `ENVIRONMENT_UNQUALIFIED`, `IDENTITY_CONFLICT`, `CONFIGURATION_CHANGED`, `BACKUP_EVIDENCE_MISSING`, `CHECK_TIMEOUT`, `INPUTS_CHANGED`, `INSPECTION_FAILED` and `INVALID_ARGUMENT`. Encode/escape path and project strings as JSON data. No secret values, secret hashes, cookie values or private backup contents appear in any stream. Release origin/checksum approval is an external precondition, not a claim manufactured by local status.

Exit codes: `0` local checks ready, `2` known block/human review required, `3` inspection failure or inconsistent observations, `64` invalid invocation. An unavailable Bash/runtime cannot emit JSON and must be described by the calling agent as a prerequisite failure. Consumers use codes, not English text. Additive check IDs are allowed within version 1; consumers must tolerate unfamiliar IDs while preserving their non-passed status.

Each external check has a 15-second deadline; a timeout stops dependent checks and leaves them not-run. Do not impose new host dependencies solely for timeout management. Readiness on a configured project means prerequisites observed, never permission to run an update.

### 4. Use one reference and short entry points

Extend `release-template/synology/README.md` as the technical owner for trust, interface/schema, preservation, handoffs and the common verification checklist. Keep `quick-start.md` short and `agent-install.md` focused on the agent sequence, both linking to that owner. The ZIP currently substitutes quick start for its root README, so packaged links must use absolute GitHub URLs pinned to the matching release tag unless the packaging allowlist actually includes their target. Add the agent guide to packaging with link tests; do not copy a second full reference into it. Keep shared-preview text explicitly unreleased unless a matching future release ships it.

## First Observable Slice

A human verifies a matching future ZIP; the agent confirms advertised support and runs setup inspection in its extracted, unconfigured directory. Existing helper dispatch → shared read-only checks → bounded JSON result returns `CONFIGURATION_REQUIRED` without `.env`, generated secrets, data directories or mutating Docker commands. The agent hands local configuration to the human and reports public checks not-run.

Acceptance runs the actual packaged Bash helper and encoder. Docker/host tools are doubled only at the external command boundary, with a command ledger that rejects `pull`, `up`, network creation and context changes. Snapshot files, modes and directory contents before/after. Real Compose rendering with synthetic values tests the internal template seam separately; it does not establish daemon, NAS or HTTPS behavior. Update/resumption extends this same slice after it works.

## State, Concurrency and Recovery

No new journal, resume token or daemon is stored. Reinspect the current directory, selected files, project/context and mount identities on every session. For known layouts, preserve canonical resolutions of `data/app`, `data/postgres` and named volumes; unknown/custom layouts require operator review. Never read household file/database contents to establish identity.

Capture relevant file identity/content privately at start and recheck before returning ready, including configuration, selected Compose/proxy files and update archive. Do not output secret-derived fingerprints. Changed inputs invalidate readiness with `INPUTS_CHANGED`; this is best-effort observation, not a lock against changes after return. Docker observations can become stale and must not authorize replay.

Existing `.env` or storage means existing-state review, not fresh configuration. A human may have saved configuration while skipping startup, or interrupted an update after migration began. Keep outcomes unknown until independently observed; do not retry deployment or roll back tags. Refer recovery to the existing update/recovery guidance and #301.

## Compatibility, Rollout and Reversal

Ship the mode only in a future matching release with documented interface and complete packaged dependencies. Main remains bundled. The consolidated branch includes scenario overlays, but shared checks are conditional on complete shipped overlays and helpers in the selected release, never synthesized from preview files. The proposal adds no further overlays, connector projects or DSM import support. DSM honoring `COMPOSE_FILE` remains unqualified; macOS disposable results do not establish target support.

Handoffs state exact release, host, directory, project, mode, intended writes, startup choice and verification/recovery boundary. Honor existing authorization; re-review only changed targets/effects. Human configuration must run outside agent capture. A configuration-only authorization requires declining the existing helper's startup offer. External DNS/routes and network actions have separate concrete handoffs.

The inherited setup passes secret values in `awk -v` subprocess arguments. Hidden prompts therefore do not guarantee process-list confidentiality. Inspection never uses that path or receives secrets. Document this limitation; remediation of the interactive writer is deferred, not silently bundled into this status increment. A deployment requiring stronger confidentiality must remain at human review.

Removal of the new mode/docs in a later release needs no data migration. It cannot reverse a human-operated deployment or database migration. No dependency, image, runtime or EF/Npgsql pin changes are part of this work.

## Operational Diagnosis

The common verification reference records individual outcomes for HTTPS health, fresh/existing login, assets, API routing, authenticated SSE and persistence after planned recreation. Use passed/failed/blocked/not-run, with host/version identity. A setup zero, healthy connector, Compose render or local inspection cannot fill those outcomes. Record backup/schema/restore evidence separately from installation-assistance results; #301 remains a historical reference.

Remaining product decision: whether to accept and later implement this proposed increment. Flag spelling, schema and deadlines above are concrete proposal choices for review, not unresolved implementation dependencies. There are no consequential questions left open within this chosen approach.
