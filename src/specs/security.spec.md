# Security Specification

This document defines the security posture for "What's For Supper". As a self-hosted home application, the threat model is primarily focused on NAS exposure, data privacy, and safe defaults.

## 1. Threat Model

- **In scope**: Unauthorized access to family data; accidental exposure of the NAS to the public internet; injection attacks via recipe metadata.
- **Out of scope**: Nation-state adversaries; enterprise-grade compliance requirements.

## 2. Identity & Access

- **Passwordless**: No passwords stored. Identity is a persistent cookie on each device containing the `familyMemberId`.
- **No authentication tokens**: The `X-Family-Member-Id` header is trusted within the home network. It is not a bearer token and provides attribution, not authorization.
- **Network boundary**: The API and database are not exposed to the public internet. All services communicate on an internal Docker network. The Next.js PWA is the only service optionally exposed via a reverse proxy (e.g., Nginx).

## 3. Input Validation

- **Image uploads**: Validate MIME type and file size on the API. Reject non-image content types.
- **Recipe metadata**: `recipe.info` fields are validated (rating is integer 0–3, strings are length-capped).
- **Family member IDs**: Validated against the `FamilyMembers` table before attribution; unknown IDs are rejected with `400`.
- **SQL injection**: All database queries use parameterized statements via `Npgsql`. No raw string interpolation in SQL.

## 4. Container Security

- **Chiseled images**: No shell, no package manager in production containers (per [ADR-006](decisions/006-containerization-strategy.md)).
- **Non-root user**: All containers run as a non-root user.
- **Read-only filesystem**: Where possible, container filesystems are mounted read-only; only the `/recipes` volume mount is writable.
- **No privileged mode**: No containers require `--privileged`.

## 5. Secrets Management

- All secrets (API keys, connection strings) are injected via environment variables.
- Never committed to source control. Use `.env.local` locally; Docker secrets or environment injection in production.
- `GEMINI_API_KEY` is the only cloud secret required in Phase 1+.

## 6. Network Security

- Internal Docker network: `recipe-network` (bridge). Services communicate by container name.
- Only the Next.js PWA and (optionally) the Recipe API are exposed via a host port.
- Recommended: Place a reverse proxy (Nginx/Caddy) in front with HTTPS termination for LAN access.

## 7. Data Privacy

- Recipe images are stored on the NAS filesystem, never uploaded to cloud storage.
- Only hero image transformation is sent to Google GenAI (Pass 2). The original images remain local.
- Family member names and preferences are stored locally in PostgreSQL on the NAS.

## 8. Logging

- No PII (family member names, recipe content) in structured logs.
- Log `recipeId` and `familyMemberId` (opaque IDs) for tracing, not readable names.
- Production containers emit JSON-structured logs to stdout; collected by Docker logging driver.
