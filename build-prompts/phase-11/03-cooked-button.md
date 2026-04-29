# Prompt 03: "Cooked" Button on Tonight Card

**Persona**: Frontend UX Engineer specializing in meal-validation flows

**Context**:
The `ValidateMealAsync(status=2)` endpoint in the API is fully implemented and updates `recipe.last_cooked_date` when a meal is marked as Cooked. The Tonight card in the Home page has Skip functionality but lacks a "Cooked" button to complete the post-meal validation flow (Step 6 of the 7-step journey in the spec).

**TARGET FILES**:
- `pwa/src/components/home/TonightMenuCard.tsx` (add "Cooked" button on back side)
- `pwa/src/components/home/HomeCommandCenter.tsx` (wire handler)

**FORBIDDEN**:
- Do not modify the Cook's Mode component
- Do not change the Skip Recovery logic

**DELIVERABLES**:
1. Add a "✅ Cooked" button to the back side of `TonightMenuCard` (next to Skip button)
   - Placement: bottom-right corner of the back card, matching Skip button styling
   - Icon: `Check` or `CheckCircle2` from lucide-react (green/sage color)
   - Text: "Cooked" (or "Done Cooking")
   - Callback: `onCooked?: (id: string) => void`
2. In `HomeCommandCenter`, implement `handleCookedMark()`:
   - Get today's date string
   - Call `apiClient.api.schedule.day.byDate(todayDate).validate.post({ status: 2 })`
   - On success: show confirmation (toast or state update)
   - On error: log and retry affordance
3. Wire to handler in parent component JSX
4. Test: Open Home → flip card → tap "Cooked" → API call succeeds → `last_cooked_date` updated

**TDD PROTOCOL**:
- Visual: "Cooked" button appears on card back
- Interaction: Tapping button triggers API call (validate with status=2)
- API: `last_cooked_date` field on recipe is updated to current time
- No need for full E2E yet — just verify the button exists and calls the right endpoint

**VERIFICATION**:
- `npm run lint` passes
- `npm run dev` → Home page → flip card → button visible and clickable
- Network tab: POST to `/api/schedule/day/{date}/validate` with `status: 2` fires on click

**MICRO-HANDOVER**:
- Confirm "Cooked" button placement and styling match Skip button
- Note any edge cases (e.g., what happens if you mark cooked twice)

**Effort**: ~20 minutes. Component addition + handler wiring.

---

## Design Notes

**Styling**: The back card is white with sage/ochre accents. The Cooked button should use sage (matching the "Done" theme) with a checkmark icon. Placement: bottom-right corner, symmetric to Skip button on front.

**Behavior**: Marking as Cooked should:
1. Lock the action (disable button after first tap)
2. Show success feedback (brief toast: "Recipe marked as cooked!")
3. Optionally: advance to next day or show "What's next?" nudge

**Spec Reference**: §2.2.1 "Post-Meal Validation", Step 6 of the 7-step journey.
