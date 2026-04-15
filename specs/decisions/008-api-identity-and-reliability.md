# ADR 008: API Identity Protocol & Redis Reliability

## Status
Accepted

## Context
The Recipe API needs to attribute every action (recipe upload, family management) to a specific family member. The identity model is passwordless — family members select their profile on the PWA and persist it locally. This ADR defines how that identity is communicated to the API and what happens when Redis is unavailable during an upload.

## Decisions

### 1. Identity Handshake: `X-Family-Member-Id` Header
The PWA sends the selected `familyMemberId` as a custom HTTP header on every request:

```
X-Family-Member-Id: mom
```

- **Rationale**: Stateless and NAS-friendly. No session infrastructure, no tokens to manage. The API validates the value against the `FamilyMembers` table and rejects unknown IDs with `400 Bad Request`. This provides attribution (who did this?) without authorization (is this person allowed?), which is appropriate for a home network application.
- **Storage on client**: The `familyMemberId` is stored in a **persistent cookie** (30-day expiry, `SameSite=Lax`) on each device. The PWA reads this cookie and injects it as the header value on every API call via `lib/identity.ts`.

### 2. Redis Failure Behavior: Fail Fast
If Redis is unavailable when the API attempts to publish to `recipe:import:queue`, the API returns `503 Service Unavailable` and does **not** persist the recipe files.

- **Rationale**: A file-based fallback scanner would duplicate the purpose of the queue and introduce operational complexity (two code paths to maintain, two failure modes to monitor). Since import is async and the user is not blocked waiting for it, failing fast is the correct behavior. The user can retry the upload once Redis is restored. A future backlog item may introduce a retry mechanism if operational data shows this is a common failure mode.
- **Consequence**: Redis is a required infrastructure dependency for recipe uploads, not optional.

## Consequences
- **Positive**: Simple, auditable identity model; no session state on the server; predictable failure behavior.
- **Neutral**: Redis must be healthy before recipes can be captured. Monitoring Redis health is important.
- **Negative**: No offline capture capability in Phase 1 (future PWA offline queue could address this).

## Participants
- **Architect Alex** (Infrastructure Lead)
- **David** (Product/UX Engineer)
