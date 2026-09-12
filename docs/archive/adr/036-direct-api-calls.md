# ADR 036 — Direct API Calls: Remove the `/backend` Proxy

**Date**: 2026-05-04  
**Status**: Accepted  
**Deciders**: Alex Brisebois

---

## Context

The project has used a Next.js rewrite rule since early development to proxy `/backend/:path*` to the API container. This was introduced as a LAN development convenience: by routing through the PWA's own origin, any device on the local network could reach the API without knowing the API container's IP address or port, and without CORS configuration.

ADR 033 (`033-nextjs-16-proxy-pattern.md`) documents the migration from `middleware.ts` to `proxy.ts` in Next.js 16, but the `/backend` rewrite in `next.config.js` is a separate mechanism — a Next.js server-side HTTP proxy, not the edge proxy function.

Production has always used a different model: Traefik routes `Host(wfs.srvrlss.dev) && PathPrefix(/api)` directly to the API container. The browser calls `/api` directly; the Next.js server is not involved. ADR 034 (`034-two-stage-member-context-gate.md`) explicitly documents that `/api/*` is excluded from the two-stage auth gate because the browser calls the API container directly via Traefik.

This created an inconsistency across environments:

- **Production**: browser → Traefik → API (direct, `/api`)
- **Docker dev**: browser → Next.js rewrite → API (proxied, `/backend`)
- **Local dev**: browser → Next.js rewrite → API (proxied, `/backend`)

The inconsistency means that a bug in CORS configuration, Traefik routing, or the API's auth middleware would not be caught in development. It also means `NEXT_PUBLIC_API_BASE_URL` had different semantics in different environments.

## Decision

Remove the `/backend` rewrite from `next.config.js` entirely. Update all source references to use `/api` directly. Update the Docker dev Traefik label for the `api` service to use `Host(pwa.wfs.localhost) && PathPrefix(/api)` so that Docker dev matches production routing exactly.

The new invariant is:

> `NEXT_PUBLIC_API_BASE_URL` defaults to `/api` in all environments. Traefik routes `PathPrefix(/api)` to the API container in both Docker dev and production. The Next.js server never proxies API traffic.

## Status

Implemented.

## Consequences

- All environments now use the same routing model. A CORS or Traefik misconfiguration will be visible in development rather than silently masked by the proxy.
- `NEXT_PUBLIC_API_BASE_URL` has a single, consistent meaning: the base URL the browser uses to reach the API. It defaults to `/api` (relative, same-origin via Traefik) and can be overridden to an absolute URL (e.g., `http://127.0.0.1:5001`) for local dev without Docker.
- The `api.wfs.localhost` hostname is no longer needed for Docker dev. The API is reachable at `pwa.wfs.localhost/api`.
- `api/appsettings.Development.json` gains `http://127.0.0.1:3000` in `AllowedOrigins` to support Playwright's `baseURL` of `http://127.0.0.1:3000` making direct cross-origin requests to the API.
- The Next.js build is marginally simpler (one fewer async export in `next.config.js`).
- No user-facing behaviour changes.
