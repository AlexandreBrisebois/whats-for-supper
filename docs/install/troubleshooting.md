# Installation troubleshooting

**Can't open the HTTPS address?** Confirm the intended Cloudflare connector is healthy and DNS points to its tunnel. For the bundled connector, the origin is `http://127.0.0.1:80` in Traefik's shared network namespace. For an independent/shared connector, use the deployment's unique alias, such as `http://wfs-prod-proxy:80`, and ensure the connector and proxy both join the external network. Loopback does not reach a separate proxy. See the [Cloudflare setup and verification guide](cloudflare.md). Do not use a LAN HTTP URL to sign in.

**Containers aren't starting?** Run `docker compose ps` and `docker compose logs --tail=100`. Check that `.env` has all required values and that the server can pull the images.

**Permission denied on storage?** The API must write to `data/app` and PostgreSQL to `data/postgres`; they may need different ownership. Do not make the entire project world-writable.

**Setup already ran?** `setup.sh` intentionally leaves an existing `.env` untouched. Back up your secrets before changing them. Never paste tokens into public issues.

**Updates and recovery:** Back up both database and recipe assets before upgrades. Changing `WFS_VERSION` alone is not a guaranteed safe rollback after database migrations. See the [installation reference](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/release-template/synology/README.md).
