# Install What's for Supper

[![Latest stable release](https://img.shields.io/github/v/release/AlexandreBrisebois/whats-for-supper?display_name=release&include_prereleases=false&label=stable%20release)](https://github.com/AlexandreBrisebois/whats-for-supper/releases/latest)

Your family's recipes, on your home server. **Recommended:** Linux + Docker Compose + Cloudflare Tunnel for HTTPS.

## 1. Download

**Use the latest stable release:** [Download the installation ZIP](https://github.com/AlexandreBrisebois/whats-for-supper/releases/latest/download/whats-for-supper-install.zip) and extract it on your Linux home server. No Git required.

**Stable bundle not published yet?** Wait for the first stable release; beta packages are for testing, not the recommended family installation.

**Before you begin:** Have Docker Compose installed on your Linux server. You'll also need a [Gemini API key](gemini-key.md) and a Cloudflare account with a domain. The linked guides show you how.

## 2. Configure

From the extracted `whats-for-supper` directory, run:

```sh
bash setup.sh
```

The helper asks for your credentials, prepares your private configuration, and offers to start the app. It won't overwrite an existing setup.

Your household timezone defaults to Toronto. [Using another timezone?](timezones.md)

New to Cloudflare? Follow the [short Cloudflare walkthrough](cloudflare.md).

## 3. Open What's for Supper

Follow the [Cloudflare walkthrough](cloudflare.md) to connect your secure hostname. Open that address in your browser to start adding recipes.

Need help? See [installation troubleshooting](troubleshooting.md) and the [full installation reference](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/release-template/synology/README.md).

**Already running What's for Supper?** [Update your installation](updates.md).

**Comfortable with Docker?** [Explore the advanced installation reference](../../release-template/synology/README.md).

> Other access methods, such as Tailscale, are [future options](https://github.com/AlexandreBrisebois/whats-for-supper/issues/300). Cloudflare remains the recommended path.
