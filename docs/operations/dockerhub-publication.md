# Docker Hub publication setup

Set the repository Actions variable `DOCKERHUB_PUBLISHER_GITHUB_LOGIN` to the one GitHub login allowed to publish. Create the protected `dockerhub-publish` environment, require that same owner as its reviewer, and store `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` only as environment secrets there.

Use `task release:dockerhub:tag` for the next stable annotated trigger tag or `task release:dockerhub:beta` for the next beta tag. Each task fetches remote state and asks before creating and pushing a tag; it never builds or publishes an image directly.
