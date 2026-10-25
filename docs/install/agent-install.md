# Agent installation instructions

> Unreleased development templates: this branch contains the scenario overlays.
> Existing published ZIPs may use the legacy bundled layout. Follow the files and
> documentation for the exact verified release; do not combine individual files
> from this branch with a published installation.

Use the same release templates and [Cloudflare reference](cloudflare.md) as human
installations. Do not generate another app stack or copy live secrets into chat,
logs, issues or source control. This guide does not authorize infrastructure writes;
follow the user's scope and obtain deployment/route authorization when required.

## Help with the recommended installation first

Follow the [quick start](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/docs/install/quick-start.md) in source, or the root `README.md` in a
release ZIP. For a fresh home server installation, keep the default bundled
tunnel. If setup asks for a tunnel choice, the human presses Enter. Only open
shared-tunnel and migration instructions when the user already has that setup
or explicitly asks for it. Synology is an optional platform-specific path.

Before running a bundle script, identify the exact official release and verify
its ZIP against the matching checksum using trusted host tools. Follow the
[download verification reference](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/release-template/synology/README.md).
Missing or mismatched integrity evidence stops the installation handoff.

Give one next action at a time, say where to perform it, and explain what success
looks like. Hand local secret entry to the human, then resume with non-secret
confirmation. Distinguish configuration saved, services started and the public
HTTPS checks completed. A successful prior deployment is useful evidence for its
specific version and host; it does not require restarting the installation.

## Discover before proposing changes

Record the target Docker host, Compose/DSM capabilities, exact existing project
names and folders, selected Compose files, image versions, mount sources and
network attachments. Inspect only non-secret configuration. Do not print `.env`,
container environments or resolved Compose configuration that contains secrets.
Ask for redacted files and missing hostname/routing details; never request tokens,
passwords, application secrets, session cookies or private backup contents.

Distinguish a fresh installation, a legacy all-in-one installation, and an app
already using overlays. For existing deployments preserve project identity,
relative-path resolution, volumes, app files, private configuration and versions.
Do not rerun setup, upgrade images or migrate databases as a side effect of an
ingress change. Confirm the recovery set covers PostgreSQL and all app files.

## Select the shipped scenario

| Intent | App files | App `.env` selection |
| --- | --- | --- |
| Dedicated bundled tunnel | `compose.yaml` + `compose.tunnel.yaml` | `COMPOSE_FILE=compose.yaml:compose.tunnel.yaml` |
| Independent/shared tunnel | `compose.yaml` + `compose.shared-tunnel.yaml` | `COMPOSE_FILE=compose.yaml:compose.shared-tunnel.yaml` |

For shared mode, set `WFS_PROXY_NETWORK` and a unique `WFS_PROXY_ALIAS`. Reuse the
existing healthy independent connector where possible. For a new independent
connector, use the supplied `cloudflared/compose.yaml` in its own project folder;
its private `.env` holds its token. Do not copy that token into app projects.

The interactive `setup.sh` serves humans. Hand secret entry and state-changing
operations to a local human session outside agent capture/transcription. A human
may use the helper or a private local editor. Never put real credentials in chat,
command-line arguments or generated artifacts. Do not source `.env` as shell code.
Hidden prompts do not establish complete process-list confidentiality: the current
helper passes secret values to `awk -v`. Account for that inherited limitation
before local configuration. Do not claim that setup exit zero proves startup.

Read-only machine status is proposed in issue #327 and is not implemented here.
These helpers do not parse status flags. Establish command support from trusted
matching release documentation; never probe an older helper with new flags.

## Prepare a reviewable result

Provide the selected files, exact non-secret settings to edit, per-instance
hostname → proxy alias → origin port mapping, proposed commands, verification
criteria and rollback steps. Use the [template transition](updates.md#transition-to-the-scenario-templates)
and [staged migration](cloudflare.md#migrate-existing-deployments-in-stages) for
existing installations. Validate Compose with `config --quiet` and review mount
identities privately. No supporting app service should join the external network.

Keep all Compose invocations on the same project, directory and file selection.
`.env` saves `COMPOSE_FILE` for plain CLI invocations; explicit `-f` arguments
must include the base and selected overlay. Check that DSM imports both files;
never assume it honors `.env` selection. A merged DSM file is a customization
requiring deliberate maintenance. Do not set a new project name or relative root.

## Apply only within authorization, then verify

Do not deploy to the host, change Cloudflare routes/DNS, or remove old connectors
until authorized for those operations. Move one deployment at a time, keeping
rollback available; new and old connectors on the same tunnel need compatible
origins. Never delete projects, remove volumes, prune storage or broadly remove
orphans as an installation shortcut.

Run the [shared public verification checklist](cloudflare.md#verify-either-setup):
connector/origin health, API routing, fresh and existing login, assets, existing
data, authenticated SSE delivery and persistence after recreation. Record observed
results per hostname without credentials. Distinguish static validation from live
host checks; report unexecuted checks instead of claiming success.

Retire old connectors only after verified cutover and authorization. Retain private
rollback files/credentials for the agreed window. Report final project identity,
selected scenario, routes, verification results and any remaining manual steps.
