# Public Synology Release Tasks

Status: Planned; no implementation started  
Requirements: [requirements.md](requirements.md)  
Design: [design.md](design.md)

## Execution rules

- Work in batch order. Tasks in the same parallel batch must keep their declared file boundaries.
- Add or update tests before implementation logic.
- Record exact commands and results. Compose rendering, image building, and physical deployment are separate claims.
- Do not publish, tag, push, or alter the live NAS from an implementation task unless a separately approved release-run task explicitly authorizes it.
- Stop on contract/schema drift, an architecture without a viable image, destructive migration uncertainty, or any secret found in tracked files/history/artifacts.

## Batch 0 — Freeze release contracts (sequential)

- [ ] **WFS-PUB-001 — Canonical release source layout** (`MEDIUM_REQUIRED`)
  - Create a release-source directory for canonical Synology `compose.yaml`, `.env.example`, bundle docs, and assembly tests.
  - Declare generated/internal Compose files as non-public or reconcile their generation from one source.
  - Add a deterministic bundle manifest and version-agreement test.
  - Verification: render LAN and Cloudflare variants; inspect archive contents; run `git diff --check`.
  - Escalate if the public Compose must remain generated from conflicting modular files without a single source of truth.

- [ ] **WFS-PUB-002 — Exact infrastructure selection** (`MEDIUM_REQUIRED`)
  - Verify `amd64` and `arm64` manifests for the selected PostgreSQL 18/pgvector, Traefik, and cloudflared releases.
  - Record exact versions/digests and licenses in release metadata.
  - Do not change the database major version.
  - Verification: manifest inspection for both architectures and a Compose pull on both physical NAS devices.
  - Escalate if any selected upstream image lacks either supported architecture.

## Batch 1 — Independent product slices (parallel)

- [ ] **WFS-PUB-010 — Runtime PWA configuration** (`MEDIUM_REQUIRED`)
  - Replace build-time feature/locale/aisle reads with validated `WFS_*` runtime settings passed from the root server layout through a client provider.
  - Update locale, aisle, and recipe feature consumers and focused tests.
  - Prove one built image changes behavior under two runtime environments.
  - Verification: focused Vitest tests, `npm run typecheck`, `npm run build`, runtime image test.
  - Escalate if a setting cannot be made hydration-safe without a new public API contract.

- [ ] **WFS-PUB-011 — Host-agnostic Traefik deployment** (`MEDIUM_REQUIRED`)
  - Implement the canonical release Compose slice with one configurable public Traefik port, path routing, relative storage, internal service ports, health/migration dependencies, and optional Cloudflare profile.
  - Validate blank-profile and enabled-profile configurations, including missing-token failure.
  - Verification: `docker compose config` for both profiles plus clean local smoke startup.
  - Escalate if Synology Container Manager does not honor the chosen profile/env behavior.

- [ ] **WFS-PUB-012 — Release workflow foundation** (`MEDIUM_REQUIRED`)
  - Replace the private/self-hosted publication path with no-push PR checks and an exact-tag, multi-platform Docker Hub workflow.
  - Prevent tag overwrite; emit image metadata, SBOM, provenance, bundle checksums, and a draft GitHub Release.
  - Keep the final environment approval separate from build success.
  - Verification: action lint/YAML validation, workflow dry-run where possible, non-publishing test tag in a disposable registry/repository if authorized.
  - Escalate before any real Docker Hub or GitHub Release mutation.

## Batch 2 — Security and readiness (parallel after Batch 1 contracts)

- [ ] **WFS-PUB-020 — LAN/Cloudflare cookie correctness** (`MEDIUM_REQUIRED`)
  - Make secure-cookie decisions from trusted effective protocol and host-only cookie policy.
  - Cover LAN HTTP, Cloudflare HTTPS, and forged forwarding-header cases.
  - Verify login, onboarding, session persistence, and SSE through Traefik.
  - Verification: focused PWA tests and targeted Playwright proxy scenarios.
  - Escalate if a trusted-proxy API or deployment contract change is required.

- [ ] **WFS-PUB-021 — Hearth public-host hardening** (`LARGE_REQUIRED`)
  - Specify/test passphrase strength, login throttling, invite lifetime/revocation, secret-safe telemetry, and anonymous health minimization.
  - Update the OpenAPI contract first if response shapes or endpoints change, then generated client and E2E coverage.
  - Verification: contract reconciliation, API security tests, PWA tests, targeted E2E.
  - Escalate on schema migration, distributed rate-limit storage, or backward-incompatible auth behavior.

- [ ] **WFS-PUB-022 — Layered health and migration readiness** (`MEDIUM_REQUIRED`)
  - Separate minimal anonymous liveness from authenticated/operational diagnostics.
  - Ensure database health and completed migration gate API readiness.
  - Add failure-path tests for database unavailable and migration failure.
  - Verification: API integration tests and Compose failure-injection smoke tests.
  - Escalate if health response contract changes affect the generated PWA client.

- [ ] **WFS-PUB-023 — Gemini installation readiness** (`MEDIUM_REQUIRED`)
  - Validate required key/model configuration without logging secrets.
  - Provide a protected connection test with actionable error categories and graceful later degradation.
  - Pin and record release-tested model defaults.
  - Verification: API tests using stubbed Gemini responses plus one authorized physical-NAS smoke test per architecture.
  - Escalate if model discovery/billing status cannot be determined reliably from supported Google responses.

## Batch 3 — Data safety and lifecycle (sequential)

- [ ] **WFS-PUB-030 — Manual backup/restore runbook and proof** (`MEDIUM_REQUIRED`)
  - Write version-matched logical backup, checksum, clean restore, and post-restore verification steps.
  - Prove them on both physical NAS architectures using representative data.
  - Clearly distinguish app export, logical dump, Hyper Backup, rollback, and disaster recovery.
  - Verification: signed/dated release-candidate evidence for dump, clean restore, data checks, and smoke test.
  - Escalate on any omitted state or tool-version mismatch.

- [ ] **WFS-PUB-031 — Update and rollback contract** (`MEDIUM_REQUIRED`)
  - Implement the backup-first `WFS_VERSION` redeploy flow and release-note schema compatibility classification.
  - Test backward-compatible rollback or restore-required rollback as declared.
  - Verification: upgrade/rollback matrix from the RC baseline on both NAS devices.
  - Escalate if the current schema delta cannot be safely classified.

## Batch 4 — Documentation reconciliation (parallel by ownership)

- [ ] **WFS-PUB-040 — Public/operator documentation** (`MEDIUM_REQUIRED`)
  - Reconcile root entry points, deployment docs, PWA README, Docker examples, release bundle guides, and Docker Hub descriptions.
  - Put the nine-step Synology happy path first and keep screenshots optional.
  - Verification: clean-room install by following only the bundle, Markdown link checks, forbidden-private-string scan.

- [ ] **WFS-PUB-041 — Authoritative specs and ADR status** (`LARGE_REQUIRED`)
  - Reconcile frontend/backend/AI specs, roadmap, and ADRs 004, 006, 011, 036, and 043 against code and this release design.
  - Mark superseded decisions without deleting historical rationale.
  - Verification: authority/status scan and cross-reference check.

- [ ] **WFS-PUB-042 — User and flow guide currency** (`MEDIUM_REQUIRED`)
  - Repair broken/moved `.kiro/specs` references and validate current navigation, Recycle Bin, and feature claims.
  - Archive or label only after an approved Death Proposal where deletion is proposed.
  - Verification: link checker and targeted UI walkthrough.

- [ ] **WFS-PUB-043 — Drift prevention checks** (`MEDIUM_REQUIRED`)
  - Add CI assertions for Markdown links, versions, image names, Compose variables, bundle manifest, and `.env` keys.
  - Generate repeated facts where feasible instead of manually copying them.
  - Verification: demonstrate each checker fails on a controlled stale fixture and passes on the repository.

## Batch 5 — Release qualification (sequential, publication still forbidden)

- [ ] **WFS-PUB-050 — Supply-chain qualification** (`MEDIUM_REQUIRED`)
  - Build exact-tag application and infrastructure manifests for both architectures.
  - Review vulnerabilities, SBOMs, provenance, OCI labels, non-root posture, and license metadata.
  - Verification: recorded artifact/digest report tied to the source revision.

- [ ] **WFS-PUB-051 — Physical Synology matrix** (`LARGE_REQUIRED`)
  - Run every R15 scenario on one `amd64` and one `arm64` DSM 7.2+ NAS.
  - Record DSM/Container Manager versions, hardware, inputs, digests, results, logs, and deviations.
  - Verification: complete signed-off matrix with no unexplained skip.

- [ ] **WFS-PUB-052 — Publish-readiness review** (`LARGE_REQUIRED`)
  - Confirm every requirement has evidence, all beta-blocking docs are reconciled, recovery is proven, and no private assumption or secret is in artifacts.
  - Create the annotated tag and approve publication only in a separately authorized release execution.
  - Verification: requirements traceability report and protected-environment approval record.

## Post-beta roadmap tasks

- [ ] Backup/restore administration UI.
- [ ] Automated and scheduled backup helpers.
- [ ] Optional sample-data import.
- [ ] Generic Compose and Unraid deployment paths.
- [ ] DSM reverse proxy/local HTTPS path.
- [ ] Cloudflare Access integration.
- [ ] Vertex AI and alternate providers.
- [ ] PostgreSQL 19 migration.
- [ ] Archive/prompt normalization through approved Death Proposals.
- [ ] Stable `0.1.0` requalification on .NET 11 GA.

## Traceability

| Requirement | Primary tasks |
|---|---|
| R1–R6 | 001, 002, 011, 040, 043 |
| R7 | 010 |
| R8 | 020, 021, 022 |
| R9 | 011, 040, 051 |
| R10 | 023, 040, 051 |
| R11 | 011, 040, 051 |
| R12 | 002, 022, 030 |
| R13 | 031, 040, 051 |
| R14 | 012, 050, 052 |
| R15 | 030, 031, 051, 052 |

