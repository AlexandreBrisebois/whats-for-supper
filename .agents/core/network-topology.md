# Network Topology & Environment Doctrine

This document defines the canonical network configuration for "What's For Supper" in production environments. All agents must adhere to these rules to ensure SSE (Server-Sent Events) stability and correct cookie flow.

## 1. Same-Origin Policy (The "/" Rule)

In production environments behind Traefik, the PWA and API must operate as a single logical origin. This is enforced via environment variables:

- **`NEXT_PUBLIC_API_BASE_URL=/`**: This MUST be set to `/`. This ensures that the browser treats all API calls (including SSE `/api/stream`) as same-origin requests. This is critical for:
    - **Cookie Flow**: Browser automatically includes `h_access` and other identity cookies.
    - **SSE Stability**: Avoids CORS complexities and ensures Traefik can correctly handle unbuffered stream headers.
- **`API_INTERNAL_URL=/`**: This MUST be set to `/`. This forces both client-side and server-side logic to use relative paths, ensuring consistency across environments when proxied.

## 2. Domain Management

- **`DOMAIN_NAME`**: This is the primary routing key for Traefik. It must match the public-facing URL (including subdomains if applicable, e.g., `wfs.example.com`).
- **`NEXT_PUBLIC_COOKIE_DOMAIN`**: Set this to the parent domain (e.g., `.example.com`) to allow cookies to persist across subdomains if the architecture expands.

## 3. Traefik Routing

Traefik is responsible for the unified origin. It routes `/api/*` to the `api` container and all other traffic to the `pwa` container.

- **No Path Stripping**: The `/api` prefix must reach the API container as-is.
- **SSE Priority**: The `/api/stream` route must have a dedicated router with high priority and unbuffered headers (middleware `sse-headers@file`).

## 4. Why absolute URLs are forbidden in production

Using absolute URLs (e.g., `http://api:9001`) in `NEXT_PUBLIC_API_BASE_URL` or `API_INTERNAL_URL` in production breaks the "Same-Origin" guarantee. It forces the browser into CORS mode for client calls and disconnects the server-side fetches from the cookie-aware proxy logic, leading to authentication failures in SSR.
