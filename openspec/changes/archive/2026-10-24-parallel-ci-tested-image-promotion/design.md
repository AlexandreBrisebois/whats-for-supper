# Design

## Observed Behavior
validate.yml built/runs Playwright in one job and smoke always used --build. Publication repeated full source validation, then rebuilt all three multi-platform images. Install identity rebuilt both PWA channels on every PWA PR; PDF preview was a manual historical qualification workflow.

## Settled Decisions
User clarified that main-green validation and partial E2E runs are required, packaging is tag-only, and database changes require smoke. User explicitly requested removal of the PDF workflow. These decisions supersede the earlier proposal to archive candidates on every branch push.

## Implementation
Use four exhaustive/disjoint suites. Direct spec changes select their owners; known route changes include consumers, shared/uncertain PWA inputs select everything. Full validation selects all. Each suite owns a server restored from one production build. Unique blob reports merge after failure, with the original aggregate check name retained.

Ordinary smoke runs on AMD for database/schema/EF models, Dockerfiles, Compose and smoke infrastructure. Release source fallback skips that smoke because release-native smoke checks the same schema on the exact built artifacts. Branch pushes perform affected validation, including beta branches; PRs continue testing merge context.

Tag source lookup accepts only successful completed push CI runs for the exact commit in the same repository and matching branch channel. No prior image artifacts are required. Missing qualifying success triggers full validation once. API lookup failure fails closed. Tag-only reusable image jobs use native ubuntu-24.04 and ubuntu-24.04-arm, each building three images with per-image/architecture caches, smoke-testing with --no-build, then archiving image IDs/checksums/revision/channel/run identity. Application image pulls are forbidden; infrastructure pulls remain possible.

Publication verifies archives and loaded identities, pushes per-run architecture candidates, then assembles final manifests by digest only after both platforms pass. No version label is baked; version is registry/installer metadata. Existing actor, protected environment, tag grammar and installation asset rules remain.

## Verification Boundary
Python tests check source eligibility, archive tampering, loaded identity, no-build cleanup and workflow gates. Node tests check conservative suite selection and exhaustive inventory. Real Playwright discovery checks selection completeness; Compose config checks exact references without deployment. Actionlint checks workflow syntax. Hosted browser execution, native dual-architecture smoke, artifact transfers, report merge, source reuse/fallback, registry manifests and elapsed-time savings require CI qualification.

## Risks
Branch pushes and PRs can both validate an open PR, with distinct commit identities. Archives incur transfer/storage cost only on tagged release runs. Native ARM requires runner availability. Source metadata cannot substitute for live execution; no hosted or NAS qualification is claimed.
