# Agent installation instructions

Follow the files and documentation for the exact verified release ZIP; do not
combine files from different releases.

Use the same release templates and [Cloudflare reference](cloudflare.md) as human
installations. Do not generate another app stack or copy live secrets into chat,
logs, issues or source control. This guide does not authorize infrastructure writes;
follow the user's scope and obtain deployment/route authorization when required.

## Help with the recommended installation first

Follow [quick-start.md](quick-start.md) (or the root `README.md` inside an
extracted release ZIP). For a fresh home server installation, keep the default
bundled tunnel. If setup asks for a tunnel choice, the human presses Enter. Only
open shared-tunnel and migration instructions when the user already has that
setup or explicitly asks for it. Synology is an optional platform-specific path.

Before running a bundle script, identify the exact official release and verify
its ZIP against the matching `.sha256` checksum using trusted host tools (see the
[home server installation guide](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/release-template/synology/README.md#verify-the-download)).
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

| Intent                    | App files                                     | App `.env` selection                                   |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Dedicated bundled tunnel  | `compose.yaml` + `compose.tunnel.yaml`        | `COMPOSE_FILE=compose.yaml:compose.tunnel.yaml`        |
| Independent/shared tunnel | `compose.yaml` + `compose.shared-tunnel.yaml` | `COMPOSE_FILE=compose.yaml:compose.shared-tunnel.yaml` |

For shared mode, set `WFS_PROXY_NETWORK` and a unique `WFS_PROXY_ALIAS`. Reuse the
existing healthy independent connector where possible. For a new independent
connector, use the supplied `cloudflared/compose.yaml` in its own project folder;
its private `.env` holds its token. Do not copy that token into app projects.

The interactive `setup.sh` serves humans. Hand secret entry and state-changing
operations to a local human session outside agent capture/transcription. A human
may use the helper or copy `.env.example` to `.env` (`chmod 600 .env`) in a
private local editor. Never put real credentials in chat, command-line arguments
or generated artifacts. Do not source `.env` as shell code. Hidden prompts do
not establish complete process-list confidentiality: the current helper passes
secret values to `awk -v`. Account for that inherited limitation before local
configuration. Do not claim that setup exit zero proves startup.

For manual/non-interactive `.env` preparation by the human, the required keys in
`.env` are:
- `POSTGRES_PASSWORD` (random hex or strong password)
- `HEARTH_SECRET` (shared household passphrase or generated hex)
- `GEMINI_API_KEY` (required Google Gemini API key; no model-free mode exists)
- `ELEVATED_ACTIONS_PIN` (numeric PIN, at least 6 digits)
- `COMPOSE_FILE` (`compose.yaml:compose.tunnel.yaml` or `compose.yaml:compose.shared-tunnel.yaml`)
- Scenario-specific: `CLOUDFLARE_TUNNEL_TOKEN` (bundled mode) or `WFS_PROXY_NETWORK` + `WFS_PROXY_ALIAS` (shared mode)

Ensure `data/app` and `data/postgres` exist before starting. Because the chiseled
.NET API container runs as non-root UID `1654`, `data/` must be traversable
(`chmod 755 data`) and `data/app` must be writable by UID `1654` on Linux
(`sudo chown -R 1654:1654 data/app`), or have `Everyone` Read/Write on `data/app`
only on Synology File Station.

The installation helpers do not parse status flags; verify running containers
and configuration from matching release documentation.

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
