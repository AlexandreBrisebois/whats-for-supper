# Prompt 01: Grocery Tab Wiring (Quick Seam Fix)

**Persona**: Frontend Integration Engineer

**Context**:
The `GroceryList` component was fully built in Phase 10 (Prompt 05) with aisle grouping, fuzzy ingredient matching, and JSONB state persistence. However, the Planner page's Grocery tab still renders a "Coming soon" placeholder instead of the actual component.

**TARGET FILES**:
- `pwa/src/app/(app)/planner/page.tsx` (lines 569–586: replace placeholder)

**FORBIDDEN**:
- Do not modify `GroceryList.tsx` or any grocery logic
- Do not touch the planner store

**DELIVERABLES**:
1. Replace the Grocery tab placeholder with a `<GroceryList>` component invocation
   - Pass `weekOffset={currentWeekOffset}`
   - Pass `ingredients={/* extract from schedule */}`
   - Wire `onClose={() => setActiveTab('planner')}` to close back to Planner tab
2. Extract the full list of unique ingredients from the week's planned recipes
   - Iterate `schedule` array, collect all `recipe.ingredients[]`
   - Deduplicate and pass to `GroceryList`
3. Test: Switch to Grocery tab → see aisle-grouped checklist instead of "Coming soon"

**TDD PROTOCOL**:
- Visual: Grocery tab shows interactive checklist
- Functional: Toggle an ingredient → state updates (no need to test persistence, already verified in Prompt 05)

**VERIFICATION**:
- `npm run lint` passes
- `npm run dev` → navigate to Planner → click Grocery tab → see component

**MICRO-HANDOVER**:
- Confirm Grocery tab wiring complete
- Note any ingredient extraction edge cases

**Effort**: ~15 minutes. This is a pure wiring task.
