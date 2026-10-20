# Cloudflare HTTPS setup

This is the **recommended** remote-access path. You'll need a Cloudflare account and a domain using Cloudflare DNS. The tunnel connects outbound; do not forward router ports.

1. Open the [Cloudflare dashboard](https://one.dash.cloudflare.com/). Under **Networking → Tunnels**, create a named tunnel and choose **Docker** as the connector type.
2. Copy the tunnel token into the local `setup.sh` prompt. Never share or commit it.
3. Start the application using `docker compose up -d`. Wait for the `cloudflared` container to connect.
4. In your tunnel's **Routes**, add a **Published application**. Choose a hostname such as `supper.example.com`, service type **HTTP**, and service URL **`http://127.0.0.1:80`**. This address is loopback **inside the shared tunnel/Traefik network namespace**, not your home server's LAN address.
5. Open `https://supper.example.com`. Use that HTTPS address on all family devices.

If the hostname doesn't work, check the tunnel status, published route, and `docker compose ps` / `docker compose logs cloudflared`. See [Cloudflare's official tunnel guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/).

Optional: Cloudflare may cache eligible **public static assets** at its edge. Avoid blanket Cache Everything rules: never cache private recipes, authenticated responses, APIs, or live updates as shared public content.
