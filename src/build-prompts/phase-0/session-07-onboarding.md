# Session 7: Onboarding Flow & Identity Selection

**Artifact:** `/onboarding` page with family selection, hint system scaffold, routing

**Context needed:** Sessions 1-6 artifacts + Phase 0 spec sections 1.3-1.4

**What to build:**
- `pwa/src/app/onboarding/page.tsx` — Main onboarding page
- `pwa/src/components/identity/FamilySelector.tsx` — Select or create family member
- `pwa/src/components/hints/HintOverlay.tsx` — Reusable spotlight component (scaffold)
- `pwa/src/hooks/useHintTour.ts` — Tour state management hook (scaffold)
- `pwa/src/app/middleware.ts` — Redirect logic for onboarding check
- Navigation redirect: after selection → `/home`

**Success:**
- Navigate to `/onboarding` shows family list
- Clicking family member selects them and redirects to `/home`
- "Don't see your name?" button shows add form
- Creating family member saves and redirects to `/home`
- Returning user skips onboarding (stores selection in localStorage)
- Hint scaffold renders without errors (no hints active yet)

---

## Prompt

```
Task: Implement Phase 0 onboarding flow and identity selection

You are building the first-time user onboarding experience.

Context:
- Family member list from Sessions 6 (FamilyMemberList, useFamily)
- API integration from Session 6 (createFamilyMember endpoint)
- Hint system will be added in Session 8 (build scaffold now)
- Route map: /onboarding → /home (after selection)

Create:

1. pwa/src/app/onboarding/page.tsx
   - Full-screen onboarding container
   - Centered title: "Who Are You?"
   - Subtitle: "Select your name or add a new member"
   - Display FamilyMemberList component
   - Display AddFamilyMemberForm component (initially hidden)
   - Toggle "Don't see your name?" button to show add form
   - After selection: redirect to /home with selectedMemberId in localStorage
   - Use Layout component from Session 6

2. pwa/src/components/identity/FamilySelector.tsx
   - Container for selection flow
   - Props: onMemberSelected (callback), isLoading
   - Renders:
     * FamilyMemberList (displays members from Zustand)
     * AddFamilyMemberForm (hidden until toggle clicked)
   - Toggle button: "Don't see your name? Add it"
   - On member click: call onMemberSelected(memberId)
   - On form submit: create member via API, trigger onMemberSelected

3. pwa/src/components/hints/HintOverlay.tsx (Scaffold)
   - Props: isActive (boolean), children, targetSelector (optional)
   - For Phase 0: render nothing (hint system not active yet)
   - Placeholder structure:
     * Container div with className
     * Spotlight div (hidden for now)
     * Popover div (hidden for now)
   - Will be fully implemented in Session 8

4. pwa/src/hooks/useHintTour.ts (Scaffold)
   - Hook signature: useHintTour(tourId: string) → { isActive, currentStep, nextStep, completeTour }
   - For Phase 0: returns { isActive: false, ... } (no-op)
   - Structure ready for Session 8 implementation

5. pwa/src/store/onboardingStore.ts (optional)
   - Zustand store for onboarding state
   - State:
     * hasCompletedOnboarding: boolean (localStorage)
     * showAddForm: boolean
   - Actions:
     * completeOnboarding()
     * toggleAddForm()

6. pwa/src/app/middleware.ts
   - Check if user has selectedMemberId in localStorage
   - If NOT and visiting /:
     * Redirect to /onboarding
   - If YES and visiting /onboarding:
     * Skip to /home
   - Used by Next.js middleware config

7. pwa/src/app/home/page.tsx
   - Home page after onboarding
   - Displays: "Welcome, [FamilyMemberName]!"
   - Navigation to /capture (Session 9)
   - Navigation to /recipes (Phase 1)
   - Placeholder: "No recipes yet. Add your first?"

8. Update pwa/src/app/layout.tsx
   - Wrap with Zustand store provider (use context if needed)
   - Import globals.css
   - Set up Layout component for all pages

9. Update pwa/src/app/page.tsx (root)
   - Redirect to /onboarding if no selectedMemberId
   - OR show splash screen with "Welcome to What's For Supper"
   - CTA: "Get Started" → /onboarding

Validation Rules (from Phase 0 spec):
- Family member name: required, non-empty
- Selection persists across sessions (localStorage)
- Only one family member selected at a time
- First-time users see onboarding (no bypass)

Hint System Scaffold (to be fully built in Session 8):
- HintOverlay component structure in place but inactive
- useHintTour hook ready for integration
- No actual hints displayed yet

Guidelines:
- Use Zustand for state (familyStore + onboardingStore)
- API calls via hintService from Session 6
- Earth tone Tailwind styling
- Mobile-first design (responsive)
- Accessibility: semantic HTML, focus states
- No hardcoded strings (prepare for i18n in Session 8)

Target:
- Fresh user loads app → /onboarding displayed
- Select family member → redirected to /home
- Add new family member → form submits, redirects to /home
- Return to app → skips onboarding
- All TypeScript strict
- No console errors
```

---

## What to Expect

After this session:
- ✅ Onboarding page implemented and styled
- ✅ Family member selection working with API
- ✅ Redirect logic in place (onboarding → home)
- ✅ User state persisted across sessions
- ✅ Hint system scaffold ready for Session 8

## Next Steps

1. Test onboarding flow manually:
   - Fresh user (clear localStorage) → should see onboarding
   - Select member → should redirect to /home
   - Refresh page → should skip onboarding
2. Test add family member flow
3. Verify family member name appears in /home welcome
4. Commit: `git commit -m "session 7: onboarding flow and identity selection"`
5. Move to Session 8
