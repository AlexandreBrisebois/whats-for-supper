# Tagged Docker Hub and Synology Template Tasks

Status: Planned

## Phase 1 — Tagged Docker Hub publication tracer bullet

**Goal:** a semantic stable or beta tag is the only way to publish exact multi-platform Docker Hub images.

- [ ] Write focused workflow-validation tests first: accepted `dockerhub/v1.2.3` and `dockerhub/v1.2.3-beta.1`; rejected malformed and lightweight tags; `dockerhub/v` stripping; no `latest`; and all three image destinations.
- [ ] Add `.github/workflows/publish-dockerhub.yml`, an independent GitHub-hosted, tag-push-only workflow. Its credential-free validation job checks the tag and `main` ancestry. Its protected `dockerhub-publish` image-push job requires `github.actor` to equal `DOCKERHUB_PUBLISHER_GITHUB_LOGIN`, checks remote Docker Hub tag absence, and uses only environment-scoped Docker Hub credentials. Do not modify `.github/workflows/publish.yml`.
- [ ] Build and push the API, PWA, and migration images for `linux/amd64,linux/arm64`, with exact derived tags and source/version OCI labels.
- [ ] Document required GitHub setup: `DOCKERHUB_PUBLISHER_GITHUB_LOGIN`, the `dockerhub-publish` protected environment with the owner as reviewer, and its Docker Hub username/token secrets. Also document `task release:dockerhub:tag` for the next stable release and `task release:dockerhub:beta` for the next beta.
- [ ] Add `task release:dockerhub:tag` and `task release:dockerhub:beta` with focused tests. They fetch remote state, derive the next stable or beta version from SemVer tags, validate a clean `origin/main`-reachable `HEAD`, reject existing tags, print the target, ask for interactive confirmation, then create and push the annotated `dockerhub/v<version>` tag. The tasks themselves must not build or push images.

**Allowed files:** `.github/workflows/publish-dockerhub.yml`, `Taskfile.yml`, focused workflow/Taskfile validation tests or scripts, and one short maintainer note if required.
**Forbidden:** changes to `.github/workflows/publish.yml`; real tag/image/release publication during implementation; `latest`; use of the private registry or self-hosted runners by the new Docker Hub workflow; changes to application runtime code or Compose files.
**Acceptance:** focused validation passes; an unapproved actor cannot reach Docker Hub login/push; only the configured owner can reach the protected publish job; an actual Docker Hub publish remains not-run until explicitly authorized.

## Phase 2 — Synology Project template tracer bullet

**Prerequisite:** Phase 1 has established the three Docker Hub image names and tag mapping.

**Goal:** an extracted directory with `compose.yaml` and generated `.env` can be configured by editing that one file, then rendered as a Synology Project.

- [ ] Choose and create the release-template source directory; add its `compose.yaml`, `.env.example`, a synthetic test env file, and a focused Compose-contract test before template logic. The test asserts that the required operator-value block is first and defaults are below it.
- [ ] Implement the five-service LAN-only template with one `WFS_VERSION`, one public Traefik port, internal routing, relative data mounts, database health, and migration completion gating.
- [ ] Add the tiny assembly command that copies the safe tracked example to the distributable `.env`; do not track real `.env` or user secrets.
- [ ] Render the template with `docker compose config` and assert exactly one published port, exact version agreement across application images, required relative mounts, and no forbidden service/registry/dashboard/Cloudflare configuration.

**Allowed files:** the new release-template directory, one assembly helper, and focused template tests.
**Forbidden:** current contributor Compose files, Taskfile changes, Cloudflare, public-host security changes, backup/restore features, API/PWA/OpenAPI changes, and live NAS writes.
**Acceptance:** template tests and Compose rendering pass with synthetic non-secret values. A physical Synology deployment is not part of this phase.

## Completion boundary

After Phase 2, users have immutable beta-capable image tags and a minimal LAN project template. They do not yet have a supported public release, recovery guarantee, remote-access path, or physical-NAS qualification.
