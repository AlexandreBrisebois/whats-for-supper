# Session 6: PWA Core Components & Hooks

**Artifact:** Core UI components, Zustand stores, API client, reusable hooks

**Context needed:** Sessions 1-5 artifacts + Phase 0 spec + pwa/SRC_STRUCTURE.md

**What to build:**
- `pwa/src/components/common/` — Layout, Header, Navigation, Button, Card
- `pwa/src/components/identity/` — Family member list display
- `pwa/src/hooks/` — useFamily, useLocalStorage, useDevice
- `pwa/src/store/` — familyStore.ts (Zustand)
- `pwa/src/lib/api.ts` — Axios client with API endpoints
- `pwa/src/types/` — TypeScript interfaces for API models

**Success:**
- Components render without errors
- Zustand store persists family member state
- API client correctly constructs URLs
- All TypeScript types pass strict mode
- Dark mode toggle works (optional, minimal)

---

## Prompt

```
Task: Build Phase 0 PWA core components and state management

You are building reusable components and hooks for the Phase 0 frontend.

Context:
- API endpoints from Sessions 3-4
- UI components use earth tone Tailwind classes
- State managed via Zustand (familyStore)
- Feature-organized components by responsibility

Create:

1. pwa/src/types/index.ts
   - FamilyMember interface (id, name, completedTours)
   - Recipe interface (id, rating, addedBy, notes, images)
   - ApiResponse wrapper
   - Pagination interface

2. pwa/src/lib/api.ts
   - Axios instance with:
     * baseURL from env (NEXT_PUBLIC_API_URL)
     * timeout: 30s
     * default headers (Content-Type: application/json)
   - Endpoints:
     * getFamilyMembers() → GET /api/family
     * createFamilyMember(name) → POST /api/family
     * deleteFamilyMember(id) → DELETE /api/family/{id}
     * getRecipes(page, limit) → GET /api/recipes
     * createRecipe(formData) → POST /api/recipes (multipart)
     * getRecipeImage(recipeId, index) → GET /recipe/{recipeId}/original/{index}

3. pwa/src/store/familyStore.ts (Zustand)
   - State:
     * familyMembers: FamilyMember[]
     * selectedMemberId: string | null
     * isLoading: boolean
     * error: string | null
   - Actions:
     * setFamilyMembers(members)
     * selectMember(id)
     * addMember(name) — calls API, updates state
     * removeMember(id) — calls API, updates state
     * loadFamilyMembers() — async, fetches from API
   - Persists selectedMemberId to localStorage

4. pwa/src/hooks/useFamily.ts
   - Custom hook wrapping familyStore
   - Exposes: familyMembers, selectedMember, isLoading, selectMember, addMember, removeMember, loadFamily

5. pwa/src/hooks/useLocalStorage.ts
   - Generic hook for localStorage with TypeScript
   - useLocalStorage<T>(key, initialValue) → [value, setValue]

6. pwa/src/hooks/useDevice.ts
   - Detect device type (mobile, tablet, desktop)
   - Detect orientation (portrait, landscape)
   - Custom hook: useDevice() → { isMobile, isTablet, isPortrait }

7. pwa/src/components/common/Layout.tsx
   - Wrapper component for all pages
   - Props: children, title (optional)
   - Includes Header, Navigation, footer
   - Safe area padding for mobile

8. pwa/src/components/common/Header.tsx
   - Logo/title on left
   - Optional action button on right (optional for Phase 0)
   - Sticky top with shadow
   - Sage green background (#4B5D4D)

9. pwa/src/components/common/Navigation.tsx
   - Bottom nav bar on mobile (sticky footer)
   - Horizontal nav on desktop
   - Links: Home, Onboarding, Capture, Settings (Phase 1+)
   - Active link highlighted with terracotta (#B25E4C)

10. pwa/src/components/common/Button.tsx
    - Variants: primary (sage), secondary (outline), danger (terracotta)
    - Sizes: sm, md, lg
    - Props: onClick, disabled, loading, children, fullWidth
    - Uses Tailwind with custom colors

11. pwa/src/components/common/Card.tsx
    - Reusable container with padding, rounded corners
    - Subtle shadow
    - Props: children, className (optional)

12. pwa/src/components/common/FormInput.tsx
    - Wrapper for text inputs
    - Props: label, value, onChange, placeholder, error
    - Tailwind form styling
    - Error state in terracotta

13. pwa/src/components/common/Modal.tsx
    - Overlay modal with backdrop
    - Props: isOpen, onClose, title, children
    - Close button in top-right
    - Accessible (focus trap, escape key)

14. pwa/src/components/identity/FamilyMemberList.tsx
    - Display list of family members
    - Each member as clickable card
    - Selected member highlighted
    - Props: members, selectedId, onSelect
    - No edit/delete UI for Phase 0

15. pwa/src/components/identity/AddFamilyMemberForm.tsx
    - Form to create new family member
    - Input: name (text field)
    - Button: "Add Member"
    - Props: onSubmit, isLoading
    - Error handling (empty name validation)

Guidelines:
- Use TypeScript with strict mode
- Zustand for client state only (no Redux)
- API calls use axios with error handling
- Components are feature-organized
- Reusable components in /common
- Props are typed and documented
- No hardcoded colors (use Tailwind classes)

Target:
- All components render without errors
- Zustand store persists data (check localStorage)
- API client makes correct HTTP calls
- TypeScript strict mode passes
- ESLint has no errors
```

---

## What to Expect

After this session:
- ✅ Reusable component library ready
- ✅ State management with Zustand working
- ✅ API client fully configured
- ✅ Type-safe TypeScript interfaces
- ✅ Ready for page-level integration

## Next Steps

1. Test components in Storybook (optional) or manually in browser
2. Verify Zustand persists family member state
3. Test API client by fetching family members from running API
4. Commit: `git commit -m "session 6: PWA core components and hooks"`
5. Move to Session 7
