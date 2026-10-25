# Home Server Installation Guide

**New installation? Start with the [three-step quick start](../../docs/install/quick-start.md).**
It uses the versioned installation ZIP and guided setup. You do not need to
choose Compose files, network names or proxy aliases for the recommended path.

This reference is for someone helping with manual setup, an existing installation
or an advanced configuration. The main audience is **home server owners**.
[Synology Container Manager](#synology-container-manager) is one optional deployment
method; other Linux Docker Compose hosts use the same application bundle.

Use the instructions and files from the same release. This development branch
includes unreleased scenario overlays; existing ZIPs may still bundle the connector
in the base file. The source `.env.example` version is a packaging placeholder.
The `release-template/synology/` directory name remains for compatibility with
existing paths and links.

## Verify the download

Before running any script from a ZIP, identify the exact release tag and channel
on the [official GitHub Releases page](https://github.com/AlexandreBrisebois/whats-for-supper/releases).
Use that release's versioned ZIP and its matching `.sha256` asset. Keep that
version fixed while preparing the installation; an updated latest-release link
must not silently substitute a different ZIP or checksum. Beta releases require
an intentional testing choice.

Compute the ZIP's SHA-256 with a trusted host tool and compare it to the digest
in that release's checksum asset. The asset can include a `dist/` build path;
compare against the file you deliberately downloaded, rather than using that
path to choose another local file. Stop if the checksum is missing, ambiguous
or mismatched. A matching digest establishes integrity under the selected GitHub
origin, not independent publisher authentication. No bundle script should run
until this check passes.

## Before you begin

For guided setup, use the quick start above and keep the default tunnel choice.

You need a home server with a working Docker Engine and Docker Compose deployment
method, persistent storage, and permission to create project files and directories.
You also need the values documented in `.env.example`, including a Gemini API key,
the application's required secrets, and a Cloudflare Tunnel token if using the
bundled connector. An existing independent tunnel keeps its token in its own
project. Choose a setup below before starting the app.

The template is currently maintained in `release-template/synology/` for
compatibility with existing installations and links. That directory name does not
make Synology hardware mandatory. Support, filesystem permissions, architecture,
and available capacity must be verified for your chosen host.

## Install with Docker Compose

The guided setup creates the private configuration and data directories for you.
The instructions below describe manual configuration for experienced operators.

Create a project directory on the home server and copy these template files into it:

- `compose.yaml`
- `compose.tunnel.yaml` and `compose.shared-tunnel.yaml`
- `traefik.yml`
- `.env.example`

Run `bash setup.sh` from the matching release bundle, or rename `.env.example`
to `.env` and configure manually. Set the four required application secrets.
Choose one scenario through `COMPOSE_FILE` in that private file:

| Scenario | `COMPOSE_FILE` | Additional settings |
| --- | --- | --- |
| Bundled tunnel | `compose.yaml:compose.tunnel.yaml` | App-local `CLOUDFLARE_TUNNEL_TOKEN` |
| Existing independent/shared tunnel | `compose.yaml:compose.shared-tunnel.yaml` | `WFS_PROXY_NETWORK` and unique `WFS_PROXY_ALIAS`; no app-local token |

The helper saves this choice so later plain `docker compose` commands include the
correct overlay. The base `compose.yaml` contains no connector. Leave the Compose
files and `traefik.yml` unchanged for a standard fresh installation. Keep secrets
out of version control. See the [Cloudflare guide](../../docs/install/cloudflare.md)
for the supplied independent `cloudflared/` project and existing-app migration.
Agents use the [agent installation guide](../../docs/install/agent-install.md).

Before starting the stack, create the required bind-mount directories:

```text
whats-for-supper/
├── .env
├── compose.yaml
├── compose.tunnel.yaml
├── compose.shared-tunnel.yaml
├── traefik.yml
└── data/
    ├── app/
    └── postgres/
```

Keep `data` beside `compose.yaml`: `./data/app` and `./data/postgres`
are relative bind mounts. Ensure the container's application user can write to
`data/app`, and ensure PostgreSQL can access `data/postgres` with appropriate
ownership. The two directories may require different permissions. Do **not**
apply broad, world-writable permissions to the entire project or database.

From the project directory, validate the resolved configuration and start it
using Docker Compose:

```sh
docker compose config --quiet
docker compose up -d
docker compose ps
```

Check container logs for startup errors. If permissions or environment variables
prevent startup, correct the host configuration and recreate affected services.
The application requires an HTTPS Cloudflare hostname for browser authentication;
follow the next section rather than using the HTTP origin as a household URL.

### Synology Container Manager

If using Synology, create the same project directory and files in File Station.
For the documented Synology setup, grant `Everyone` **Read/Write** on
`data/app` **only**, as required by the current API image user. Do not grant
that permission to the parent shared folder or `data/postgres`. This is a
Synology-specific workaround, not general Docker guidance.

In Container Manager, create a **Project** from that folder and deploy it.
Ensure Container Manager includes both the base and selected overlay; if your DSM
import does not honor `COMPOSE_FILE`, use explicit Compose files through SSH or a
reviewed merged configuration. Never deploy the base alone. Use the same selection
when recreating services. Verify actual permissions and capacity for your NAS model.

### Other Docker Compose hosts

Use the Docker Compose commands above with host-appropriate filesystem ownership
and security controls. Do not copy Synology File Station permissions to Linux
or other platforms. This guide documents a general Compose workflow, not a
claim that every CPU architecture, OS, or host has been qualified.

## Optional localhost-only diagnostics port

The default Compose stack publishes no HTTP host port. If you need a local
HTTP origin for diagnostics, add `compose.local-port.yaml` from this template
and run `docker compose -f compose.yaml -f compose.tunnel.yaml -f compose.local-port.yaml up -d`.
Substitute `compose.shared-tunnel.yaml` for `compose.tunnel.yaml` in shared mode.
This binds `127.0.0.1:9100` on the server only; it is not a browser login
URL because secure authentication cookies require HTTPS. The Cloudflare Tunnel
connects to Traefik through the bundled namespace or the external bridge network,
depending on the selected setup.

## Optional PostgreSQL debugging access

By default, PostgreSQL has **no published host port** and is reachable only by
services attached to the Compose internal network. Backups, restore operations,
and update tooling should use `docker compose exec` or a temporary container
on that network; opening a database port is not required.

Advanced users can opt in to **server-local** database access by adding the
`compose.postgres-debug.yaml` override to their Compose invocation:

```sh
docker compose -f compose.yaml -f compose.tunnel.yaml -f compose.postgres-debug.yaml up -d
```

Substitute `compose.shared-tunnel.yaml` for `compose.tunnel.yaml` in shared mode.
The override binds `127.0.0.1:5432` on the **home server only**; change
`WFS_POSTGRES_DEBUG_PORT` if needed. It does not expose the database to the
LAN or internet. Remote troubleshooting should use an authenticated SSH
tunnel rather than a public database port. Remove the override and recreate
the stack when debugging is finished. Protect `.env` and database credentials.

## Configure Cloudflare Tunnel

Users must access this application through an HTTPS Cloudflare hostname;
authentication requires HTTPS. Choose either setup in the
[Cloudflare HTTPS guide](../../docs/install/cloudflare.md):

| Setup | What to configure | Cloudflare service URL |
| --- | --- | --- |
| One tunnel per deployment (supplied default) | Token in the app's private `.env`; keep the bundled connector | `http://127.0.0.1:80` |
| One independent tunnel shared by deployments | Token in the connector project only; attach each Traefik to an external network with a unique alias | `http://wfs-prod-proxy:80` (one alias per deployment) |

The guide includes standalone connector Compose, attaching to an existing tunnel,
production/beta/demo aliases, hostname routes, staged migration, verification and
rollback. Keep all supporting services on their app networks. Existing project
names, storage paths, private configuration and volume identities must be preserved.
No host port or router port forwarding is required for either setup.

The installation bundle includes an interactive, version-only update helper;
follow the [update guide](../../docs/install/updates.md), including the 0.1.21
configuration-change instructions. It does not create backups or guarantee
rollback. Keep a tested, consistent backup of PostgreSQL and the complete
`data/app` tree; [exact recovery](../../docs/operations/exact-recovery.md) requires
separate storage and configuration.

## Install identity and demo configuration

Set the existing `DEMO_MODE=true` in `.env` to enable demo behavior and the small
DEMO icon marking. The template passes the same value to API and PWA. Missing or
false disables demo; invalid values disable it with a configuration warning.
After changing the value, recreate **both** containers without rebuilding images.
This setting retains the existing backend demo behavior, including restore/AI
policy; it is not a cosmetic-only switch.

The published PWA image carries its release channel. A `WFS_VERSION` such as
`1.2.3-beta.1` selects a beta image automatically; do not set a runtime beta flag.
All versions use **What's for Supper?** as the installed name. Icon markings and
the in-app hint distinguish demo and beta installations; beta-demo preserves
both BETA and DEMO icon marks. No feature preview controls install identity.

Verify the public `/manifest.json` and the initial HTML at `/welcome` after
recreation: installed name, Apple title and icon paths must agree. Inspect the
PWA image's `/app/release-channel.json` when diagnosing a channel mismatch. The
PWA's local `/api/health` is not an authority for install identity.

Use separate HTTPS origins for coexisting production/demo/beta installs. An
already installed home-screen icon/name may require an OS metadata refresh or
removal/reinstallation. Changing `DEMO_MODE` on the same origin preserves the
manifest identity; it does not create a separate installation.

## Feature previews

Cook Mode views, planner hold-to-move and PDF recipe import are graduated member
features and have no deployment preview variables. The generic preview service and
member override storage remain available for future registered previews; this
release does not expose any preview configuration.

## PDF recipe import

PDF recipe import is always available to established members in ordinary capture. The runtime `/manifest.json` keeps the existing identity, icons and shortcuts and advertises multipart PDF POST sharing. Manifest responses bypass the service-worker cache and use `Cache-Control: no-store`.

Installed Android metadata can remain stale after deployment. Reopen the HTTPS app and allow the browser to refresh installation metadata; if the PDF target remains absent, reinstall the PWA. Verify OS registration from several compatible PDF-sharing apps on the supported Android/browser versions. Foreground and API member validation still apply. iOS uses the file picker. This template update does not deploy anything.

PDF rendering uses a fixed profile in API code; there are no deployment tuning variables. The measured profile is 200 DPI PNG, a maximum dimension of 4096 pixels, 16,777,216 pixels per page, 64 MiB total PNG output, a 512 MiB native-child resident-memory guard and a 60-second timeout. The native child runs sequentially; page dimensions/output are validated and the parent monitors resident memory and kills/reaps it on timeout or a budget breach. RSS monitoring is sampled and is not an operating-system hard memory ceiling. Actual host architecture and household-load qualification remains required before deploying this graduation; leave capacity for the API, PostgreSQL and temporary files.

The API image pins PDFtoImage 5.4.0, includes fonts and shipped dependency notices, and runs the PDF worker inside the production chiseled container. See [renderer qualification](../../scripts/pdf/README.md) for repeatable fixture/container commands and evidence. An x64 CI result does not establish ARM64 or Synology support. A document that exceeds the fixed renderer limits remains a failed job, recoverable through Settings; its accepted PDF is retained. No additional renderer configuration is required.

Keep the whole `data/app` tree, including each recipe's internal `original/source.pdf`, rendered pages and metadata, with the database backup. Soft delete keeps artifacts; permanent purge or failed-import Delete maintenance removes the aggregate. Existing backup/restore is not a durable workflow-queue backup: restoring a pending PDF preserves its source and pending metadata but does not recreate lost workflow tasks automatically. Check pending jobs explicitly after recovery. Never expose the retained PDF through a public file server; View original serves page images only.

Release qualification must record native fixture measurements, timeout/cleanup, source lifecycle, real Android OS sharing, the iOS picker and phone usability. No live `.env`, secrets or deployment is changed by this work.

## Deployment timezone

The installation bundle defaults to **Toronto local time**:

```dotenv
Calendar__TimeZone=America/Toronto
```

This is an IANA timezone identifier, not a fixed `EST` offset. It automatically
follows **EST in winter and EDT in summer**. Change the value in `.env` if
your household lives elsewhere. Ten common examples:

| City | `Calendar__TimeZone` |
| --- | --- |
| Toronto | `America/Toronto` |
| New York | `America/New_York` |
| London | `Europe/London` |
| Paris | `Europe/Paris` |
| Berlin | `Europe/Berlin` |
| Tokyo | `Asia/Tokyo` |
| Seoul | `Asia/Seoul` |
| New Delhi | `Asia/Kolkata` |
| Canberra / Sydney | `Australia/Sydney` |
| Wellington / Auckland | `Pacific/Auckland` |

The table provides examples, not a complete list; use the IANA identifier for
your own location. The Compose configuration retains `UTC` as a compatibility
fallback **only if this setting is missing or empty**. A fresh installation
using the supplied `.env.example` defaults to Toronto.

Invalid explicit values stop API startup and identify `Calendar:TimeZone` /
`Calendar__TimeZone` in the container log. After changing the value in
`.env`, recreate the API container so it receives the new environment; a
restart alone does not reload Compose environment. No PWA, database or host
timezone change is required.

For existing installations, **do not overwrite your `.env`** with a new bundle.
Preserve your current timezone unless you deliberately change it. Changing the
zone changes Today and Monday-based week interpretation; it does not migrate
stored meal dates, cooking-history dates or UTC operation timestamps. Existing
`*_CRON_UTC` maintenance schedules continue to use UTC.

To verify, inspect the authenticated `GET /api/schedule?weekOffset=0`
response: `data.calendar.timeZone`, `today`, `currentWeekStartDate`,
`referenceWeekStartDate`, `nextDayAtUtc` and `data.weekStartDate` establish
the API calendar. Verify those values rather than relying on the server or
browser clock.
