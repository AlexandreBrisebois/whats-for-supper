# Help with installation

Find the message or problem below. Keep your installation folder and settings in
place while you check. Never post your `.env` file, keys, tokens or passphrase in
chat or an issue.

## Nothing appears when I paste a key, token or PIN

That is normal: setup hides these values. Paste once, then press Enter.

## Setup says Docker is missing or unavailable

Your settings may have been saved, but the app has not started. Ask the person
who manages your home server to check that Docker is running, Docker Compose is
installed and your account can use it. There is no need to delete the settings
or enter your secrets again.

Once Docker is ready, your helper can start the app from the existing installation
folder with `docker compose up -d`, then continue the Cloudflare steps.

## Setup says an .env already exists

Setup is protecting your existing settings. Leave the file and `data` folder in
place. If you are installing a newer version, follow the [update guide](updates.md).
If you were interrupted during first setup, ask your helper to check the existing
installation and continue from there.

## The tunnel is not healthy

First check that setup actually started the app. A message saying configuration
was saved is not a startup confirmation. Ask your helper to check the containers
from your installation folder using `docker compose ps`.

Then check that you entered the token for the tunnel you are viewing in
Cloudflare. Follow the [token instructions](cloudflare.md#before-setup-get-your-tunnel-token)
if you need to find it again. Keep that token private; do not create another
installation or tunnel just to retry.

## I cannot open the app or sign in

1. Open your full **HTTPS** address, such as `https://supper.example.com`.
   The `http://127.0.0.1:80` service address belongs in Cloudflare, not your browser.
2. Check that the tunnel is **Healthy**, then compare its route with the
   [web address instructions](cloudflare.md#after-setup-connect-your-web-address).
   For the recommended setup, leave the route's path empty.
3. Use the **family passphrase**, not your administrator PIN. It is the value
   after `HEARTH_SECRET=` in the installation folder's private `.env` file.
   If hidden files are not visible, ask your helper to open that file locally.
4. If it still fails, use [Cloudflare's troubleshooting guide](https://developers.cloudflare.com/tunnel/troubleshooting/)
   with your helper. Tell them which step failed and the error message, without
   including secret values.

## My recipe or meal plan is missing

Ask your helper to confirm that this web address reaches the intended installation
and that it is using the original data folders. Do not run setup in a new folder,
replace `.env`, delete data or change image versions to try to recover it.

## For the person helping

- **Storage permissions:** the API must write to `data/app` and PostgreSQL to
  `data/postgres`; they may need different ownership. Use the
  [platform reference](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/release-template/synology/README.md#synology-container-manager)
  for Synology. Do not make the entire project world-writable.
- **Shared tunnel:** the loopback service address above is for the recommended
  bundled connector. An independent connector needs the app's unique proxy alias
  and the matching external network. Follow the
  [shared-tunnel instructions](cloudflare.md#one-independent-tunnel-or-attach-to-an-existing-shared-tunnel).
- **Release files:** keep files from the same release together. Existing ZIPs may
  contain the connector in the base Compose file; this development branch's
  scenario overlays require a complete matching bundle. Follow the
  [transition guide](updates.md#transition-to-the-scenario-templates) for a planned migration.
- **Updates and recovery:** use a consistent backup of PostgreSQL and all recipe
  files. Changing an image version does not guarantee rollback after a database
  migration. Follow the [update and recovery guidance](updates.md).
- **Diagnostics:** inspect logs locally. Redact secret values before sharing an
  error; do not share resolved Compose configuration or full container environments.
