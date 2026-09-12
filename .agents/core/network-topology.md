# Network topology reference

Load only for network/deployment, cookie or SSE origin work. These are source-verified
implementation facts, not proof of a running deployment.

## Browser and server URLs are different

[config.ts](../../pwa/src/lib/constants/config.ts) and the
[Kiota adapter](../../pwa/src/lib/api/api-client.ts) default the browser API base to
an empty string. [useScheduleStream](../../pwa/src/hooks/useScheduleStream.ts) builds
`/api/stream` when that base is empty and uses credentials. Same-origin browser
requests behind Traefik retain `/api`; do not expose Docker service names to browsers.
Do not require a literal `/` base: callers concatenate paths, and a leading `/` base
can produce `//api/...`. Inspect each affected URL builder when changing the base.

[serverFetch](../../pwa/src/lib/api/server-client.ts) concatenates `API_INTERNAL_URL`
and the endpoint without normalization. Its default and the production override use
`http://api:9001`, the configured absolute container-network URL. It explicitly forwards
`h_access` in the Cookie header and identity as `X-Family-Member-Id`. This internal
request does not change the browser origin. The retired claim that both bases must
be `/`, or that internal absolute URLs inherently break SSR cookies, was incorrect.

## Configuration owners

- [apps.yml](../../docker/compose/apps.yml) defines API `/api` routing, the dedicated
  priority-100 stream router and `sse-headers@file` middleware. The prefix is retained.
  [traefik_dynamic.yml](../../docker/compose/traefik_dynamic.yml) defines the headers
  and additional local-host routes; inspect the composed configuration for deployment.
- [production-overrides.yml](../../docker/compose/production-overrides.yml) binds the
  host `DATA_ROOT` location to `/data`; the base API sets container `DATA_ROOT=/data`.
  [production.yml](../../docker/compose/production.yml) separately overrides container
  `DATA_ROOT` with the host variable. Do not assume those different compositions
  produce the same storage path. Verify rendered env and mounts before deployment.
- Both production files default Traefik host ports to 9100 (HTTP) and 9180 (admin),
  with overrides. These are legacy configuration facts, not public-release requirements.
  The [public release spec](../../.kiro/specs/01-public-synology-release/design.md)
  owns its planned public exposure and qualification gates.
- `DOMAIN_NAME` is a host routing value, not a URL with scheme/path.
  [auth.ts](../../pwa/src/lib/auth.ts) and
  [identity cookies](../../pwa/src/lib/identity/cookie.ts) read optional
  `NEXT_PUBLIC_COOKIE_DOMAIN`. A parent domain is not universally required.

Verify the selected Compose combination and server/client behavior rather than
copying historical environment claims. Static source inspection does not establish
SSE delivery, cookie behavior in a deployed browser, or persistent-volume recovery.
