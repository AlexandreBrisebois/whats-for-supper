# Anonymous PWA telemetry

Telemetry is disabled unless the deployment administrator explicitly sets
`WFS_TELEMETRY_ENABLED=true` in the container environment. All three Sentrame
settings below must also be present and valid; otherwise collection stays off.
The opt-in applies to this deployment, not a per-member preference.

```dotenv
WFS_TELEMETRY_ENABLED=false
SENTRAME_OTLP_BASE=
SENTRAME_BROWSER_TOKEN=
SENTRAME_SERVER_TOKEN=
```

Set the base to your reachable Sentrame origin (HTTPS outside local development),
and copy the two distinct producer tokens from Sentrame's private configuration.
Never use a viewer passphrase. Keep these values in the private env file, never
in Git or `NEXT_PUBLIC_*` variables. The endpoint must have no path, query,
credentials or fragment. Container localhost means the PWA container itself.

For repository Compose deployments, edit `docker/.env.local`. For the Synology
release template, edit its `.env`. Recreate the PWA container using the same env
file and Compose file selection used to start the deployment. For example, in
the Synology deployment directory: `docker compose --env-file .env up -d --force-recreate pwa`.
Deploy an image containing this integration first; subsequent setting changes
require container recreation, not an image rebuild. Reload open tabs after changes.

## Collection contract

This is the base integration only. Enabling it permits export; it does not start
automatic collection. No screen, click, error, trace, metric or business event
instrumentation is connected. The instrumentation strategy is a later change.

The initial closed event vocabulary contains only `pwa.telemetry.check`, a fixed
synthetic INFO log. The server-only `sendServerCheck()` and `sendBrowserCheck()`
entry points in `pwa/src/lib/telemetry/server.ts` export it using their respective
credentials. The unwired `reportBrowserTelemetryCheck()` Server Action in
`pwa/src/lib/telemetry/actions.ts` provides the browser entry point, with Next.js's
same-origin protections. It takes no client payload, identity or destination.
Do not import the server module into a Client Component. Neither token nor the
Sentrame endpoint is returned to the browser.

Both producers emit standard OTLP/HTTP JSON logs to `/v1/logs`. The payload has
only a fixed service name, scope, event name, synthetic body, severity and current
timestamp. No IDs, cookies, browser storage, URLs, queries, headers, raw errors,
recipe content or user text are collected. Expand the closed event vocabulary
and reviewed attributes when designing instrumentation; preserve producer authority.

Configuration is checked on each export. Each producer has independent limits
of 120 records/minute and four concurrent requests per Node process. Exports time
out after two seconds. Receiver failures and redirects drop records without
retries or application errors. This is best-effort telemetry, not an audit trail;
the entry points do not acknowledge receiver acceptance.

## Qualification

The [Sentrame developer guide](https://github.com/AlexandreBrisebois/sentrame/blob/main/docs/DEVELOPER-GUIDE.md)
documents standard JSON intake and producer authority. Test with a disposable
Sentrame instance and private test credentials. In an isolated development fixture,
invoke each check once and confirm `pwa.telemetry.check` under Unmapped events
with the correct browser/server authority and service. No diagnostic trigger route
or automatic startup probe is installed in the deployed PWA. Inspect the wire
payload, disable collection and confirm check invocations produce no intake.
Exercise unavailable intake and the actual proxy/tunnel. Local tests do not
qualify the live Sentrame deployment or its retention policy.
