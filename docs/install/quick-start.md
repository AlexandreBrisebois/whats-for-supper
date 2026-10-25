# Install What's for Supper on your home server

Download, answer a few questions, then open your family's recipe app.
The recommended setup uses **Linux, Docker Compose and Cloudflare** to give your
app a secure web address.

## Before you start

Have these ready:

- A home server with **Docker Compose already installed**. Need help with that?
  Ask the person who manages your server before continuing.
  [Using Synology Container Manager? Read the platform notes.](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/release-template/synology/README.md#synology-container-manager)
- A [Gemini API key](gemini-key.md) for the app's recipe features.
- A Cloudflare account and a domain you manage there, such as `example.com`.
  [Get your tunnel token first](cloudflare.md),
  then return here. This connects your server to your secure web address.

Keep the key and token private. You will enter them on your server, not in chat.

## 1. Download and unpack

[Download the latest stable installation ZIP](https://github.com/AlexandreBrisebois/whats-for-supper/releases/latest/download/whats-for-supper-install.zip)
and extract it into a permanent folder on your home server. No Git is needed.
Keep the extracted folder: it will hold your app's settings and data. Ask your
helper or assistant to check the ZIP against the checksum from that same release
before running setup.

Use the instructions included in that ZIP. This development page previews an
upcoming layout; older releases can have different files and prompts. Keep each
release's files together. If the app is already installed, use the
[update guide](updates.md) instead.

## 2. Run setup

Open a terminal **on your home server**, open the extracted `whats-for-supper`
folder, then run:

```sh
bash setup.sh
```

Follow the questions in order:

1. **Tunnel setup, if asked:** press **Enter** to use the recommended setup.
2. **Gemini API key:** paste the key you prepared.
3. **Cloudflare Tunnel token:** paste the token you prepared.
4. **Administrator PIN:** choose at least six digits. Keep it somewhere safe.
5. **Start What's for Supper now?:** press **Enter** to start.

Your key, token and PIN stay hidden while you type or paste. Seeing no characters
is normal. Setup creates the other required secrets for you and saves your
settings locally. It leaves an existing setup unchanged.

If setup says Docker is missing, unavailable, or the configuration needs attention,
use [troubleshooting](troubleshooting.md). Configuration saved does not mean the
app has started.

## 3. Open your app

[Finish connecting your web address](cloudflare.md), using its **After setup** section.
Then open your **HTTPS address**, such as `https://supper.example.com`, in your browser.

When asked for the **family passphrase**, use the `HEARTH_SECRET` value saved in
`.env` in your installation folder. Open that file privately on your server, copy
only the value after `HEARTH_SECRET=`, then close it. If the file is hidden, ask
your helper to open it locally. The family passphrase is different from the administrator PIN. Share it only with your household.

Check that you can sign in, save a recipe and add it to a meal plan. Open the app
on another household device and check that you see the same recipe and plan.
Keep your installation folder and its private `.env` file safe.

## Only if you need it

- [Something isn't working](troubleshooting.md).
- [Let an assistant help](agent-install.md). Enter secrets yourself in a private local session.
- [Use a different household timezone](timezones.md). The default is Toronto.
- [Use an existing or shared tunnel](cloudflare.md) — advanced setup.
- [Full installation reference](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/release-template/synology/README.md).
