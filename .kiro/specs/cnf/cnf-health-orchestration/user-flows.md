# User Flows Reference: CNF Health Orchestration

This document describes the main user journeys enabled by the CNF, search, grocery, family health, and dietitian specs.

---

## Flow 1: Search Across English And French Recipes

**Goal:** A user searches in one language and finds relevant recipes in another.

1. User opens recipe search.
2. User enters `poulet`.
3. Search expands locally through provider aliases.
4. English recipes containing `chicken` are eligible.
5. Results may show a short reason: `Matched poulet to chicken`.
6. Recipe text remains in its original language.

Success criteria:
- Search works without LLM translation.
- Results are understandable.
- The original query remains visible to the user.

---

## Flow 2: Search From Pantry Photo

**Goal:** Pantry/photo search finds recipes even when pantry and recipe ingredients use different terms.

1. User captures pantry ingredients.
2. Pantry snapshot includes `boeuf hache`.
3. Recipe library includes recipes with `ground beef`.
4. Both terms resolve to the same provider food identity.
5. Recipe receives a bounded inventory boost.
6. Search reason uses contract-safe `inventory-fit`.

Success criteria:
- Pantry matching improves recall.
- It does not dominate relevance.
- Pantry snapshots remain in memory only.

---

## Flow 3: Clean Bilingual Grocery List

**Goal:** A bilingual weekly plan creates one clean shopping line per equivalent ingredient.

1. User plans one English recipe with `chicken`.
2. User plans one French recipe with `poulet`.
3. Grocery recompute extracts both raw ingredients.
4. Both normalized keys map to the same provider food identity.
5. Grocery recompute merges compatible unit buckets.
6. Display label follows the default UI language:
   - English default: `chicken`
   - French default: `poulet`
7. Checked state is preserved if either source item was already checked.

Success criteria:
- Grocery list is cleaner.
- Recipe content is unchanged.
- Checked items do not reset.

---

## Flow 4: Disable Health Guidance

**Goal:** A user who only wants recipe/search/planning can avoid health-oriented steering.

1. User opens settings.
2. User disables health guidance.
3. Recipe capture still works.
4. Recipe search still works.
5. Planner still works.
6. Grocery list still works.
7. Health warnings, health filters, health ranking boosts, and dietitian nudges are hidden/suppressed.

Success criteria:
- The app does not nag.
- Core supper-planning workflows remain intact.

---

## Flow 5: Family Health Warning

**Goal:** A family manager sees a warning before planning a recipe that may conflict with a family member's profile.

1. User adds a health profile for a family member.
2. Profile includes conditions, allergies, intolerances, and/or preferences.
3. User browses discovery or opens the planner.
4. The app evaluates recipe dietary profile and nutrition data.
5. Recipe card or planner slot shows a non-blocking warning indicator.
6. User taps the indicator to see the reason and affected family member.
7. User may keep the meal planned if the household decides the recipe is acceptable; warnings are there to support planning awareness, not to block or auto-decide.

Success criteria:
- Warning is visible but not blocking.
- Reason names the relevant family member and condition/preference/allergen.
- Allergy copy says "check ingredients" / "possible match"; it does not assert that the recipe is unsafe or safe.
- Absence of a warning is not presented as allergy-safe.

---

## Flow 6: Nutrition-Aware Search

**Goal:** A user narrows search to recipes that better fit a simple health goal.

1. User opens search filters.
2. User chooses a filter such as lower sodium.
3. Search applies deterministic `fopFlags`.
4. Recipes with unknown nutrition are excluded from that filter.
5. Applied filters are shown.
6. If a health reason is shown, it includes reason/source/confidence.
7. Source/confidence details are available behind an information icon, not shown inline by default.

Success criteria:
- The filter is honest about unknown nutrition.
- Copy is calm and non-moralizing.
- Health guidance opt-out disables this behavior.
- Detail metadata does not clutter search results.

---

## Flow 7: Weekly Dietitian Recommendation

**Goal:** A user with an unbalanced week gets a few helpful suggestions for open slots.

1. User creates or edits a weekly plan.
2. Grocery recompute updates balance summary.
3. Week is unbalanced and has open dinner slots.
4. Recommendation processor builds a compact context.
5. LLM suggests 1-3 recipes from the user's own library.
6. Suggestions appear as non-blocking cards.
7. User may ignore, dismiss, or open a suggested recipe.
8. User can tap an information icon to see source/confidence/limitations.

Success criteria:
- Suggestions are not auto-assigned.
- Reason is short and practical.
- Token use is bounded and cached by balance state.
- If health guidance is disabled, the health agent does not run and no LLM call is made.
- Justification details are available behind an information icon, not shown inline by default.

---

## Flow 8: Ingredient-Level Allergy Matching

**Goal:** Family-health warnings catch possible ingredient-level allergen risks without blocking planning.

1. Family member profile includes an allergy or intolerance.
2. Recipe ingredients are resolved through provider identity and synonym tables.
3. Ingredient-level allergen match emits a member-specific "check ingredients" reminder.
4. Protein-source fallback remains available for unmatched ingredients.

Success criteria:
- Matching is deterministic.
- Warning level follows `family-health-profiles`.
- The app does not claim safety from absence of warning.
- The app does not prevent planning; reminders support household awareness and do not depend on a recorded meal-attendance model.
