# ADR 038 — Elevated PIN For Dangerous Irreversible Actions

**Date**: 2026-05-08  
**Status**: Accepted  
**Deciders**: Alex Brisebois

---

## Context

Some actions in WFS are irreversible and high-consequence: permanently deleting a recipe removes all DB records, disk assets, and search index artifacts with no recovery path. These actions need a gate beyond the existing Hearth authentication model.

Several options were considered:

1. **Admin role** — a separate elevated user type with additional permissions. Rejected: there is no admin role in this household model. All household members are equal participants.
2. **Re-enter Hearth passphrase** — use the existing `HEARTH_SECRET` as the confirmation. Rejected: this conflates authentication (who are you) with authorization (are you sure), and would require the passphrase to be exposed to UI components that have no other need for it.
3. **Confirmation dialog only** — a "type the word DELETE" pattern with no server-side enforcement. Rejected: the server cannot distinguish a confirmed delete from a programmatic one. Also provides no deterrent for agents acting on behalf of users.
4. **Deployment-configured PIN in a request header** — a short PIN stored as an environment variable, sent in a dedicated `X-Elevated-Pin` header, validated server-side on each call. Accepted.

## Decision

Dangerous irreversible actions are gated by a deployment-configured PIN:

- The PIN lives in the `ELEVATED_ACTIONS_PIN` environment variable on the API server.
- The client sends it in the `X-Elevated-Pin` request header on each call that requires elevation.
- The PIN is **never** placed in the URL, query string, or request body.
- The server validates the header on every call — there is no session or token issued.
- If `ELEVATED_ACTIONS_PIN` is not set, the endpoint returns HTTP 503 (`PIN_NOT_CONFIGURED`). The feature is explicitly unavailable, not silently broken.
- Wrong or missing PIN returns HTTP 403.

The PIN is intentionally separate from `HEARTH_SECRET`. They serve different purposes: `HEARTH_SECRET` establishes household identity; the elevated PIN gates destructive actions within that household.

Currently applies to: `DELETE /api/recipes/{id}/purge`.

## Status

Implemented.

## Consequences

- Operators must set `ELEVATED_ACTIONS_PIN` in their deployment environment to enable permanent deletion. The safe default (unset) makes purge unavailable.
- The PIN is transmitted in a custom header on every call. It is not cached or stored client-side beyond the lifetime of the PIN dialog interaction.
- Future dangerous actions (e.g. bulk operations, family member removal) should use the same pattern — add `X-Elevated-Pin` header validation to the relevant endpoint, document the requirement in the OpenAPI spec.
- Because the PIN has no session lifetime, an operator can rotate it by changing `ELEVATED_ACTIONS_PIN` and restarting the API container — all existing sessions immediately lose elevation.
- This pattern is not suitable for multi-tenant or internet-facing deployments where a shared household PIN would be a meaningful secret. WFS is a self-hosted household application; this is an appropriate trade-off.
