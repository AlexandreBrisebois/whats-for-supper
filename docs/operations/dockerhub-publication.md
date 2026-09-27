# Docker Hub publication setup

Set the repository Actions variable `DOCKERHUB_PUBLISHER_GITHUB_LOGIN` to the one GitHub login allowed to publish. Create the protected `dockerhub-publish` environment, require that same owner as its reviewer, and store `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` only as environment secrets there.

Run `task tag` from `main` to create the next stable annotated trigger tag. Run the same command from any named non-`main` branch to create the next beta tag; beta numbers are automatically incremented. To start a beta for a specific package-version bump, use `task tag -- --package-bump patch|minor|major`. Each invocation fetches remote state and asks before creating and pushing a tag; it never builds or publishes an image directly.

The tag push triggers GitHub-hosted multi-platform Docker Hub builds. Stable tags must point to a commit reachable from `main`; beta tags can point to their source branch. Published tags are immutable—there is no `latest` tag.
