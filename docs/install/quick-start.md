# Install What's for Supper

Your family's recipes, on your home server. **Recommended:** Linux + Docker Compose + Cloudflare Tunnel for HTTPS.

## 1. Download

Download the installation ZIP attached to the matching [GitHub release](https://github.com/AlexandreBrisebois/whats-for-supper/releases) and extract it on your Linux home server. No Git required.

You'll need Docker Engine with the Compose plugin, a Gemini API key, a Cloudflare account, and a domain managed through Cloudflare.

## 2. Configure

From the extracted `whats-for-supper` directory, run:

```sh
bash setup.sh
```

The helper creates a private `.env`, generates database and internal application secrets, and asks for your Gemini key, Cloudflare Tunnel token, and administrator PIN. It will not overwrite an existing `.env`.

New to Cloudflare? Follow the [short Cloudflare walkthrough](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/docs/install/cloudflare.md) (use the corresponding release documentation until this page is merged).

## 3. Start and open

```sh
docker compose up -d
```

In Cloudflare, publish your chosen hostname to the tunnel's HTTP service at `http://127.0.0.1:80` (inside the tunnel/Traefik shared network namespace). Then open `https://your-hostname`. **Do not use an HTTP LAN address for login**: secure cookies require HTTPS.

Need help? See [installation troubleshooting](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/docs/install/troubleshooting.md) and the [full installation reference](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/release-template/synology/README.md).

Experienced with Compose? You can edit `.env` and run Compose directly. The bundled `WFS_VERSION` matches the release's Docker images. Keep your existing `.env` and persistent `data/` during updates; **do not replace them with files from a newer ZIP**. A guarded update helper is planned, not yet included.

> Tailscale Serve is a possible future alternative ([tracking issue #300](https://github.com/AlexandreBrisebois/whats-for-supper/issues/300)), not part of the recommended setup.
