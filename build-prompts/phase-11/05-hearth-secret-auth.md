# Prompt 05: Hearth Secret Authentication (No-Password Auth Layer)

**Persona**: Security/Auth Engineer specializing in token-based auth and middleware

**Context**:
The Hearth Secret is the app's no-password authentication system. Instead of passwords, families share a memorable passphrase (`HEARTH_SECRET` env var). Access is controlled via:
1. **h_access cookie** (signed, 365-day expiry) — persistent proof of family membership
2. **Middleware protection** — all routes redirect unauthenticated users to `/welcome`
3. **Magic Invite Links** (`/join?secret=TOKEN&memberId=UUID`) — family members share links to onboard new members

Currently, **no middleware exists** — the app is completely unprotected.

**TARGET FILES**:
- `pwa/middleware.ts` [NEW] — request-level auth checks
- `pwa/src/app/welcome/page.tsx` [NEW] — public landing (no auth required)
- `pwa/src/app/join/page.tsx` [NEW] — invite link handler
- `pwa/src/lib/auth.ts` [NEW] — token generation/validation utilities
- `.env` — add `HEARTH_SECRET` (example: "our family loves cooking")

**FORBIDDEN**:
- Do not modify existing `/home`, `/planner`, `/discovery` routes' implementations
- Do not change the onboarding flow beyond adding `/welcome` as entry point

**DELIVERABLES**:

### 1. Middleware (`pwa/middleware.ts`)
```typescript
// Protect all routes under /(app)/, /(auth)/onboarding
// Allow: /welcome, /join, /api/health, static assets, /_next/*
// For protected routes:
//   - Check for h_access cookie
//   - If missing/invalid: redirect to /welcome
//   - If valid: proceed
```

Key points:
- Use `NextRequest` / `NextResponse` from `next/server`
- Cookie validation: verify signature matches `HEARTH_SECRET`
- Exception list: `/welcome`, `/join`, `/api/*` (API has its own auth if needed)
- Expiry check: if cookie older than 365 days, redirect to `/welcome`

### 2. Welcome Page (`pwa/src/app/welcome/page.tsx`)
Landing page for unauthenticated visitors.
- Display: "Welcome to What's For Supper"
- Fields: ask for family name + passphrase
- Action: validate passphrase against `HEARTH_SECRET`
- On success: set `h_access` cookie + redirect to `/onboarding`
- On failure: show error message

Simple form, no database queries (stateless validation).

### 3. Join Handler (`pwa/src/app/join/page.tsx`)
Process invite links: `/join?secret=TOKEN&memberId=UUID`
- Parse URL params
- Validate `secret` token against `HEARTH_SECRET` (via utility function)
- If valid: set `h_access` cookie + auto-select family member + redirect to `/home`
- If invalid: redirect to `/welcome` with error

### 4. Auth Utilities (`pwa/src/lib/auth.ts`)
```typescript
export function generateSecretToken(secret: string): string {
  // Create a signed token from HEARTH_SECRET + timestamp
  // Use crypto.subtle.sign() or HMAC-SHA256
  // Format: base64(hmac(secret, "token" + timestamp))
}

export function validateSecretToken(token: string, secret: string): boolean {
  // Verify token signature matches secret
  // Check expiry (optional: tokens valid for 24h, or evergreen?)
}

export function generateInviteLink(
  baseUrl: string,
  secret: string,
  memberId: string
): string {
  const token = generateSecretToken(secret);
  return `${baseUrl}/join?secret=${encodeURIComponent(token)}&memberId=${memberId}`;
}
```

Signature method: HMAC-SHA256 with `HEARTH_SECRET` as key. This prevents tampering.

### 5. Cookie Handling
- Name: `h_access`
- Value: signed token (see auth.ts)
- Expiry: 365 days
- HttpOnly: true (secure, can't be accessed via JS)
- SameSite: 'lax' (CSRF protection)
- Secure: true (HTTPS only in prod)

### 6. Environment
Add to `.env.local` (not committed):
```
HEARTH_SECRET=our family loves cooking
```

### 7. Family Member Integration
When joining via invite link:
- `memberId` from URL is auto-selected in `familyStore`
- Set `x-family-member-id` cookie to match
- Redirect to `/home`

**TDD PROTOCOL**:
- Unit: Token generation/validation roundtrip works
- Unit: Invalid tokens rejected
- Integration: `/welcome` accepts valid passphrase → cookie set → redirect to `/onboarding`
- Integration: `/join?secret=VALID&memberId=UUID` → auto-selects member → cookie set → redirect to `/home`
- Integration: Unauthenticated request to `/planner` → redirects to `/welcome`
- Integration: Authenticated request to `/planner` → proceeds

**VERIFICATION**:
- `npm run dev` → navigate to `/` → redirects to `/welcome` (unauthenticated)
- Submit passphrase → redirected to `/onboarding`
- Complete onboarding → access `/home`, `/planner` freely
- Generate invite link in settings → share with family → invite recipient uses link → auto-onboards + selects member

**MICRO-HANDOVER**:
- Confirm middleware catches all unauth requests
- Confirm invite link token generation is cryptographically sound
- Note any cookie/session management edge cases
- Document the passphrase setup process

**Effort**: ~3–4 hours. Middleware + 3 new pages + auth utilities + cookie setup.

---

## Design Notes

**User Experience**:
1. **First time**: Visitor lands on app → `/welcome` → enters family passphrase → `/onboarding` (existing flow)
2. **Invite**: Family member shares `/join?secret=TOKEN&memberId=UUID` → recipient lands on `/join` → validates token → auto-onboards with that member selected
3. **Returning**: User has `h_access` cookie → middleware allows access → lands on default route

**Security**:
- Passphrase is never transmitted to the backend (stored locally in middleware secret)
- Tokens are HMAC-signed with the passphrase — tampering is detectable
- Cookies are HttpOnly — XSS can't steal them
- No database lookups for auth (stateless)

**Edge Cases**:
- What if `HEARTH_SECRET` changes? Old cookies become invalid — users re-authenticate
- What if passphrase is empty/undefined? Fail securely (treat as invalid)
- What if invite link is used twice? Both users get same member selected — probably OK for now, or add user-selection step after invite

**Spec Reference**: §1.2 "Authentication: The Hearth Secret (No-Password Auth)"
