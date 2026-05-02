# Prompt 06: Share Invite & Magic Link Generation

**Persona**: Product/UX Engineer specializing in family onboarding flows

**Context**:
Family members need a way to invite others to the app. The spec describes:
1. **"Share Invite" button** — visible in Family Management (Profile page)
2. **Magic Link** — format `/join?secret=TOKEN&memberId=UUID`
3. **Web Share API** — opens native share sheet on mobile/desktop
4. **Persistent link** — shareable via SMS, email, WhatsApp, etc.

Currently:
- The Pivot Sheet has "Nudge Family" (Web Share of Discovery URL)
- There's no Family Management invite flow
- Magic Link generation and validation are not wired

This prompt builds the invite infrastructure in Family Management.

**TARGET FILES**:
- `pwa/src/app/(app)/profile/page.tsx` or `pwa/src/components/identity/FamilyManager.tsx` — add Share Invite button
- `pwa/src/lib/auth.ts` — leverage token generation from Prompt 05
- `pwa/src/components/common/InviteLinkDialog.tsx` [NEW] — display + copy link UI

**DEPENDENCY**:
- Requires Prompt 05 (Hearth Secret auth) to be complete
- Uses `generateInviteLink()` from `pwa/src/lib/auth.ts`

**DELIVERABLES**:

### 1. Share Invite Button
**Location**: Family Management view (Profile page or dedicated Family Manager component)

Add a button next to each family member (or family-level action):
```
[👨‍👩‍👧‍👦 Family]
├─ Mom (you)
├─ Dad  [Share Invite]
├─ Lucy [Share Invite]
└─ [+ Add Member]
```

Or family-level:
```
[Share Family Invite]
← Invite anyone to join this family
```

**Recommended**: Per-member button (each member gets their own link with their memberId).

### 2. Link Generation UI (`InviteLinkDialog.tsx`)
Modal that appears when user taps "Share Invite":
```
┌─────────────────────────────────────┐
│  Invite [Family Member Name]        │
├─────────────────────────────────────┤
│ Share this link with family:         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ https://app.../join?secret=...  │ │ (truncated display)
│ └─────────────────────────────────┘ │
│                                     │
│ [📋 Copy Link]  [Share] [Cancel]   │
├─────────────────────────────────────┤
│ ✅ Link copied!  (temporary toast)  │
└─────────────────────────────────────┘
```

**Actions**:
- **Copy Link**: Copy full URL to clipboard (show toast "Copied!")
- **Share**: Trigger `navigator.share()` with the link
- **Cancel**: Close dialog

### 3. Integration with Profile Page
```typescript
// pwa/src/app/(app)/profile/page.tsx (existing FamilySelector or new section)

const [inviteOpen, setInviteOpen] = useState<{ memberId: string; memberName: string } | null>(null);

const handleShareInvite = (memberId: string, memberName: string) => {
  setInviteOpen({ memberId, memberName });
};

return (
  <div>
    {/* ... existing family member list ... */}
    {familyMembers.map(member => (
      <div key={member.id} className="flex justify-between items-center p-4">
        <span>{member.name}</span>
        <Button onClick={() => handleShareInvite(member.id, member.name)}>
          Share Invite
        </Button>
      </div>
    ))}
    
    {inviteOpen && (
      <InviteLinkDialog
        memberId={inviteOpen.memberId}
        memberName={inviteOpen.memberName}
        onClose={() => setInviteOpen(null)}
      />
    )}
  </div>
);
```

### 4. InviteLinkDialog Component
```typescript
// pwa/src/components/common/InviteLinkDialog.tsx

interface InviteLinkDialogProps {
  memberId: string;
  memberName: string;
  onClose: () => void;
}

export function InviteLinkDialog({
  memberId,
  memberName,
  onClose,
}: InviteLinkDialogProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteLink = generateInviteLink(baseUrl, process.env.NEXT_PUBLIC_HEARTH_SECRET, memberId);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      // Show toast: "Copied!"
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join our family on What's For Supper`,
          text: `${memberName} invited you to help plan meals!`,
          url: inviteLink,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };
  
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* ... modal content ... */}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Key Details**:
- Use `process.env.NEXT_PUBLIC_HEARTH_SECRET` (public env var, safe in browser)
- Call `generateInviteLink(baseUrl, secret, memberId)` from auth.ts
- Copy to clipboard: `navigator.clipboard.writeText()`
- Share: `navigator.share()` with title, text, and URL
- Fallback: if `navigator.share()` not available, just show Copy button

### 5. Environment Variable
Add to `.env.local` and `.env.production`:
```
NEXT_PUBLIC_HEARTH_SECRET=our family loves cooking
```

**Important**: This is marked `NEXT_PUBLIC_` so it's available in the browser for link generation. It's the same as the backend secret, but that's OK — the secret is meant to be shared (it's a passphrase, not a credential).

### 6. Test Scenarios
- Unit: `generateInviteLink()` produces valid URLs with correct token + memberId
- Integration: Tap "Share Invite" → dialog opens with correct member name
- Integration: Copy button → link copied to clipboard (test with Playwright's `page.evaluate()`)
- Integration: Share button → `navigator.share()` called with correct data
- Integration: Shared link → recipient uses it → auto-onboards with correct member selected

**TDD PROTOCOL**:
- Playwright: Click "Share Invite" → dialog appears
- Playwright: Copy button → verify clipboard contains valid invite URL
- Playwright: Share button → verify `navigator.share()` called
- Manual: Actually share a link via SMS/WhatsApp → test it works on another device

**VERIFICATION**:
- `npm run dev` → Profile page → tap Share Invite → dialog appears
- Copy → paste link into browser → auto-redirects to `/join` handler
- Click Share → native share sheet opens (mobile/desktop)

**MICRO-HANDOVER**:
- Confirm invite link format is correct
- Confirm token generation/validation roundtrip works
- Confirm clipboard and share APIs work reliably
- Document any iOS/Android quirks

**Effort**: ~1.5 hours. Dialog component + integration in Profile + clipboard/share handling.

---

## Design Notes

**UX Flow**:
1. Parent opens Profile → Family section
2. Taps "Share Invite" next to a family member
3. Dialog shows prettified link (maybe shortened with share button)
4. User chooses: Copy or Share (native sheet)
5. Link is shared via SMS/Slack/WhatsApp/email/etc.
6. Recipient clicks link → redirects to `/join?secret=TOKEN&memberId=UUID`
7. `/join` handler validates token → sets cookies → auto-selects member → redirects to `/home`

**Naming**:
- "Share Invite" — clearly communicates intent
- "Invite [Family Member Name]" — personalizes the dialog
- "Join this family" — copy in the shared message

**Error Handling**:
- If clipboard write fails: show fallback "Select all + copy" instructions
- If share not available: Show text area with link for manual copy
- If link invalid/expired: Join handler shows error → redirect to `/welcome`

**Spec Reference**: §2.2 "Settings & Family Management (Kindle-style)" → "Share Invite" button

**Security Note**:
The invite link contains the family passphrase in the token. Anyone with the link can join the family. This is by design — sharing the link is how you invite family (like sharing a WiFi password). If the link is leaked, anyone can join, so the passphrase should be strong/memorable but not heavily guarded (it's semi-public).
