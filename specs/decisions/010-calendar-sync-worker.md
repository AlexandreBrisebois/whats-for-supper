# ADR 010: Calendar Sync Worker Architecture

## Status: Proposed

## Context

"What's For Supper" integrates with external calendars (Google Calendar, Microsoft Outlook) to make meal planning calendar-aware. The `CalendarSyncWorker` is a background service that:
- Polls for "Busy/Free" blocks on external calendars to identify constrained meal slots
- Pushes planned meals back to external calendars so they appear alongside other household events

Currently, the Calendar Sync Worker is mentioned only as a two-line entry in [integration.spec.md §1](../integration.spec.md) with no dedicated architecture spec, no error handling strategy, no authentication decision, and no Docker operations guidance.

This ADR resolves the implementation details needed for Phase 4 (Planner) and Phase 4+ deployment.

## Decision

### 1. Technology Stack: .NET 10 Native AOT

**Rationale:**
- Consistency with Recipe API and Import Worker (all .NET 10 ecosystem)
- Efficient resource usage on NAS hardware (< 50MB RAM footprint)
- Shared PostgreSQL driver (`Npgsql`), logging, and configuration patterns
- Single deployment pipeline and container strategy

**Base Image:** `mcr.microsoft.com/dotnet/nightly/runtime-deps:10.0-noble-chiseled`

### 2. Google Calendar Authentication: User OAuth Token (Per-Family)

**Decision:** Each family member's Google Calendar is accessed using their personal OAuth token, not a service account.

**Rationale:**
- **Home app context:** "What's For Supper" is a self-hosted home application, not a multi-tenant SaaS. Service accounts and domain admin roles are unnecessary.
- **Single household, shared data:** The family operates a single shared meal plan. One family member (designated "calendar admin") grants access to their Google Calendar during onboarding.
- **Simplicity:** Avoids Google Workspace domain setup complexity. Users only need a personal Google account.
- **Privacy:** The app does not need to read all family members' calendars individually; reading the shared household calendar (delegated by one member) is sufficient.

**Implementation:**
- In Phase 4 onboarding, one family member clicks "Connect Google Calendar" → OAuth flow → access token + refresh token stored in `SyncState` table.
- `SyncState` has one row per calendar provider (`provider = 'google'` or `'outlook'`), shared by the household.

**Consequence:** If the family member who authorized revokes access, calendar sync stops. The UI shows a banner prompting re-authorization.

### 3. Outlook Authentication: Azure AD App Registration

**Decision:** Microsoft Graph API (Outlook) is accessed using Azure AD client credentials flow (app-based, not user-based).

**Rationale:**
- User OAuth for Outlook requires interactive sign-in for every family member (or delegation complexity with shared mailboxes).
- Client credentials (app owns the credentials, not the user) is simpler for a shared household calendar use case.
- The "Outlook calendar" in this context is a shared family calendar (e.g., a shared mailbox), not individual mailboxes.

**Implementation:**
- Admin sets up an Azure AD app during initial NAS setup (one-time, documented in operations.spec.md).
- `client_id`, `client_secret`, and `tenant_id` are stored in environment variables.
- `SyncState` has one row for `provider = 'outlook'` with minimal data (no token refresh needed per access token flow).

### 4. Data Model: `SyncState` Table

**Schema:**

```sql
CREATE TABLE sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL, -- 'google' or 'outlook'
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01',
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per provider (unique constraint)
ALTER TABLE sync_state ADD CONSTRAINT sync_state_provider_unique UNIQUE (provider);
```

**Fields:**
- `provider` — 'google' or 'outlook'
- `last_synced_at` — Timestamp of the last successful pull. Used to detect stale syncs (see monitoring).
- `last_error` — If the last sync cycle failed, stores the error message (e.g., "token expired, refresh failed").
- `last_error_at` — Timestamp of the last error. Used to calculate backoff intervals.
- `access_token` — OAuth access token for Google Calendar (Outlook uses client credentials, so this is null).
- `refresh_token` — OAuth refresh token for Google Calendar.
- `token_expiry` — Timestamp when `access_token` expires. Used to proactively refresh before expiry.

### 5. Polling Strategy & Error Handling

**Polling Interval:** Every 5 minutes (hardcoded; not configurable in Phase 4).

**On successful poll:**
1. Fetch "Busy/Free" blocks from external calendar.
2. Update `CalendarEvents` table: mark slots with "Busy" blocks as `constrained = true`.
3. Fetch planned meals from the weekly planner (`CalendarEvents` where `status = 'Planned'`).
4. Push each meal to the external calendar as a new event.
5. Update `SyncState.last_synced_at = now()`.

**On error:**
1. Log the error to structured JSON (level: WARN).
2. Update `SyncState.last_error` and `last_error_at`.
3. **Exponential backoff:** Do not retry immediately.
   - After 1st failure: wait 30 seconds before next poll attempt.
   - After 2nd failure (1 minute later): wait 2 minutes.
   - After 3rd failure (3 minutes later): wait 10 minutes.
   - After 4th+ failure: wait 10 minutes (cap).
   - **Reset on success:** Any successful poll resets the backoff counter.

**No automatic recovery:** Unlike the Import Worker (which has a dead-letter stream and explicit retry mechanism), calendar sync failures are **soft failures**. The system does not block or page on calendar sync issues; the family can still plan meals without external calendar integration. The `/health` endpoint reports degraded state if the last sync > 15 minutes ago (see monitoring).

**Note on token refresh (Google):**
- Before each poll, check if `token_expiry <= now()`. If so, call Google's token refresh endpoint.
- If refresh fails, treat it as a sync error (exponential backoff applies).
- If refresh succeeds, update `SyncState.access_token` and `token_expiry`.

### 6. Push Event Format (Calendar → External Provider)

When a meal is added to the planner (`CalendarEvents.status = 'Planned'`), the worker pushes it to the external calendar.

**Google Calendar event:**
```
title: "<recipe label>"
description: "Planned via What's For Supper"
start: "<date>T18:00:00Z"  (assuming Supper slot, 6 PM)
end: "<date>T18:30:00Z"    (assuming 30-minute default prep time)
```

**Outlook (Microsoft Graph) event:**
```json
{
  "subject": "<recipe label>",
  "bodyPreview": "Planned via What's For Supper",
  "start": { "dateTime": "<date>T18:00:00", "timeZone": "America/Toronto" },
  "end": { "dateTime": "<date>T18:30:00", "timeZone": "America/Toronto" }
}
```

**Fields:**
- `title` / `subject` — Recipe label (e.g., "Spaghetti Carbonara").
- `description` — Static tag ("Planned via What's For Supper") allows the family to identify calendar events created by the app.
- `duration` — Derived from `recipe.prep_time_minutes` if available; defaults to 30 minutes if unknown.
- **Timezone:** Hardcoded to the family's local timezone (configurable via env var `TZ` in docker-compose.yml; default: `America/Toronto`). In Phase 5+, this can be per-family-member.

### 7. Docker Compose Service Definition

```yaml
calendar-sync-worker:
  build:
    context: ./calendar-sync-worker
    dockerfile: Dockerfile
  image: whats-for-supper/calendar-sync-worker:latest
  container_name: calendar-sync-worker
  depends_on:
    postgres:
      condition: service_healthy
  environment:
    POSTGRES_CONNECTION_STRING: ${POSTGRES_CONNECTION_STRING}
    GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    OUTLOOK_CLIENT_ID: ${OUTLOOK_CLIENT_ID}
    OUTLOOK_CLIENT_SECRET: ${OUTLOOK_CLIENT_SECRET}
    OUTLOOK_TENANT_ID: ${OUTLOOK_TENANT_ID}
    TZ: America/Toronto
  healthcheck:
    test: ["CMD", "/app/health-check.sh"]  # Check if last sync < 15 minutes ago
    interval: 60s
    timeout: 5s
    retries: 3
  restart: unless-stopped
  mem_limit: 100m
  networks:
    - recipe-network
```

**Startup Order (in docker-compose.yml):**
```yaml
depends_on:
  postgres:
    condition: service_healthy
```

Position: After `api` (position 5), independently of other services.

**Memory Target:** < 50MB (heap). Total process memory < 100MB.

### 8. Monitoring & Alerting

**Degraded Health:**
- The `/health` endpoint returns `503 Service Unavailable` if `last_synced_at < now() - 15 minutes`.
- This surfaces in `docker compose ps` as an unhealthy service.
- **Action:** Check `docker logs calendar-sync-worker` for the most recent error and backoff state.

**Dead-Letter Equivalent:**
- Calendar sync failures are not fatal (unlike import failures). The system continues functioning.
- **Monitoring strategy:** Periodically check `SyncState.last_error_at` and `last_synced_at` via a simple dashboard query or a cron job that alerts if `last_synced_at` is very old (e.g., > 1 hour).
- In Phase 5+, `CoordinateFamilyAgent` can emit an in-app notification: "Calendar sync is out of date; please reconnect."

---

## Consequences

### Positive
- Single tech stack consistency (all services .NET 10 on NAS).
- Soft failure design (calendar sync issue does not block meal planning).
- Per-family provider choice (Google or Outlook, or both if needed).
- Exponential backoff prevents cascade failures if the external provider is temporarily unreachable.

### Negative
- If the family member who authorized Google Calendar leaves the household, re-authorization is needed (slightly disruptive).
- Outlook setup requires Azure AD configuration upfront (one-time burden during NAS setup).

---

## Migration & Alternatives

### If Google Revokes Token
- Prompt the family to re-authorize via a UI banner in Settings.
- Clear `SyncState.access_token` and `refresh_token`; mark service degraded.

### If Outlook Tenant Changes
- Admin updates `OUTLOOK_CLIENT_ID` and `OUTLOOK_CLIENT_SECRET` env vars.
- Restart the calendar-sync-worker container.

### If Calendar Integration Needs to Be Disabled
- Set `GOOGLE_CLIENT_ID` and `OUTLOOK_CLIENT_ID` to empty strings in env vars.
- The worker skips calendar sync cycles (logs info-level message).

---

## Participants
- **Architect Alex** — Decision owner
- **Calendar Integration Lead** — Implementation (TBD)

---

## Implementation Checklist (Phase 4)

- [ ] Create `calendar-sync-worker/` project directory (C# console app or Worker Service template)
- [ ] Implement `CalendarSyncService.cs` with polling loop and backoff logic
- [ ] Implement `GoogleCalendarProvider.cs` with OAuth token refresh and pull/push
- [ ] Implement `OutlookCalendarProvider.cs` with client credentials flow
- [ ] Create `SyncState` migration file
- [ ] Add `calendar-sync-worker` to docker-compose.yml with depends_on and healthcheck
- [ ] Document Google OAuth setup in operations.spec.md
- [ ] Document Outlook/Azure AD setup in operations.spec.md
- [ ] Add monitoring guidance (check `/health`, logs)
- [ ] Benchmark resource usage on NAS hardware
- [ ] Test token refresh and error recovery scenarios
