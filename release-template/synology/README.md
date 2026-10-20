# Home Server Installation Guide

Install What's for Supper on a home server using Docker Compose. The included
Compose template provides the application, database, reverse proxy, and Cloudflare
Tunnel connector. Synology Container Manager is one way to deploy this template;
the shared configuration below is not tied to a particular NAS brand.

## Before you begin

You need a home server with a working Docker Engine and Docker Compose deployment
method, persistent storage, and permission to create project files and directories.
You also need the values documented in `.env.example`, including a Gemini API key,
Cloudflare Tunnel token, and the application's required secrets. Follow the
Cloudflare HTTPS setup below before giving household members access.

The template is currently maintained in `release-template/synology/` for
compatibility with existing installations and links. That directory name does not
make Synology hardware mandatory. Support, filesystem permissions, architecture,
and available capacity must be verified for your chosen host.

## Install with Docker Compose

Create a project directory on the home server and copy these template files into it:

- `compose.yaml`
- `traefik.yml`
- `.env.example`

Rename `.env.example` to `.env` and set all five required values at the top
of that file. Leave `compose.yaml` and `traefik.yml` unchanged for the documented
baseline configuration. Keep secrets out of version control.

Before starting the stack, create the required bind-mount directories:

```text
whats-for-supper/
├── .env
├── compose.yaml
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
docker compose config
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
Use the Container Manager interface to recreate services when configuration
changes. Verify actual permissions and capacity for your NAS model.

### Other Docker Compose hosts

Use the Docker Compose commands above with host-appropriate filesystem ownership
and security controls. Do not copy Synology File Station permissions to Linux
or other platforms. This guide documents a general Compose workflow, not a
claim that every CPU architecture, OS, or host has been qualified.

## Optional local HTTP diagnostics port

The default Compose deployment publishes **no host HTTP port**. Cloudflare Tunnel
connects directly to Traefik inside the shared container network, so port 9100
is not required.

For local troubleshooting only, also copy `compose.local-port.yaml` into
the project folder and start with:

```sh
docker compose -f compose.yaml -f compose.local-port.yaml up -d
```

This binds the optional HTTP origin to `127.0.0.1:9100` on the **server only**
(or `WFS_HTTP_PORT` if configured). It is not accessible from other LAN devices
and is **not** a supported browser sign-in URL: secure authentication cookies
require HTTPS. Remove the override and recreate the stack to disable the port.
On Synology, the Container Manager project workflow uses the default Compose
file without this override.

## Configure Cloudflare Tunnel

Users must access this application through an HTTPS Cloudflare hostname. The Tunnel connects to Traefik at `http://127.0.0.1:80` within its shared
container network namespace. Do not direct users to an HTTP LAN address;
production authentication cookies require HTTPS.

The template runs `cloudflared` as part of this Project. It shares Traefik's
network namespace, forwards only to Traefik on loopback, and opens no additional
host port. This avoids relying on Synology-generated container names or IPs.

1. In the [Cloudflare dashboard](https://one.dash.cloudflare.com/), go to
   **Networking** > **Tunnels**, create a named tunnel, choose **Docker**, and
   copy its tunnel token. Set it as `CLOUDFLARE_TUNNEL_TOKEN` in this deployment's
   `.env`. Treat it like a password: never commit or share it.
2. Redeploy the deployment. The `cloudflared` service needs no published ports,
   volumes, or access to the Docker socket.
3. When the connector is healthy, select the tunnel in Cloudflare, choose
   **Routes** > **Add route** > **Published application**, and configure:

   | Setting | Value |
   | --- | --- |
   | Hostname | Your chosen public hostname, such as `supper.example.com` |
   | Service type | `HTTP` |
   | URL | `http://127.0.0.1:80` |

   This loopback address is inside the shared `cloudflared` and Traefik network
   namespace. Do not use a generated container IP, the home-server LAN address, or the
   public hostname as the service URL. Cloudflare creates the DNS record for the
   hostname when the route is saved.
4. Open `https://<your-public-hostname>` and use that HTTPS address going
   forward. Do not configure router port forwarding or UPnP for this app.

For an Internet-facing household app, consider protecting the hostname with a
[Cloudflare Access application](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/).
The app's family passphrase remains required; Access adds a separate outer gate.

See Cloudflare's [Tunnel setup guide](https://developers.cloudflare.com/tunnel/get-started/)
for current dashboard details and connector troubleshooting.

This template does not configure backup, restore, updates, or rollback.

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

The deployment administrator controls whether **Recipe on one page** is unavailable,
available as a per-member preview, or enabled for everyone:

```dotenv
WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS=off # off | opt-in | on
WFS_FEATURE_PLANNER_HOLD_TO_MOVE=off # off | opt-in | on
```

After changing the value, recreate the API container. Missing or invalid values
fail closed to `off`. Changing back to `off` is the rollback and requires no data
rollback.

## PDF recipe import preview

`WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT=off` is the default. `opt-in` advertises PDF sharing for the installed Android app and permits each established member to enable acquisition in Settings. `on` enables acquisition for everyone. Missing or invalid modes fail closed to `off`. The same `.env` value is passed to **both API and PWA**; recreate both containers when an administrator changes it. The single runtime `/manifest.json` keeps the existing identity/icons/shortcuts: off uses the original GET link target; opt-in/on advertises multipart PDF POST sharing. Manifest responses bypass the service-worker cache and use `Cache-Control: no-store`.

Installed Android metadata can remain stale. After a future authorized deployment change, reopen the HTTPS app and allow the browser to refresh installation metadata; if the PDF target remains absent, reinstall the PWA. Verify OS registration from several compatible PDF-sharing apps on the supported Android/browser versions. A stale target remains subject to foreground and API member gates. iOS uses the file picker. This template update does not deploy or enable the preview.

PDF rendering uses a fixed profile in API code; there are no deployment tuning variables. The measured profile is 200 DPI PNG, a maximum dimension of 4096 pixels, 16,777,216 pixels per page, 64 MiB total PNG output, a 512 MiB native-child resident-memory guard and a 60-second timeout. The native child runs sequentially; page dimensions/output are validated and the parent monitors resident memory and kills/reaps it on timeout or a budget breach. RSS monitoring is sampled and is not an operating-system hard memory ceiling. Actual host architecture and household-load qualification remains required before enabling the preview; leave capacity for the API, PostgreSQL and temporary files.

The API image pins PDFtoImage 5.4.0, includes fonts and shipped dependency notices, and runs the PDF worker inside the production chiseled container. See [renderer qualification](../../scripts/pdf/README.md) for repeatable fixture/container commands and evidence. An x64 CI result does not establish ARM64 or Synology support. A document that exceeds the fixed renderer limits remains a failed job, recoverable through Settings; its accepted PDF is retained. Disabling acquisition does not stop already submitted workflow retries. Enabling the preview does not require additional renderer configuration.

Keep the whole `data/app` tree, including each recipe's internal `original/source.pdf`, rendered pages and metadata, with the database backup. Soft delete keeps artifacts; permanent purge or failed-import Delete maintenance removes the aggregate. Existing backup/restore is not a durable workflow-queue backup: restoring a pending PDF preserves its source and pending metadata but does not recreate lost workflow tasks automatically. Check pending jobs explicitly after recovery. Never expose the retained PDF through a public file server; View original serves page images only.

Release qualification must record native fixture measurements, timeout/cleanup, source lifecycle, real Android OS sharing, the iOS picker and phone usability. `off → opt-in → on` is a possible later rollout, requiring separate deployment authorization and those results. No live `.env`, secrets, deployment or rollout is changed by this work.

## Deployment timezone

The administrator selects the household's supper calendar in the project's `.env`:

```dotenv
Calendar__TimeZone=UTC
# To follow Toronto's civil dates, including daylight saving changes:
# Calendar__TimeZone=America/Toronto
```

UTC is the default when the setting is omitted or empty in Compose. Use an IANA
identifier such as `America/Toronto`; invalid explicit values stop API startup and
identify `Calendar:TimeZone` / `Calendar__TimeZone` in the container log. Correct the
value in `.env` and recreate the API container through your Compose deployment method so it
receives the new environment. A restart alone does not reload Compose environment.
No PWA, database or host timezone setting is needed.

During upgrades, add this key to the existing `.env`; preserve existing secrets
and operator overrides instead of replacing that file with the example. Changing
the zone changes Today and Monday-based week interpretation. It does not migrate
stored meal dates, cooking-history dates or UTC operation timestamps. Existing
`*_CRON_UTC` maintenance schedules continue to use UTC.

After recreation, inspect an authenticated `GET /api/schedule?weekOffset=0`
response: `data.calendar.timeZone`, `today`, `currentWeekStartDate`,
`referenceWeekStartDate`, `nextDayAtUtc` and `data.weekStartDate` establish the API's
calendar. Verify those values rather than relying on the NAS or browser clock.
