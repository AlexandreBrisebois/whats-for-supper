# Cloudflare HTTPS setup

This is the **recommended** remote-access path. You'll need a Cloudflare account and a domain using Cloudflare DNS. The tunnel connects outbound; do not forward router ports.

1. Open the [Cloudflare dashboard](https://one.dash.cloudflare.com/). Under **Networking → Tunnels**, create a named tunnel and choose **Docker** as the connector type.
2. Copy the tunnel token into the local `setup.sh` prompt. Never share or commit it.
3. If you accepted the setup helper's offer to start the app, wait for the tunnel to connect. Otherwise, start it with `docker compose up -d`.
4. In your tunnel's **Routes**, add a **Published application**. Choose a hostname such as `supper.example.com`, service type **HTTP**, and service URL **`http://127.0.0.1:80`**. Use this exact address, even though it looks like a local address. It connects the tunnel to What's for Supper.
5. Open `https://supper.example.com`. Use that HTTPS address on all family devices.

If the hostname doesn't work, see [installation troubleshooting](troubleshooting.md) or [Cloudflare's tunnel guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/).

**Optional performance tip:** Cloudflare can cache eligible public static files to reduce repeat requests to your server. Avoid broad caching rules for private recipes, signed-in pages, APIs, or live updates.

## Verify the bundled installation

A healthy connector alone does not prove the application works. Open the public
HTTPS hostname and check `/api/health`, fresh and existing login sessions, saved
recipes, images and meal plans. While signed in with a selected family member,
check that `/api/stream` receives live updates when a test plan changes in another
browser; undo the test change afterward. Repeat after a planned recreation.
Keep private session cookies and logs containing credentials out of shared reports.

## Unreleased shared-tunnel preview

Main's template includes `cloudflared` directly in `compose.yaml`; the current
setup helper configures that bundled connector. It does not offer a shared-mode
selection or ship `compose.tunnel.yaml`, `compose.shared-tunnel.yaml`, or the
independent `cloudflared/` project. Keep using the bundled instructions above
with the matching published ZIP.

The [installation/shared-cloudflare-tunnel source branch](https://github.com/AlexandreBrisebois/whats-for-supper/tree/installation/shared-cloudflare-tunnel)
contains an unreleased alternative. Its [reviewed preview guide](https://github.com/AlexandreBrisebois/whats-for-supper/blob/cf1138e2a9571154fc5782d58697713e122abcdb/docs/install/cloudflare.md)
describes separate overlays, a connector shared by deployments on one Docker
host, and unique proxy aliases such as `wfs-prod-proxy`. In that design only
Traefik joins the external bridge; API, PWA, migration and database services stay
on private project networks. A separate connector uses the proxy alias at port
80; the bundled connector's loopback origin cannot be reused for it.

These mechanics require the preview's matching Compose files, setup/update
helpers and packaging changes. Do not copy its commands into a main installation
or combine individual preview files with a published bundle. Any adoption needs
a separately reviewed implementation and migration plan that preserves project
identity, storage and rollback. The [agent installation guide](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/docs/install/agent-install.md) explains
the review boundary.
