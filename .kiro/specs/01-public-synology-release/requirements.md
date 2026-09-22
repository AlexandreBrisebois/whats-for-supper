# Tagged Docker Hub and Synology Template Requirements

Status: Draft for owner approval
Target: first public beta
Last reconciled: 2026-09-22

## Goal

Make two things reliably available to a self-hosting user:

1. exact, public Docker Hub images produced only from an approved semantic Git tag; and
2. a small Synology Container Manager Project template that pulls one chosen image version and requires the user to edit only `.env` before deploying.

This is deliberately not a public-release certification. It does not claim backup/restore proof, Cloudflare operation, LAN-cookie correctness, runtime PWA configuration, security hardening, a GitHub Release bundle, or two-NAS qualification.

## Release identity

The Git tag is the only publication trigger and the source of the release identity.

| Kind | Accepted annotated Git tag | Docker image tag |
|---|---|---|
| Stable | `dockerhub/vMAJOR.MINOR.PATCH` | `MAJOR.MINOR.PATCH` |
| Beta | `dockerhub/vMAJOR.MINOR.PATCH-beta.N` | `MAJOR.MINOR.PATCH-beta.N` |

`MAJOR`, `MINOR`, `PATCH`, and `N` are non-negative decimal integers, with `N >= 1`. The version segment after `dockerhub/v` follows this grammar exactly. Tags must be annotated and point to a commit reachable from `main`. `dockerhub/v1.2.3-rc.1`, `dockerhub/v1.2`, lightweight tags, branches, workflow dispatch, and mutable aliases such as `latest` are outside this scope.

The workflow strips only the `dockerhub/v` prefix when deriving Docker tags. The same derived version is used by all three application images:

- `brisebois/whats-for-supper-api:<version>`
- `brisebois/whats-for-supper-pwa:<version>`
- `brisebois/whats-for-supper-db-migration:<version>`

The workflow must fail before pushing if any derived remote image tag already exists. A beta is never promoted or retagged automatically.

## R1 — Tag-controlled Docker Hub publication

On an accepted annotated tag, GitHub Actions shall:

1. validate the tag grammar, annotation, and `main` ancestry;
2. authenticate to Docker Hub through GitHub secrets;
3. build the API, PWA, and database-migration images for `linux/amd64` and `linux/arm64`;
4. push only the three exact derived image tags; and
5. publish OCI labels containing the source revision and version.

No branch, pull request, manual dispatch, private registry, self-hosted runner, or mutable image tag may publish the Docker Hub images from this new route. The existing private-registry workflow remains outside this route's scope. A failed validation or build must push nothing.

## R1a — Release tagging task

The repository shall provide `task release:dockerhub:tag` to calculate, create, and push the next stable annotated Docker Hub trigger tag, and `task release:dockerhub:beta` for the next beta tag.

After fetching `origin/main` and tags, the task derives the next version from the highest existing `dockerhub/v*` tag using SemVer precedence:

- no existing Docker Hub tag: stable `0.1.0`; beta `0.1.0-beta.1`;
- latest tag is stable `X.Y.Z`: stable `X.Y.(Z+1)`; beta `X.Y.(Z+1)-beta.1`;
- latest tag is `X.Y.Z-beta.N`: stable `X.Y.Z`; beta `X.Y.Z-beta.(N+1)`.

Before creating a tag, the task must reject a dirty worktree, verify `HEAD` is reachable from `origin/main`, validate the derived version grammar, and reject an existing local or remote derived tag. It must print the exact tag and commit it will use, then ask for an interactive confirmation before it creates and pushes the annotated tag. The push to `origin` is the only trigger for the Docker Hub workflow.

The task must not build images, publish directly to Docker Hub, alter the existing private publication route, or delete/overwrite a tag.

## R2 — Synology Project template

The repository shall contain one release-template source directory, chosen in Phase 2, with a canonical `compose.yaml` and `.env.example`. Release assembly renders a non-secret `.env` from that example into the distributable template so the extracted directory contains both `compose.yaml` and `.env`.

The operator edits only `.env`, then creates a Synology Container Manager Project from the directory. The template shall:

- use one `WFS_VERSION` value for all three public application images;
- support `linux/amd64` and `linux/arm64` by consuming the multi-platform manifests from R1;
- include API, PWA, migration, PostgreSQL/pgvector, and Traefik;
- publish only `${WFS_HTTP_PORT:-9100}:80` from Traefik;
- keep API, PWA, PostgreSQL, migration, and Traefik administration ports internal;
- use relative persistent paths `./data/postgres` and `./data/app`; and
- use path routing: `/api` to API and every other path to PWA.

The template does not include Cloudflare, a dashboard, a Docker socket mount, a private registry, an external database, or a profile system.

## R3 — Minimal operator configuration

The generated `.env` contains no usable credentials. It is ordered for setup: every operator-supplied value appears first in a clearly labeled `REQUIRED — set before deployment` block; release-owned and optional defaults follow in a separate `DEFAULTS — change only when needed` block.

The required block contains only:

| Setting | Role |
|---|---|
| `POSTGRES_PASSWORD` | Required unique database password. |
| `HEARTH_SECRET` | Required household passphrase secret. |
| `GEMINI_API_KEY` | Required Gemini Developer API key. |

The defaults block contains only:

| Setting | Role |
|---|---|
| `WFS_VERSION` | Exact tag already selected for the template. |
| `WFS_HTTP_PORT` | Optional LAN entry port; defaults to `9100`. |
| `GEMINI_MODEL_ID` | Documented release-tested model identifier. |
| `GEMINI_MODEL_ID_HERO` | Documented release-tested image-model identifier. |
| `EMBEDDING_MODEL_ID` | Documented release-tested embedding-model identifier. |

Compose derives internal hostnames, internal ports, API/PWA routing, and the database connection string. It must fail clearly when a required value is blank or still a documented placeholder.

## R4 — Minimal verification

Phase 1 is complete only when a non-publishing workflow test proves accepted stable and beta tags, rejected malformed/lightweight tags, tag-to-image mapping, and no mutable alias; and focused Taskfile tests prove the tag helper's validation and non-mutating failure paths.

Phase 2 is complete only when the template is rendered with a synthetic non-secret `.env`, validates with `docker compose config`, exposes exactly one host port, and references the three exact images at one version. This is static/template evidence only; it does not prove a physical Synology deployment.

## Explicit non-goals

- GitHub Release creation, checksums, SBOMs, provenance, image scanning, and Docker Hub descriptions.
- Backup, restore, upgrade, rollback, or data-migration qualification.
- Cloudflare, HTTPS, cookie policy, rate limiting, invite security, or public-host hardening.
- Runtime PWA feature/locale configuration.
- Any change to current contributor Compose files, runtime application code, OpenAPI, or the live NAS.
