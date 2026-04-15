# Session 8: Localization & Hint System Scaffold

**Artifact:** i18n setup with English/French, hint overlay component, tour management

**Context needed:** Sessions 1-7 artifacts + Phase 0 spec section 2.2 (UX flows)

**What to build:**
- `pwa/src/locales/` folder with English and French translations
- `pwa/src/locales/index.ts` — i18n initialization and helper functions
- `pwa/src/lib/hintService.ts` — Hint content + API integration
- `pwa/src/components/hints/HintOverlay.tsx` — Fully implemented spotlight + popover
- `pwa/src/hooks/useHintTour.ts` — Fully implemented tour state management
- `pwa/src/store/tourStore.ts` — Zustand store for tour state
- Language toggle in Header (English/French)

**Success:**
- Switching language changes UI text (hints + common strings)
- `GET /api/family` returns completed_tours data
- HintOverlay renders spotlight and popover without errors
- Tour progression works: nextStep advances current step
- French translations match English in scope and accuracy

---

## Prompt

```
Task: Implement Phase 0 localization and hint system

You are building multi-language support (English/French) and the visual hint system.

Context:
- API now returns completed_tours JSONB from FamilyMember
- Hint overlay uses spotlight effect (sage green spotlight, terracotta glow)
- Minimal text design: visual cues first, text as supplement
- Zustand for tour state management

Deliverables:

1. pwa/src/locales/index.ts
   - getLocale() → returns 'en' or 'fr' from localStorage or browser language
   - setLocale(locale) → saves to localStorage
   - t(key, defaultValue) → translates key or returns default
   - Translation key structure: 'scope.section.key' (dot notation)
   - Example: t('onboarding.step1.title', 'Welcome')

2. pwa/src/locales/en/hints.json
   Hint content for Phase 0 journeys:
   - phase0-onboarding (6 steps):
     * step1: "Family member list" (minimal text)
     * step2: "Select your name" (minimal text)
     * step3: "Add yourself" (if not found)
     * step4: "Enter your name"
     * step5: "Save your selection"
     * step6: "Welcome!"
   - phase0-capture (9 steps):
     * step1: "Add Recipe" button intro
     * step2: "Take a photo" (or select from gallery)
     * step3: "Review photos"
     * step4: "Select cooked meal photo"
     * step5: "Rate the meal" (emoji scale)
     * step6: "Save recipe" button
     * step7: "Recipe saved!"
     * step8-9: "Add another?" prompt

3. pwa/src/locales/en/common.json
   Shared UI strings:
   - buttons: next, skip, done, back, cancel, submit
   - labels: onboarding, capture, home, settings
   - messages: loading, error, success
   - progress: "Step {{current}} of {{total}}"

4. pwa/src/locales/fr/hints.json
   French translations of hints.json
   - Same structure as English
   - All text translated to French

5. pwa/src/locales/fr/common.json
   French translations of common.json

6. pwa/src/lib/hintService.ts
   - getHints(tourId, locale) → returns HintTourConfig
   - getTourCompletionState(familyMemberId) → fetches from API
   - completeTour(familyMemberId, tourId) → POSTs to API
   - shouldAutoPlayTour(familyMemberId, tourId) → boolean
   - loadLocalizedHints(tourId, locale) → lazy loads JSON

7. pwa/src/store/tourStore.ts (Zustand)
   - State:
     * activeTourId: string | null
     * currentStep: number
     * isComplete: boolean
     * completedTours: { [tourId]: CompletionInfo }
   - Actions:
     * startTour(tourId)
     * nextStep()
     * completeTour(tourId)
     * loadCompletedTours(familyMemberId)

8. pwa/src/hooks/useHintTour.ts (Full Implementation)
   - Hook: useHintTour(tourId: string) → {
       isActive: boolean,
       currentStep: number,
       totalSteps: number,
       nextStep: () => void,
       completeTour: () => void,
       getCurrentHint: () => HintStep | null,
       skipTour: () => void
     }
   - Manages tour progression
   - Calls tourStore and hintService

9. pwa/src/components/hints/HintOverlay.tsx (Full Implementation)
   - Props:
     * isActive: boolean
     * step: HintStep
     * onNext: () => void
     * onSkip: () => void
     * locale: 'en' | 'fr'
   - Renders:
     * Full-screen semi-transparent backdrop (dark gray, 70% opacity)
     * Spotlight: Sage green (#4B5D4D) with 80% opacity around target element
     * Spotlight glow: Box shadow with terracotta (#B25E4C) accent
     * Popover: Card near target with:
       - Optional icon/emoji
       - Title (if titleKey provided)
       - Description text (from i18n)
       - Progress indicator: "Step 2 of 7"
       - CTA button (Next, Done, Got it - i18n)
       - Skip button (optional)
   - CSS:
     * Spotlight: border-radius + box-shadow glow
     * Popover: absolute positioned relative to target
     * Mobile: popover fixed width, scrollable if needed

10. pwa/src/components/common/LocaleToggle.tsx
    - Dropdown or button toggle: EN / FR
    - Updates getLocale() and re-renders page
    - Placed in Header component

11. Update pwa/src/app/onboarding/page.tsx
    - Integrate useHintTour('phase0-onboarding')
    - Render HintOverlay when isActive
    - Show hints for each step of onboarding

12. Update pwa/src/app/layout.tsx
    - Wrap with LocaleProvider context (exposes locale, setLocale)
    - Load i18n on mount

Types (pwa/src/types/index.ts):

\`\`\`typescript
export interface HintStep {
  targetSelector: string;
  titleKey?: string;
  descriptionKey?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  highlightPadding?: number;
  actionKey?: string;
  allowSkip?: boolean;
}

export interface HintTourConfig {
  tourId: string;
  steps: HintStep[];
  locale: 'en' | 'fr';
}

export interface CompletedTour {
  completed_at: string;
  device_id: string;
}
\`\`\`

Design Notes:
- Earth tone palette: Sage green (#4B5D4D) for spotlight, terracotta (#B25E4C) for glow
- Spotlight padding: 8px around target element
- Popover background: Cream (#FDF8ED), text: Charcoal (#2D312E)
- Button color: Sage green with white text
- Progress: Muted sage text, smaller font
- Mobile-first: popover adapts to screen width

Guidelines:
- Use next-intl or custom i18n solution (keep it simple for Phase 0)
- Translation keys use dot notation (scope.section.key)
- Hints are optional text, visual design is primary
- Spotlight effect uses CSS (no external spotlight library)
- TypeScript strict mode for all types
- No hardcoded colors in components (use Tailwind)

Target:
- Switch language via toggle → UI updates (English ↔ French)
- Onboarding page shows hints (if completed_tours is empty)
- Hint popover displays correctly positioned
- Tutorial text loads from i18n JSON
- French translation complete and accurate
```

---

## What to Expect

After this session:
- ✅ Multi-language UI (English + French) working
- ✅ Visual hint system fully implemented
- ✅ Tour state management with Zustand
- ✅ Hints integrated into onboarding flow
- ✅ Language persistence across sessions
- ✅ Ready for capture flow implementation

## Next Steps

1. Test language toggle (EN/FR)
2. Test onboarding with hints active
3. Verify completed_tours persists after tour completion
4. Test on mobile + desktop (responsive)
5. Commit: `git commit -m "session 8: localization and hint system"`
6. Move to Session 9
