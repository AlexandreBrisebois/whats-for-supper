# Sharing & Collaboration Specification

This document defines how multiple family members interact with shared data in "What's For Supper" across different devices.

## 1. Identity Model

- Passwordless, profile-based. See [recipe-pwa.spec.md §1.5](recipe-pwa.spec.md).
- Each device stores the selected `familyMemberId` in a persistent cookie.
- The API receives `X-Family-Member-Id` on every request. See [ADR-008](decisions/008-api-identity-and-reliability.md).
- All actions (recipe add, swipe vote, meal schedule) are attributed to the active family member.

## 2. Shared Data

All household data lives in the single PostgreSQL instance. All family members read from and write to the same dataset via the API — there is no per-device data isolation beyond the identity cookie.

| Data | Shared? | Notes |
|---|---|---|
| Recipe library | Yes | All members see all recipes |
| Inspiration pool | Yes | Votes and vetoes affect all devices |
| Weekly planner | Yes | One shared schedule for the household |
| Family preferences | Per-member | Each member's Love/Like/Dislike/Veto is individual |
| Allergies | Per-member | Applied as filters in agent queries |

## 3. Real-Time Sync Strategy

- **Current approach**: Polling. PWA polls key endpoints (planner, inspiration pool) on a configurable interval (e.g., 30 seconds).
- **Future**: WebSocket or SSE for near-real-time discovery session sync (swipe events visible immediately on all devices).
- Polling interval is configurable via `NEXT_PUBLIC_SYNC_INTERVAL_MS` env var.

## 4. Conflict Resolution

- **Planner**: Last-write-wins. Simultaneous edits to the same slot show a stale-data banner prompting refresh.
- **Inspiration Pool**: Additive (Right swipes) are conflict-free. Veto (Left swipe) immediately propagates and overrides.
- **Recipe edits**: Not supported in the current scope; recipes are immutable after capture.

## 5. Family Management

Managed via `GET/POST/DELETE /api/family`. See [recipe-api.spec.md §3](recipe-api.spec.md).

- Any family member can add or remove profiles (no admin role in this phase).
- Removing a member retains their attributed recipes and historical preferences.

## 6. Notification Strategy (Phase 5+)

- `CoordinateFamilyAgent` may push in-app notifications (e.g., "Shopping list ready").
- No push notifications in Phase 0–4; in-app banners only.
