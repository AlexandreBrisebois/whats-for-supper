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
