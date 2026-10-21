# Cloudflare HTTPS setup

This is the **recommended** remote-access path. You'll need a Cloudflare account and a domain using Cloudflare DNS. The tunnel connects outbound; do not forward router ports.

1. Open the [Cloudflare dashboard](https://one.dash.cloudflare.com/). Under **Networking → Tunnels**, create a named tunnel and choose **Docker** as the connector type.
2. Copy the tunnel token into the local `setup.sh` prompt. Never share or commit it.
3. If you accepted the setup helper's offer to start the app, wait for the tunnel to connect. Otherwise, start it with `docker compose up -d`.
4. In your tunnel's **Routes**, add a **Published application**. Choose a hostname such as `supper.example.com`, service type **HTTP**, and service URL **`http://127.0.0.1:80`**. Use this exact address, even though it looks like a local address. It connects the tunnel to What's for Supper.
5. Open `https://supper.example.com`. Use that HTTPS address on all family devices.

If the hostname doesn't work, see [installation troubleshooting](troubleshooting.md) or [Cloudflare's tunnel guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/).

**Optional performance tip:** Cloudflare can cache eligible public static files to reduce repeat requests to your server. Avoid broad caching rules for private recipes, signed-in pages, APIs, or live updates.
