# Install What's for Supper

[![Latest stable release](https://img.shields.io/github/v/release/AlexandreBrisebois/whats-for-supper?display_name=release&include_prereleases=false&label=stable%20release)](https://github.com/AlexandreBrisebois/whats-for-supper/releases/latest)

Your family's recipes, on your home server. **Recommended:** Linux + Docker Compose + Cloudflare Tunnel for HTTPS.

## 1. Download

**Use the latest stable release:** [Download the installation ZIP](https://github.com/AlexandreBrisebois/whats-for-supper/releases/latest/download/whats-for-supper-install.zip) and extract it on your Linux home server. No Git required.

**Stable bundle not published yet?** Wait for the first stable release; beta packages are for testing, not the recommended family installation.

You'll need Docker Engine with the Compose plugin, a [Gemini API key](docs/install/gemini-key.md), a Cloudflare account, and a domain managed through Cloudflare.

## 2. Configure

From the extracted `whats-for-supper` directory, run:

```sh
bash setup.sh
```

The helper creates a private `.env`, generates database and internal application secrets, asks for your Gemini key, Cloudflare Tunnel token, and administrator PIN, then offers to start the app. The default household timezone is **Toronto (EST/EDT)**; to change it, edit `Calendar__TimeZone` in `.env` using the [timezone examples](docs/install/timezones.md). It will not overwrite an existing `.env`.

New to Cloudflare? Follow the [short Cloudflare walkthrough](docs/install/cloudflare.md).

## 3. Open What's for Supper

The setup helper offers to start the application for you. Follow the [Cloudflare walkthrough](docs/install/cloudflare.md) to connect your secure hostname, then open it in your browser. That's it.

Need help? See [installation troubleshooting](docs/install/troubleshooting.md) and the [full installation reference](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/release-template/synology/README.md).

Experienced with Compose? You can edit `.env` and run Compose directly. The bundled `WFS_VERSION` matches the release's Docker images. Keep your existing `.env` and persistent `data/` during updates; **do not replace them with files from a newer ZIP**. For an existing installation, `bash update.sh RELEASE_ZIP BACKUP_EVIDENCE_PATH` provides a guarded, manual update path. **Back up and test recovery of both the database and recipe assets first.** The helper refuses changed Compose/proxy templates and cannot prove migration reversibility. See [update details](docs/install/updates.md).

> Tailscale Serve is a possible future alternative ([tracking issue #300](https://github.com/AlexandreBrisebois/whats-for-supper/issues/300)), not part of the recommended setup.
