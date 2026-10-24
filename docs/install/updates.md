# Updating What's for Supper

Updates are **manual**. Don't enable unattended image updates for this stack.

1. Read the target release notes and verify compatibility. Back up **both PostgreSQL and the complete `data/app` recipe-asset tree** as a consistent recovery set. Test the restore procedure. Store a nonempty backup manifest or report file separately; merely confirming a backup exists is not enough.
2. Download the target release's installation ZIP. Keep your existing installation directory, `.env`, and `data/` intact.
3. From the installed project directory, run:

   ```sh
   bash update.sh /path/to/whats-for-supper-install-VERSION.zip /path/to/backup-report.txt
   ```

4. Confirm the displayed current/target versions, backup evidence, and migration warning. The helper only supports a version change **when the base Compose file, selected overlay and Traefik configuration are identical** to the target bundle. If configuration changed, stop and follow release-specific manual instructions, such as the [0.1.20 to 0.1.21 procedure below](#upgrading-from-0120-to-0121).
5. Open your HTTPS URL and verify login, saved recipes, meal plans, and shopping list.

The helper checks a backup-evidence file **exists**, but cannot validate its contents or the restore procedure. It does not automatically back up the database or guarantee rollback. Database migrations may be irreversible; restoring an earlier Docker image is **not** equivalent to restoring the database. If the update fails after migration, follow the tested recovery procedure.

The helper preserves the existing `.env` values other than `WFS_VERSION` and saves a private previous copy. Never replace `.env` with a new bundle's example or overwrite the persistent `data/` directories.

The selected `COMPOSE_FILE` in `.env` is preserved. The helper explicitly uses
that base/overlay pair for validation, pulls and deployment, and never updates
the independent connector project. Custom file selections require manual review.

**Advanced:** Review Compose changes and release notes manually; update image tags directly only when you understand the schema and deployment compatibility requirements.

## Transition to the scenario templates

Older bundles contain the connector inside `compose.yaml`. New bundles separate
the app base from `compose.tunnel.yaml` and `compose.shared-tunnel.yaml`. The old
version-only updater will stop because the Compose file differs. This is expected;
do not bypass its check or run the fresh-install helper over an existing `.env`.

1. Save the original Compose/proxy files and private `.env`, project identity,
   network attachments and mount sources. Prepare the consistent recovery set
   described above. Extract the target ZIP into a separate directory for review.
2. Select your existing topology. For a bundled tunnel, retain its token and add
   `COMPOSE_FILE=compose.yaml:compose.tunnel.yaml` to the existing `.env`. For an
   already migrated shared tunnel, add
   `COMPOSE_FILE=compose.yaml:compose.shared-tunnel.yaml`, `WFS_PROXY_NETWORK` and
   the **same unique proxy alias used by its current Cloudflare route**. Do not
   change hostnames or routes just to adopt these files.
3. Reconcile the new base and selected overlay against the existing configuration.
   Keep the same project name and folder, image versions and bind/volume sources,
   ports, timezone, app settings and private secrets. Copy the reviewed base,
   selected overlay and new `update.sh` into the existing project folder. Do not
   replace `.env`, `data/` or a customized `traefik.yml`. Custom storage or settings
   may require retaining customized files and manual updates thereafter.
4. Keep `WFS_VERSION` unchanged during this layout transition. Validate locally
   with `docker compose config --quiet` and inspect mount/network identities
   privately. The same service names should refer to the existing containers.
   Apply only the proxy change with `docker compose up -d --no-deps traefik` in
   shared mode. In bundled mode, recreate Traefik and its namespace-sharing
   connector together with
   `docker compose up -d --no-deps --force-recreate traefik cloudflared`.
5. Run the [public verification checklist](cloudflare.md#verify-either-setup).
   For rollback, restore the saved files and environment selection, then recreate
   the original proxy/connector as appropriate. Do not restore a database merely
   to reverse an ingress/layout change. Upgrade app versions separately afterward.

For an app still moving from bundled to shared ingress, first follow the
[staged tunnel migration](cloudflare.md#migrate-existing-deployments-in-stages).
These template changes do not migrate data or change Cloudflare automatically.

## Upgrading from 0.1.20 to 0.1.21

This upgrade changes `compose.yaml` to remove the retired Cook Mode, planner and
PDF preview variables. The version-only helper deliberately stops with
**Compose changed between versions**. Do not bypass that check or overwrite your
installation with the extracted ZIP.

1. Complete the consistent PostgreSQL + `data/app` backup and restore checks
   above. Keep private copies of your current `.env`, Compose files and
   `traefik.yml` with the recovery instructions.
2. Download `whats-for-supper-install-0.1.21.zip` and its checksum from the
   [0.1.21 release](https://github.com/AlexandreBrisebois/whats-for-supper/releases/tag/dockerhub/v0.1.21).
   Verify the checksum and extract the ZIP into a separate directory. Review its
   `compose.yaml` and `traefik.yml` against your installed files. For an otherwise
   unmodified 0.1.20 bundle, adopt the target `compose.yaml`; `traefik.yml` is
   unchanged. If you have custom configuration or overrides, reconcile them
   deliberately instead of replacing them blindly.
3. Preserve the existing `.env` and all `data/` contents. Change only
   `WFS_VERSION` to `0.1.21`; preserve your secrets, timezone and other custom
   values. The [three retired preview settings](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/docs/feature-flags.md#current-flags-and-deployment-surfaces)
   no longer control these features and need no replacement.
4. From the installed project directory, validate and pull before briefly
   stopping the application for migration. Use the same reviewed Compose
   overrides with every command if your installation needs them. Run each
   command only after the previous one succeeds:

   ```sh
   docker compose config --quiet
   docker compose pull
   docker compose stop api pwa
   docker compose up -d
   docker compose ps -a
   docker compose logs --tail=100 migration
   ```

5. Confirm that migration exited successfully and the API/PWA are running.
   Open the HTTPS app, refresh any already-open clients, and check household
   entry, recipes, plans, recipe groceries and an extra grocery item. Reopen
   installed apps to refresh their metadata; PDF sharing may require an OS
   metadata refresh or reinstallation.

The [0.1.21 compatibility migration](https://github.com/AlexandreBrisebois/whats-for-supper/blob/dockerhub/v0.1.21/api/database/compatibility.sql)
adds grocery-extra storage, a separate cooking-view preference and the
maintenance-history pruning index, and removes only the three retired preview
override keys. The matching API, PWA and migration images must all use `0.1.21`.
If migration or startup fails, stop and inspect the logs; do not assume changing
the image tag back will undo database changes.

Keep the pre-upgrade recovery set. Exact snapshots require a matching supported
schema and table inventory: an older 0.1.20 snapshot is not directly restorable by
0.1.21. See [exact recovery compatibility](https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/docs/operations/exact-recovery.md#authoritative-coverage-and-compatibility),
and capture/test a new independent snapshot after upgrading if you use that
facility.
