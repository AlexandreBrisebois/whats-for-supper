# Cloudflare HTTPS setup

> Unreleased development templates: this branch contains the scenario overlays.
> Existing published ZIPs may use the legacy bundled layout. Follow the files and
> documentation for the exact verified release; do not combine individual files
> from this branch with a published installation.

Cloudflare Tunnel is the recommended remote-access path. You need a Cloudflare
account and a domain using Cloudflare DNS. Connections are outbound; no router
port forwarding or published Docker host port is required. Always use your public
HTTPS hostname for browser access and login.

Choose the setup that matches your deployment:

| Setup | Connector location | Cloudflare service URL |
| --- | --- | --- |
| One tunnel bundled with one deployment | App Compose project; supplied default | `http://127.0.0.1:80` |
| One independent tunnel shared by deployments | Separate Compose project on the same Docker host | `http://wfs-prod-proxy:80` (unique alias per deployment) |

Both use remotely managed tunnels: public hostname routes are configured in the
Cloudflare dashboard. A local ingress configuration file is not required.

## One tunnel bundled with one deployment

Use `compose.yaml` with `compose.tunnel.yaml`. Select **1** in `setup.sh`, or
set this in your private `.env` when configuring manually:

```dotenv
COMPOSE_FILE=compose.yaml:compose.tunnel.yaml
CLOUDFLARE_TUNNEL_TOKEN=YOUR_PRIVATE_TOKEN
```

The saved `COMPOSE_FILE` selection means future plain `docker compose` commands
include the correct overlay. Do not set a conflicting shell `COMPOSE_FILE` or
use only `-f compose.yaml`, which explicitly omits the overlay.

1. Open the [Cloudflare dashboard](https://one.dash.cloudflare.com/). Under
   **Networking → Tunnels**, create a named tunnel and choose **Docker**.
2. Store its token as `CLOUDFLARE_TUNNEL_TOKEN` in this app's private `.env`, or
   enter it at the local `setup.sh` prompt. Never share or commit it.
3. If the helper did not start the app, run `docker compose up -d` from its
   project directory. Wait for the connector to become **Healthy** in Cloudflare.
4. In the tunnel's **Routes**, add a **Published application** with your hostname
   (for example, `supper.example.com`), service type **HTTP**, service URL
   **`http://127.0.0.1:80`**, and no path filter.
5. Open `https://supper.example.com` and complete the verification below.

Here `cloudflared` uses `network_mode: service:traefik`: loopback reaches Traefik
because they share a network namespace. This URL is specific to the bundled setup.

## One independent tunnel, or attach to an existing shared tunnel

Use one connector project for production, beta, demo, or other deployments on the
**same Docker host**. Only their entry-point proxies join `cloudflare-proxy`;
each app's API, PWA, migration service and database retain their project networks.
This bridge network does not span multiple NAS devices or Docker hosts.

### 1. Prepare the independent connector once

If you already have a healthy independent connector on `cloudflare-proxy`, reuse
it and skip to step 2. Do not create another tunnel or copy its token into apps.
If your existing connector uses another network name, substitute that exact name
in both the connector and app declarations below.

Create the external bridge network once, if it does not already exist:

```sh
docker network create --driver bridge cloudflare-proxy
```

On Synology, this can also be an existing user-defined bridge network created in
Container Manager. Do not recreate or delete a network already used by services.

For a new independent tunnel, create a tunnel in Cloudflare. Copy the supplied
`cloudflared/` directory into its own permanent project folder, outside every app
project. It contains a ready-to-use `compose.yaml` and `.env.example`.

Rename its `.env.example` to `.env` and set:

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=YOUR_PRIVATE_TOKEN
WFS_PROXY_NETWORK=cloudflare-proxy
```

Store the token **in that connector project's private `.env` only**. Its Compose
file maps this value to cloudflared's `TUNNEL_TOKEN` environment variable. It
publishes no ports and mounts no app data or Docker socket.

Start the connector project with Container Manager or `docker compose up -d`
from its folder. Check that Cloudflare reports the intended connector as
**Healthy**. For CLI troubleshooting, use
`docker compose logs --tail=100 cloudflared` locally; redact sensitive details
before sharing logs. Healthy tunnel status does not yet prove origin reachability.

### 2. Select the shared overlay for each deployment

For a new app, run `bash setup.sh` and choose **2**. It asks for the existing
network name and a unique proxy alias, and does not request a tunnel token.
For manual configuration, copy `.env.example` to the app's private `.env`, set
its required app values and these three settings:

```dotenv
COMPOSE_FILE=compose.yaml:compose.shared-tunnel.yaml
WFS_PROXY_NETWORK=cloudflare-proxy
WFS_PROXY_ALIAS=wfs-prod-proxy
```

The supplied `compose.shared-tunnel.yaml` attaches only Traefik to the external
network and retains its private `edge` network. It does not include an app-local
connector. Start from the app folder with `docker compose up -d`; the saved
selection includes the shared overlay automatically. The app does not need a
tunnel token. The helper does not create the independent connector or network.

Choose a stable alias unique across the shared network:

| Deployment | Alias | Example public hostname | Cloudflare service URL |
| --- | --- | --- | --- |
| Production | `wfs-prod-proxy` | `supper.example.com` | `http://wfs-prod-proxy:80` |
| Beta | `wfs-beta-proxy` | `beta-supper.example.com` | `http://wfs-beta-proxy:80` |
| Demo | `wfs-demo-proxy` | `demo-supper.example.com` | `http://wfs-demo-proxy:80` |

**Set the network and alias in `.env`, then use your actual hostnames in
Cloudflare. No Compose edits are required for a fresh standard installation.**
Keep each app's project name, folder, image version, private settings and storage.
`./data/app` and `./data/postgres` must resolve to their existing directories.
Network declarations persist through recreation; do not rely on manual
`docker network connect` attachments. API, PWA, migration and database services
stay off the shared network. Proxies on this bridge can reach each other, so use
it only for deployments within the same trust boundary.

On Synology, create or update each app as a separate Container Manager project.
Ensure the project includes **both** `compose.yaml` and the selected overlay.
If your DSM version's import does not honor `.env`'s `COMPOSE_FILE`, use SSH with
explicit `-f` files or a reviewed merged project file; do not deploy the base alone.
Keep the same selection on every subsequent redeployment.

### 3. Route each hostname through the shared tunnel

In the independent tunnel's **Routes**, create a **Published application** for
each deployment. Use its existing hostname, service type **HTTP**, the alias URL
from the table, and no path filter so Traefik receives all paths. If the dashboard
separates service type and URL, select HTTP and enter `wfs-prod-proxy:80` (or the
corresponding alias). Leave the HTTP Host Header override unset for the supplied
path-based Traefik configuration.

The origin port is Traefik's **container port 80**, regardless of any host port
mapping. Do not use `localhost`, container IPs, the ambiguous name `traefik`, or
the public hostname as the origin. Docker DNS resolves the unique network alias.

Keep `traefik.yml` unchanged: `/api` and `/api/stream` reach the API, and other
paths reach the PWA. Preserve `NEXT_PUBLIC_API_BASE_URL: ""` and
`API_INTERNAL_URL: http://api:9001`. Do not put Docker aliases in browser settings.

## Migrate existing deployments in stages

1. Save private copies of the current Compose/proxy files and `.env`. Record each
   project name, directory, mount sources, existing hostname route, origin
   overrides, DNS record and old tunnel. Have a consistent recoverable backup of
   PostgreSQL and the **complete** `data/app` tree. Do not change app versions or
   rerun migrations as part of this ingress change.
2. Verify the independent connector is healthy and on the external network. For
   a legacy all-in-one Compose file, temporarily add this network to Traefik while
   retaining the old connector (replace the alias per deployment):

   ```yaml
   services:
     traefik:
       networks:
         edge: {}
         cloudflare-proxy:
           aliases: [wfs-demo-proxy]
   networks:
     cloudflare-proxy:
       external: true
       name: cloudflare-proxy
   ```

   Merge these excerpts into the existing file; retain all other settings and
   networks. For an installation already using overlays, temporarily select
   `COMPOSE_FILE=compose.yaml:compose.tunnel.yaml:compose.shared-tunnel.yaml`
   and set the network and alias. Migrate demo, then beta, then production. Validate
   locally with `docker compose config --quiet`; do not share resolved config,
   which can expose secrets.
3. Recreate only that deployment's proxy and bundled connector using the existing
   project identity. With CLI, from the same project directory and using the same
   project name/Compose overrides as before, run
   `docker compose up -d --no-deps --force-recreate traefik cloudflared`.
   With Container Manager, update the existing project and ensure both containers
   are recreated. The old connector shares Traefik's namespace and must follow its
   recreation. Check the original public route still works.
4. Test DNS and origin reachability before switching the public hostname. One CLI
   option, if pulling a temporary diagnostic image is acceptable, is:

   ```sh
   docker run --rm --network cloudflare-proxy curlimages/curl:8.10.1 \
     --fail --show-error --max-time 15 http://wfs-demo-proxy:80/api/health
   ```

   Substitute this deployment's alias. Expect API JSON with healthy database and
   schema checks. This checks the shared network path; use the public verification
   below to check the actual tunnel path.
5. Move the existing hostname route to the independent tunnel and update its
   proxied DNS CNAME target to `<shared-tunnel-UUID>.cfargotunnel.com` where needed.
   Save the prior target first. Cloudflare may reject a duplicate hostname/DNS
   record: coordinate the old route's removal and new route creation rather than
   creating competing records. Preserve existing Access policies and review
   origin overrides. Allow for propagation and a brief cutover interruption.
6. Run every verification below. Keep the old connector available throughout the
   rollback window. Only after success, stop and remove that app's old
   `cloudflared` container. For legacy files, then remove its service block; for
   overlays, change `COMPOSE_FILE` to `compose.yaml:compose.shared-tunnel.yaml`.
   With CLI, before removing the service/overlay, use
   `docker compose stop cloudflared` then `docker compose rm -f cloudflared`.
   Do not delete the whole project, run `down -v`, prune volumes, or use broad
   orphan removal. Repeat for the next deployment.

If old and new connectors use the **same tunnel ID**, Cloudflare can send requests
to either connector. All connectors for that tunnel receive the same remote
routes and must resolve/reach every configured origin. The bundled connector's
loopback origin and the independent connector's alias origin are not interchangeable.
Plan a brief coordinated cutover, or use a separate shared tunnel for staged
migration; do not assume a successful request proves which connector served it.

### Roll back a cutover

Restore the saved old hostname route, origin settings and DNS tunnel target.
If necessary, restore the app's old `cloudflared` service and its privately retained
token, then recreate it with Traefik using the original project identity. Verify
login and live updates through the restored route. For connectors on the same
tunnel, restore compatible routing for all active connectors together.

The extra proxy network attachment can remain during rollback; if removing it,
restore the saved proxy network configuration and recreate the proxy and bundled
connector together. This ingress-only migration does not require a database
restore. Keep app data and volumes untouched. Do not delete old tunnels or private
rollback credentials until the rollback window is over.

## Verify either setup

- **Tunnel and origin:** The intended connector is healthy. Public
  `https://<hostname>/api/health` returns API JSON with healthy database/schema
  checks, rather than HTML, a redirect to login, or a Cloudflare error. Complete
  Cloudflare Access login first if enabled.
- **Authentication:** An existing session works and a fresh/private browser can
  log in using the family passphrase. Refresh a signed-in page; no redirect loop
  or cookie error should occur. Never share passphrases, session cookies or HAR
  exports containing credentials.
- **Assets and data:** Check JavaScript/CSS, `/manifest.json`, recipe images,
  existing recipes, files and meal plans. Verify each hostname reaches its own
  deployment. Use a fresh browser session to avoid relying only on cached assets.
- **API routing:** In the browser Network panel, authenticated `/api/schedule`
  and recipe requests return the expected data from this deployment.
- **Server-Sent Events:** While signed in with a selected family member, inspect
  `/api/stream`. Expect `text/event-stream`, an initial `connected` event and
  approximately 15-second `: ping` heartbeats. Change a test meal plan in another
  browser and confirm prompt updates without refreshing, then undo the test
  change. An unauthenticated curl request is not a valid SSE test. Keep the
  stream open for several minutes and check reconnect behavior.
- **Recreation:** During a planned restart/redeployment, confirm the Compose
  network attachment and unique alias remain and rerun the public checks.

Avoid broad caching rules for signed-in pages, private recipes, APIs and live
updates. Preserve SSE headers and ensure Cloudflare rules do not cache or buffer
`/api/stream`. A healthy connector alone does not validate login or SSE.

For additional protection, optionally use a
[Cloudflare Access application](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/).
The app's family passphrase remains required. For failures, see
[installation troubleshooting](troubleshooting.md) and
[Cloudflare's tunnel guide](https://developers.cloudflare.com/tunnel/get-started/).

Keep the selected overlays across upgrades. `update.sh` compares the base, selected
overlay and proxy configuration against the target release and stops for manual
review if any differ. Legacy all-in-one installations must first follow the
[template transition guide](updates.md#transition-to-the-scenario-templates).
