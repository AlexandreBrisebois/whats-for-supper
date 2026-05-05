# Flow: "Who's Eating?" — Profile Member Selection

**Spec:** `.kiro/specs/00-live-schedule` — R10 (profile page accessibility + dead-end fix)
**Reviewed by:** The Mère-Designer

---

## Purpose

The profile page is the entry point for family member identity. It answers the question "Who's using the app right now?" and gates the rest of the experience. Every family member has their own view — their votes, their GOTO recipe, their home screen.

This flow documents:
- First-time use (no member selected yet)
- Returning use (member already selected)
- The "Continue as [name]" escape hatch that prevents a dead-end

---

## State Machine

```mermaid
stateDiagram-v2
    [*] --> NoMemberSelected : App first opened (no cookie)
    [*] --> MemberSelected : Returning user (cookie set)

    NoMemberSelected --> MemberSelected : User taps a family member card
    MemberSelected --> MemberSelected : User taps a different member card
    MemberSelected --> Home : User taps "Continue as [name]"
    MemberSelected --> Home : User taps a member card (auto-navigates)

    NoMemberSelected : No x-family-member-id cookie\nProfile page shown, no escape hatch\nMust select a member to proceed
    MemberSelected : x-family-member-id cookie set\n"Continue as [name]" button visible\nCan change or continue
    Home : /home — member identity confirmed
```

---

## First-Time Use (No Member Selected)

The user opens the app for the first time. No `x-family-member-id` cookie exists. The profile page is the only available screen.

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant Profile as Profile Page (/profile)
    participant API as GET /api/family/members
    participant Cookie as x-family-member-id cookie
    participant Home as /home

    rect rgb(230, 240, 255)
        note over Profile,API: First-time load — no cookie
        User->>Profile: Opens app → /profile
        Profile->>API: GET /api/family/members
        API-->>Profile: [{ id, name, avatarUrl }, ...]
        Profile->>User: Shows member cards\nTitle: "Who's Eating?"\nSubtitle: "Pick a family member to get started."\nNo "Continue as" button (no member selected yet)
    end

    rect rgb(230, 255, 230)
        note over User,Cookie: Member selection
        User->>Profile: Taps a member card (e.g. "Alex")
        Profile->>Cookie: Set x-family-member-id = {memberId}
        Profile->>Home: router.push(ROUTES.HOME)
        Home->>User: Home screen loads with Alex's context
    end
```

**Key constraint:** When no member is selected, there is no escape hatch. The user must pick a member. The "Continue as [name]" button is not rendered.

---

## Returning Use (Member Already Selected)

The user has previously selected a member. The cookie is set. They navigate to `/profile` to switch members or confirm their identity.

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant Profile as Profile Page (/profile)
    participant API as GET /api/family/members
    participant Cookie as x-family-member-id cookie
    participant Home as /home

    rect rgb(230, 240, 255)
        note over Profile,API: Returning load — cookie exists (e.g. memberId = Alex)
        User->>Profile: Navigates to /profile
        Profile->>API: GET /api/family/members
        API-->>Profile: [{ id, name, avatarUrl }, ...]
        Profile->>User: Shows member cards\nTitle: "Who's Eating?"\nSubtitle: "Pick a family member to get started."\nAlex's card highlighted (selectedFamilyMemberId matches)\nFooter: "Continue as Alex" button (ghost/outline, terracotta, full-width)
    end

    alt User wants to continue as Alex
        rect rgb(230, 255, 230)
            User->>Profile: Taps "Continue as Alex"
            Profile->>Home: router.push(ROUTES.HOME)
            note over Cookie: Cookie unchanged — still Alex
        end
    else User wants to switch to Jordan
        rect rgb(255, 245, 210)
            User->>Profile: Taps Jordan's card
            Profile->>Cookie: Set x-family-member-id = {jordanId}
            Profile->>Home: router.push(ROUTES.HOME)
            Home->>User: Home screen loads with Jordan's context
        end
    end
```

---

## "Continue as [name]" Escape Hatch

The escape hatch solves the dead-end problem: a returning user who navigates to `/profile` by accident (e.g. tapped the wrong nav item) should not be forced to re-select their member. They can tap "Continue as Alex" and return to home without any state change.

**Render condition:**
```typescript
// Only shown when a member is already selected
{selectedFamilyMemberId && (
  <Button variant="ghost" onClick={() => router.push(ROUTES.HOME)}>
    Continue as {currentMemberName}
  </Button>
)}
```

**Placement:** Footer, below the `ProfileDropdown` / member card grid. Full-width. Ghost/outline style, terracotta colour.

**Behaviour:** Calls `router.push(ROUTES.HOME)` without modifying the cookie or any store state.

---

## Page Copy

| Element | Copy |
|---|---|
| Page title | "Who's Eating?" |
| Subtitle | "Pick a family member to get started." |
| Escape hatch button | "Continue as [name]" |
| Hint text colour | `text-charcoal/60` (minimum for WCAG AA on cream background) |

**Mère-Designer ruling on title:** "Family Profile" was corporate jargon. "Who's Eating?" is the actual question the app is answering. It aligns with the app's warmth and directness.

---

## Navigation to Home

After member selection (or "Continue as"), the user lands on `/home`. The home page reads `x-family-member-id` from the cookie to:
- Fetch today's schedule for this member's family
- Load the GOTO recipe setting for this member
- Show the correct voting nudge (if voting is open)

The SSE connection (`useScheduleStream`) is established at layout level and uses the same cookie for auth. No re-connection is needed after member switch — the layout remounts on navigation, which closes and reopens the `EventSource`.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Family has only one member | Single card shown, no "Continue as" button on first use. On return, "Continue as [name]" shown. |
| Cookie set but member deleted from family | API returns 404 on member fetch. Profile page shows all remaining members. No "Continue as" button (selected ID no longer valid). |
| User navigates directly to `/home` without a cookie | `HearthAuthenticationHandler` returns 401. Next.js middleware redirects to `/profile`. |
| Two members use the same device | Each tap of a member card sets the cookie. The last person to tap is the active member. No session isolation — this is a single-family app. |

---

## E2E Test Coverage

| Scenario | Test file |
|---|---|
| Profile page shows "Who's Eating?" title | `profile.spec.ts` |
| No member selected → no "Continue as" button | `profile.spec.ts` |
| Member selected → "Continue as [name]" button visible | `profile.spec.ts` |
| Tapping "Continue as [name]" navigates to /home | `profile.spec.ts` |
| Tapping a different member card navigates to /home | `profile.spec.ts` |
