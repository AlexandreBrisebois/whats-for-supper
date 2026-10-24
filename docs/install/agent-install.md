# Agent-assisted installation review

Use the [quick start](quick-start.md) and matching published installation ZIP for
main's supported bundled layout. The current `setup.sh` asks for a tunnel token;
`compose.yaml` already contains its connector. No scenario overlay is needed.
This guide is available on GitHub; main's ZIP does not include this file.

## Confirm the authorized scope

Identify a fresh installation versus an existing deployment, the Docker host,
project name and directory, image version, HTTPS hostname, and storage paths.
Inspect only redacted configuration. Never request tokens, passwords, session
cookies or private backup contents in chat, logs or generated artifacts.

For an existing installation, preserve project identity and relative bind mounts:
`./data/app` and `./data/postgres` must keep resolving to the same directories.
Retain private configuration and a tested, consistent PostgreSQL plus complete
`data/app` recovery set. Do not rerun setup or change versions as a side effect
of reviewing ingress.

## Prepare the result before deployment

Provide proposed files and commands, non-secret settings, hostname-to-origin
mapping, verification criteria and rollback steps. Validate rendered Compose
privately with `docker compose config --quiet`; resolved configuration may expose
secrets. Static validation does not establish host, authentication or SSE behavior.

For the bundled connector, use `http://127.0.0.1:80` in Cloudflare because it shares
Traefik's network namespace. Follow the [Cloudflare guide](cloudflare.md) and
[update guide](updates.md). Keep every Compose invocation on the existing project,
directory and reviewed file selection.

Deploy, change routes/DNS or retire connectors only within explicit authorization.
Do not remove projects, prune storage, remove volumes or use broad orphan cleanup
as an installation shortcut. Record public health, fresh/existing login, assets,
API routing and authenticated live updates, including after planned recreation.
Report checks that were not run and retain rollback material.

## Unreleased shared-template mechanics

The [source branch](https://github.com/AlexandreBrisebois/whats-for-supper/tree/installation/shared-cloudflare-tunnel) and its [pinned agent guide](https://github.com/AlexandreBrisebois/whats-for-supper/blob/cf1138e2a9571154fc5782d58697713e122abcdb/docs/install/agent-install.md)
describe the unreleased bundled/shared overlay design. Main and its installation
ZIP do not supply those overlays, the independent connector project, setup mode
selection or overlay-aware updater checks. Do not treat the preview as shipped
behavior or apply individual preview files to a main installation.

Review the required implementation and migration separately before adoption.
The preview uses unique aliases per deployment and attaches only entry proxies
to the shared external network. Preserve project/storage identities and stage
cutovers with rollback; a healthy connector alone proves neither correct routing
nor access to the intended household data.
