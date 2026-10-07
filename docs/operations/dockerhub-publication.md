# Docker Hub publication

This is a maintainer runbook for publishing container images. It does not make a Synology deployment supported; see the [Synology operator guide](../../release-template/synology/README.md). Physical deployment, recovery, and public-release qualification remain separate work.

## Prerequisites

Set the repository Actions variable `DOCKERHUB_PUBLISHER_GITHUB_LOGIN` to the one GitHub login allowed to publish. Create the protected `dockerhub-publish` environment, require that same owner as its reviewer, and store `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` only as environment secrets there.

## Create a release tag

Run `task tag` from `main` to create the next stable annotated trigger tag. Run the same command from any named non-`main` branch to create the next beta tag; beta numbers are automatically incremented. To start a beta for a specific package-version bump, use:

```bash
task tag -- --package-bump patch|minor|major
```

The command fetches remote state, prints the target tag and commit, and asks for confirmation before creating and pushing the tag. It never builds or publishes an image directly.

## What the tag publishes

Pushing the tag starts the GitHub-hosted multi-platform Docker Hub workflow. Stable tags must point to a commit reachable from `main`; beta tags can point to their source branch. The workflow publishes immutable `linux/amd64` and `linux/arm64` images at one derived version:

- `brisebois/whats-for-supper-api:<version>`
- `brisebois/whats-for-supper-pwa:<version>`
- `brisebois/whats-for-supper-db-migration:<version>`

There is no `latest` tag. The Synology template consumes one explicit `WFS_VERSION` across all three images.

## PWA install identity

The workflow derives the PWA channel from the validated release version: `X.Y.Z`
is `stable`, and `X.Y.Z-beta.N` is `beta`. The same build argument reaches both
`linux/amd64` and `linux/arm64` PWA outputs; API and migration builds do not receive
it. Unsupported version suffixes and explicit channels are rejected.

The PWA build embeds this channel into the server bundle and retains
`/app/release-channel.json` in the final image for inspection. Runtime
`WFS_RELEASE_CHANNEL` cannot change the baked identity. Local Docker builds default
to stable; use `--build-arg WFS_RELEASE_CHANNEL=beta` to qualify a beta image locally.
These builds do not publish an image.

All versions use **What's for Supper?** as the app name. Icon markings and the
in-app hint distinguish demo and beta installations.

Local image verification builds only `linux/arm64`. Build `linux/amd64` only in
GitHub Actions; do not emulate its Next.js compilation on the ARM development Mac.

Run local verification with:

```bash
python3 -B scripts/agent/install_identity.py --images
```

The **Install identity validation (no publication)** workflow verifies stable and
beta images on a native amd64 GitHub runner, using the same verifier. It runs for
relevant pull requests or manual dispatch, requires no secrets, and uploads
image IDs, source revision and Compose results. It builds locally on the runner
with `--load`; it does not push images or deploy. The verifier rejects local
amd64 builds and architecture emulation. Review both workflow jobs' successful
results before claiming amd64 acceptance.

Before release, combine local arm64 and GitHub Actions amd64 evidence for stable
and beta images, inspect the final channel JSON, and serve each exact image ID
with `DEMO_MODE=false` and
`DEMO_MODE=true`. Check public `/manifest.json` and initial `/welcome` HTML for
matching names and Apple icons. Set an opposite runtime `WFS_RELEASE_CHANNEL` as
a negative check: it must not override the image. Compose configuration checks
alone do not prove final image contents or runtime rendering.

Separate deployment origins isolate installed identities. Existing home-screen
names/icons can remain stale until the OS refreshes them or the user reinstalls;
fresh server metadata cannot force that refresh. Real-device qualification is a
separate acceptance step.

## Qualification boundary

Publication demonstrates that the workflow built and pushed images. It does not demonstrate a physical Synology deployment, HTTPS and Cloudflare cookie behaviour, backup and restore, update or rollback. Do not promote the template in `release-template/synology/` as a public installer until those checks have passed.
