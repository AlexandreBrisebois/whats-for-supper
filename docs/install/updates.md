# Updating What's for Supper

Updates are **manual**. Don't enable unattended image updates for this stack.

1. Read the target release notes and verify compatibility. Back up **both PostgreSQL and the complete `data/app` recipe-asset tree** as a consistent recovery set. Test the restore procedure. Store a nonempty backup manifest or report file separately; merely confirming a backup exists is not enough.
2. Download the target release's installation ZIP. Keep your existing installation directory, `.env`, and `data/` intact.
3. From the installed project directory, run:

   ```sh
   bash update.sh /path/to/whats-for-supper-install-VERSION.zip /path/to/backup-report.txt
   ```

4. Confirm the displayed current/target versions, backup evidence, and migration warning. The helper only supports a version change **when Compose and Traefik configuration are identical** to the target bundle. If configuration changed, stop and follow release-specific manual instructions.
5. Open your HTTPS URL and verify login, saved recipes, meal plans, and shopping list.

The helper checks a backup-evidence file **exists**, but cannot validate its contents or the restore procedure. It does not automatically back up the database or guarantee rollback. Database migrations may be irreversible; restoring an earlier Docker image is **not** equivalent to restoring the database. If the update fails after migration, follow the tested recovery procedure.

The helper preserves the existing `.env` values other than `WFS_VERSION` and saves a private previous copy. Never replace `.env` with a new bundle's example or overwrite the persistent `data/` directories.

**Advanced:** Review Compose changes and release notes manually; update image tags directly only when you understand the schema and deployment compatibility requirements.
