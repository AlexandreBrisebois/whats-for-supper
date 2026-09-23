# Synology Container Manager Project

Create an empty folder on the NAS, then copy these files into it unchanged:

- `compose.yaml`
- `traefik.yml`
- `.env.example`

Rename `.env.example` to `.env`, edit only `.env`, and leave `compose.yaml` and
`traefik.yml` unchanged. The required values are first in `.env`; set all three
before deployment.

In Synology Container Manager, create a Project from that folder and deploy it.
Open `http://<nas-lan-address>:<WFS_HTTP_PORT>` after the services are healthy.

This template is LAN HTTP only. It does not configure Cloudflare, HTTPS, backup,
restore, updates, or rollback.
