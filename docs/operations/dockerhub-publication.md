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

## Qualification boundary

Publication demonstrates that the workflow built and pushed images. It does not demonstrate a physical Synology deployment, HTTPS and Cloudflare cookie behaviour, backup and restore, update or rollback. Do not promote the template in `release-template/synology/` as a public installer until those checks have passed.
