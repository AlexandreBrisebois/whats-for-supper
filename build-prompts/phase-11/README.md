# Phase 11 — Closing Spec Gaps & Polish

**Status**: Ready for execution (6 independent prompts)

This phase addresses the gaps identified from Phase 10 gap analysis. Each prompt is self-contained and can be executed in a separate session. Order is recommended (earlier prompts have no dependencies; later ones build on auth infrastructure).

---

## Prompts at a Glance

| # | Prompt | Category | Effort | Dependencies |
|---|--------|----------|--------|---|
| 01 | [Grocery Tab Wiring](01-grocery-tab-wiring.md) | Frontend/Wiring | 15 min | None |
| 02 | [Discovery Nav Pulse](02-discovery-nav-pulse.md) | Frontend/State | 10 min | None |
| 03 | [Cooked Button](03-cooked-button.md) | Frontend/UX | 20 min | None |
| 04 | [Cross-Week Move](04-cross-week-move.md) | Full-Stack/API | 60 min | None |
| 05 | [Hearth Secret Auth](05-hearth-secret-auth.md) | Auth/Middleware | 180 min | None |
| 06 | [Share Invite & Magic Link](06-share-invite-magic-link.md) | UX/Integration | 90 min | Prompt 05 |

---

## Quick Start

### Execute in Any Order (Independent)
- **Prompt 01** — Wire GroceryList into Grocery tab (trivial frontend wiring)
- **Prompt 02** — Connect isVotingOpen → nav pulse (trivial state propagation)
- **Prompt 03** — Add "Cooked" button to Tonight card (small component addition)
- **Prompt 04** — Extend API for cross-week meal moves (medium full-stack work)

### Execute After 05
- **Prompt 05** — Build Hearth Secret auth layer (large: middleware + auth pages + token utils)
- **Prompt 06** — Add Share Invite button & Magic Link (medium: depends on auth utilities from 05)

---

## Execution Strategy

**Option A: Quick Polish Session**
Run Prompts 01, 02, 03 in one session (~45 minutes). These are trivial frontend fixes that complete the "seam work" from Phase 10.

**Option B: Full Closure**
Run all 6 prompts across 2–3 sessions:
- Session 1: Prompts 01, 02, 03, 04 (independent, ~2 hours total)
- Session 2: Prompts 05, 06 (auth-dependent, ~4 hours total)

**Option C: Minimum Viable Spec**
Run Prompts 01, 02, 03 only. These make the app functionally complete per the spec (Grocery tab working, nav pulse visible, cooked validation possible). Prompts 04–06 are "nice to have" enhancements.

---

## Gap Summary

**Completed in Phase 10**: Weekly planning, family voting, meal finalization, Cook's Mode, Grocery checklist, Skip recovery.

**Remaining (Phase 11)**:
1. **Grocery tab wiring** — Component built but not connected to UI
2. **Nav pulse on voting** — CSS/component ready but state not wired
3. **Cooked button** — API endpoint exists but no UI trigger
4. **Cross-week moves** — API limited to same-week, recovery "Next Week" broken
5. **Auth layer** — App completely unprotected (no middleware, no login flow)
6. **Family invite** — No way to share invite links with new members

---

## Architecture Notes

### Auth (Prompts 05–06)
- **Middleware**: Protects all routes under `/(app)` and `/(auth)` — unauthenticated requests redirect to `/welcome`
- **Welcome Page**: Public landing; family passphrase entry → sets `h_access` cookie → redirects to onboarding
- **Join Handler**: Processes `/join?secret=TOKEN&memberId=UUID` → validates token → auto-onboards with member selected
- **Auth Utils**: HMAC-SHA256 token generation/validation; keyed on `HEARTH_SECRET` env var
- **Cookies**: `h_access` (HttpOnly, 365-day expiry, signed token)

No database changes needed — auth is stateless (passphrase-based, not user-based).

### Cross-Week Move (Prompt 04)
Extend `MoveScheduleEventAsync` to accept optional `targetWeekOffset` parameter. If set, move recipe across weeks instead of within same week. PWA sends `targetWeekOffset: 1` for "Next Week" recovery action.

---

## Known Constraints

- **Auth is not per-user**: The app has per-family auth (one passphrase per family), not per-member login. All family members share the same `h_access` cookie and select their identity via `x-family-member-id` cookie.
- **Cross-week moves**: Only forward moves supported (next week). Backward moves (last week) are blocked for simplicity.
- **Invite links**: Semi-public (contain the family passphrase in the token). Anyone with the link can join the family.
- **Magic link token expiry**: Can be evergreen (no expiry) or time-bound (e.g., 24h). Design doc doesn't specify; implement as evergreen for simplicity.

---

## Post-Phase 11

Once all prompts complete, the app will be spec-complete. Future work (Phase 12+) would focus on:
- Performance optimization (Core Web Vitals, bundle size)
- Analytics & telemetry
- Offline resilience (service workers, sync)
- Family roles & permissions (e.g., read-only members)
- Dietary restrictions & preferences
- Recipe history & analytics
