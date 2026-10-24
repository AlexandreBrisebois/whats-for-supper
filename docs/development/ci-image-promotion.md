# Parallel validation and tested-image publication

Ordinary branch pushes and PRs validate affected components. Changes to pipeline
tooling run its focused Python and Node regression checks. PWA changes select
capability suites from `scripts/ci/select-e2e.cjs`: known test-only changes select
their owning suite; known route changes include cross-feature consumers. Shared
stores, components, fixtures, contracts, runner configuration and uncertain PWA
impact select all four suites. Full validation is also available to release
fallback. The inventory rejects new unassigned regular specs. Live-service
`*-live.spec.ts` qualification remains separate, and local default discovery is
unchanged.

The selected suites share one production Next build and run on separate AMD
runners with four Playwright workers each. Fail-fast is disabled. Suite-specific
blob filenames avoid collisions; reports and failure attachments are retained,
and the report job merges them even after a suite failure. The original
`PWA — build & E2E` aggregate check name remains. Run a suite locally with:

```sh
WFS_E2E_SUITE=planning task test:e2e
```

Ordinary CI builds a single AMD smoke stack for database/schema/mapping changes,
Dockerfiles, Compose and smoke infrastructure changes. API PostgreSQL integration
tests remain in the source validation pipeline. An ordinary PWA route change does
not build container images. Branch pushes include beta branches so release tags
can reuse exact-commit source results; push and PR merge validation may both run
for an open PR, exercising different commit identities. CodeQL keeps its original main/PR scope.

Only release tags invoke `container-candidate.yml`. The existing `task tag`
command remains stable on main and beta on other branches. A release first looks
for a successful push CI run for its exact commit and matching source channel in
the same repository. PR merge runs, other commits, incomplete and failed runs do
not qualify. Without qualifying CI, source validation runs once with full checks;
its database smoke is replaced by smoke on the exact release images.

Release packaging runs natively on `ubuntu-24.04` and `ubuntu-24.04-arm` in
parallel. Each architecture builds API, PWA and migration once with BuildKit
caching, smoke-tests those exact images using `--no-build` and application-image
`pull_policy: never`, then archives them with image IDs and SHA256 checksums.
Infrastructure images may still be pulled. Candidate artifacts are retained for
seven days and are transferred only within the release run.

Publication validates archive/run/source/platform/channel identity, loads and
pushes existing image bytes under per-run architecture candidate tags, then
creates final versioned multi-platform manifests from registry digests after
both architecture jobs succeed. It performs no recompilation or repeated source
tests. Published-platform verification and installation ZIP generation follow.
Images carry revision/channel labels; version is the final registry tag and
installation metadata, rather than a baked `org.opencontainers.image.version`
label. Partial failures can leave candidate registry tags; these are not installer
entrypoints. Artifact transfer/storage and runtime savings need CI measurement.

The install-identity workflow remains, with PR triggers narrowed to identity,
manifest, icon, channel, dependency and Docker/Compose inputs. Its independent
stable/beta and demo on/off qualification remains available. The completed PDF
preview workflow is removed; its tests and qualification scripts remain.

Static checks and discovery do not prove browser execution, native dual-platform
smoke, registry promotion or reduced runtime. Qualify suite fan-out/report merging,
source reuse/fallback and publication in Actions. No release is triggered by
editing these workflows.
