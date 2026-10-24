# Installation troubleshooting

**Can't open the HTTPS address?** Confirm the Cloudflare tunnel is healthy, the published application route points to `http://127.0.0.1:80` inside the shared container namespace, and DNS has updated. Do not use a LAN HTTP URL to sign in.

**Containers aren't starting?** Run `docker compose ps` and `docker compose logs --tail=100`. Check that `.env` has all required values and that the server can pull the images.

**Permission denied on storage?** The API must write to `data/app` and PostgreSQL to `data/postgres`; they may need different ownership. Do not make the entire project world-writable.

**Setup already ran?** `setup.sh` intentionally leaves an existing `.env` untouched. Back up your secrets before changing them. Never paste tokens into public issues.

**Updates and recovery:** Back up both database and recipe assets before upgrades. Changing `WFS_VERSION` alone is not a guaranteed safe rollback after database migrations. See the [installation reference](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/release-template/synology/README.md).

**Following shared-tunnel instructions?** Main's installation ZIP uses the bundled
connector and loopback origin above. Separate overlays, proxy aliases and shared
mode selection belong to an [unreleased preview](cloudflare.md#unreleased-shared-tunnel-preview).
Do not change the origin to a preview alias without its matching implementation
and a reviewed migration plan.
