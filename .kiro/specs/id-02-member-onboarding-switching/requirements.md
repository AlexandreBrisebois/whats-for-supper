# ID-02 — Member onboarding and switching: requirements

## Status and scope

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.
- **Source artifact:** Current PWA, API, OpenAPI, and focused tests; `docs/feature-inventory.md` is historical context only.

This packet owns selecting the member perspective after household access. It depends on ID-01 for access and is the shared selection boundary used by ID-03 management.

## Outcome

An access-authenticated visitor can select an existing member or create one when permitted, then use that selected member identity in app requests.

## Implemented behavior

- **ID-02-AC-01 — Onboarding list and creation.** `/onboarding` loads `GET /api/family`, renders the member list, and exposes an add-member form. A nonblank name calls `POST /api/family`; on success, the returned member is appended locally and selected. The API rejects creation in demo mode with 403.
- **ID-02-AC-02 — Selection persistence.** Onboarding selection writes the HttpOnly `x-family-member-id` cookie, then calls the family store selection action, completes the client onboarding flag, and replaces the route with `/home`. The store selection action also writes a non-HttpOnly fallback cookie for local development/test before setting `selectedFamilyMemberId`.
- **ID-02-AC-03 — Switching and recovery.** `/profile` selects a member through `ProfileDropdown`, sets the same store/cookie state, completes onboarding, and pushes `/home`. `IdentityValidator` redirects routes lacking a selected member to onboarding; it attempts cookie/server recovery using `GET /api/family/me`, validates a selected ID against a loaded family list, and clears an absent selected ID only when a nonempty list has loaded.
- **ID-02-AC-04 — API identity boundary.** `FamilyMemberIdModelBinder` takes `X-Family-Member-Id` first, then `x-family-member-id`. `/api/family/me` returns 401 with a message when no identity is present and 404 when the selected ID does not exist. The browser cookie is necessary for SSE because EventSource cannot add the header.

## Preserved boundaries and non-goals

- A member ID is personalized context, not household authentication; ID-01 owns `h_access` validation.
- The family list is global in the current persistence model; this packet does not claim household-specific member partitioning.
- Member rename, delete capability, invite UI, and copy/share handling belong to ID-03. Schedule SSE payload/reconciliation belongs to schedule specifications.
- This baseline does not authorize a contract, cookie, middleware/proxy, or persistence change.

## Known limitations

- The onboarding handler writes the member cookie directly and then invokes a store action that writes it again; the operations are not transactionally coupled to navigation.
- `IdentityValidator` only clears an unknown selected ID after a successful nonempty list load. An empty list or a failed load leaves different recovery paths; there is no explicit stale-identity API error UX.
- The existing Playwright onboarding test covers list rendering, clicking a member, and adding one with a stateful `/api/family` mock. It explicitly does not prove the SSR `/home` redirect/cookie seam; `auth-flow.spec.ts` covers the full invite redirect instead.
