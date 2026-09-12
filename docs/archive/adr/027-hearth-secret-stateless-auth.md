# ADR 027: Hearth Secret — Stateless No-Password Authentication

**Date**: 2026-04-29  
**Status**: Accepted

## Context

The app is a private family tool. Traditional username/password auth is friction-heavy for a household app. The family already shares a passphrase (the "Hearth Secret") verbally or via a shared note. We need a simple, stateless auth layer that:

1. Blocks unauthenticated browsers from accessing the app.
2. Allows new family members to join via a magic invite link without creating accounts.
3. Does not require a database lookup for auth checks (no latency, no dependency).

## Decision

Implement a stateless HMAC-SHA256 token system with a Next.js middleware guard.

- **Secret**: `HEARTH_SECRET` env var (server-only). Never sent to the browser.
- **Token format**: `{timestamp}.{base64url(HMAC-SHA256(secret, timestamp))}`. Forgeable only if you know the secret.
- **Cookie**: `h_access` (HttpOnly, SameSite=Lax, 365-day maxAge). Set by `/api/auth/access` after passphrase validation.
- **Middleware** (`pwa/middleware.ts`): Validates `h_access` on every request to `/(app)` routes. Redirects to `/welcome` on missing/invalid cookie.
- **Public routes**: `/welcome`, `/invite`, `/api/*`, `/_next/*`.
- **Invite links**: Generated server-side by `/api/auth/invite-link`. Include a signed token and `memberId`. Processed by `(auth)/invite/page.tsx`.

## Consequences

- **Pro**: No database, no sessions table, no JWT library. Zero latency auth checks.
- **Pro**: Changing `HEARTH_SECRET` immediately invalidates all existing cookies — natural "revoke all" mechanism.
- **Con**: Tokens do not expire (only invalidated by secret rotation). Acceptable for a household app.
- **Con**: Anyone who obtains the invite link can join. By design — treat invite links like WiFi passwords.
- **Impact**: Playwright E2E tests must seed `h_access` cookie in fixtures to bypass middleware.
