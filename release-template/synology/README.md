# Synology Container Manager Project

Create a project folder on the NAS, then copy these files into it unchanged:

- `compose.yaml`
- `traefik.yml`
- `.env.example`

Rename `.env.example` to `.env`, edit only `.env`, and leave `compose.yaml` and
`traefik.yml` unchanged. The required values are first in `.env`; set all five
before deployment.

Before deploying, create the required bind-mount directories inside the project
folder. The final folder structure must be:

```text
whats-for-supper/
├── .env
├── compose.yaml
├── traefik.yml
└── data/
    ├── app/
    └── postgres/
```

Do not place `data` elsewhere: `./data/app` and `./data/postgres` are relative
to `compose.yaml`.

In File Station, give `Everyone` **Read/Write** permission on `data/app` only.
The API runs as an image-specific user and must create `/data/recipes` there.
Do not grant this permission to the parent shared folder or infer the same
ownership for `data/postgres`.

In Synology Container Manager, create a Project from this folder and deploy it.

## Configure Cloudflare Tunnel

Users must access this application through an HTTPS Cloudflare hostname. Direct
HTTP access to `http://<nas-lan-address>:<WFS_HTTP_PORT>` is the private origin
for the Tunnel only; it cannot retain the production authentication cookie in a
browser. Do not give this LAN address to users.

The template runs `cloudflared` as part of this Project. It shares Traefik's
network namespace, forwards only to Traefik on loopback, and opens no additional
host port. This avoids relying on Synology-generated container names or IPs.

1. In the [Cloudflare dashboard](https://one.dash.cloudflare.com/), go to
   **Networking** > **Tunnels**, create a named tunnel, choose **Docker**, and
   copy its tunnel token. Set it as `CLOUDFLARE_TUNNEL_TOKEN` in this Project's
   `.env`. Treat it like a password: never commit or share it.
2. Redeploy the Project. The `cloudflared` service needs no published ports,
   volumes, or access to the Docker socket.
3. When the connector is healthy, select the tunnel in Cloudflare, choose
   **Routes** > **Add route** > **Published application**, and configure:

   | Setting | Value |
   | --- | --- |
   | Hostname | Your chosen public hostname, such as `supper.example.com` |
   | Service type | `HTTP` |
   | URL | `http://127.0.0.1:80` |

   This loopback address is inside the shared `cloudflared` and Traefik network
   namespace. Do not use a generated container IP, the NAS LAN address, or the
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

## Feature previews

The deployment administrator controls whether **Recipe on one page** is unavailable,
available as a per-member preview, or enabled for everyone:

```dotenv
WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS=off # off | opt-in | on
```

After changing the value, recreate the API container. Missing or invalid values
fail closed to `off`. Changing back to `off` is the rollback and requires no data
rollback.

## PDF recipe import preview

`WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT=off` is the default. `opt-in` advertises PDF sharing for the installed Android app and permits each established member to enable acquisition in Settings. `on` enables acquisition for everyone. Missing or invalid modes fail closed to `off`. The same `.env` value is passed to **both API and PWA**; recreate both containers when an administrator changes it. The single runtime `/manifest.json` keeps the existing identity/icons/shortcuts: off uses the original GET link target; opt-in/on advertises multipart PDF POST sharing. Manifest responses bypass the service-worker cache and use `Cache-Control: no-store`.

Installed Android metadata can remain stale. After a future authorized deployment change, reopen the HTTPS app and allow the browser to refresh installation metadata; if the PDF target remains absent, reinstall the PWA. Verify OS registration from several compatible PDF-sharing apps on the supported Android/browser versions. A stale target remains subject to foreground and API member gates. iOS uses the file picker. This template update does not deploy or enable the preview.

PDF rendering uses a fixed profile in API code; there are no deployment tuning variables. The measured profile is 200 DPI PNG, a maximum dimension of 4096 pixels, 16,777,216 pixels per page, 64 MiB total PNG output, a 512 MiB native-child resident-memory guard and a 60-second timeout. The native child runs sequentially; page dimensions/output are validated and the parent monitors resident memory and kills/reaps it on timeout or a budget breach. RSS monitoring is sampled and is not an operating-system hard memory ceiling. Actual NAS architecture and household-load qualification remains required before enabling the preview; leave capacity for the API, PostgreSQL and temporary files.

The API image pins PDFtoImage 5.4.0, includes fonts and shipped dependency notices, and runs the PDF worker inside the production chiseled container. See [renderer qualification](../../scripts/pdf/README.md) for repeatable fixture/container commands and evidence. An x64 CI result does not establish ARM64 or Synology support. A document that exceeds the fixed renderer limits remains a failed job, recoverable through Settings; its accepted PDF is retained. Disabling acquisition does not stop already submitted workflow retries. Enabling the preview does not require additional renderer configuration.

Keep the whole `data/app` tree, including each recipe's internal `original/source.pdf`, rendered pages and metadata, with the database backup. Soft delete keeps artifacts; permanent purge or failed-import Delete maintenance removes the aggregate. Existing backup/restore is not a durable workflow-queue backup: restoring a pending PDF preserves its source and pending metadata but does not recreate lost workflow tasks automatically. Check pending jobs explicitly after recovery. Never expose the retained PDF through a public file server; View original serves page images only.

Release qualification must record native fixture measurements, timeout/cleanup, source lifecycle, real Android OS sharing, the iOS picker and phone usability. `off → opt-in → on` is a possible later rollout, requiring separate deployment authorization and those results. No live `.env`, secrets, deployment or rollout is changed by this work.
