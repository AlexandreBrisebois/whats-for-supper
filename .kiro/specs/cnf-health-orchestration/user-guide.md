# User Guide Reference: CNF Health Orchestration

This is a future-facing user documentation reference for the CNF, grocery, search, health profile, and dietitian work. It describes the intended user-visible behavior once the owning specs are implemented.

---

## What Users Get

### Cleaner Search

Users can search in English or French and still find matching recipes in the other language.

Examples:
- Searching `poulet` can find recipes with `chicken`.
- Searching `ground beef` can find recipes with `boeuf hache` or `minced beef`.
- Searching `courgette` can find recipes with `zucchini`.

Recipes stay in their original language. The app uses local food data to understand equivalent ingredients; it does not translate recipe cards with an LLM.

### Cleaner Grocery Lists

When English and French recipes use equivalent ingredients, the grocery list can merge them into one line.

Example:
- Recipe A has `chicken`.
- Recipe B has `poulet`.
- The grocery list shows one item, using the default UI language:
  - English default UI language: `chicken`
  - French default UI language: `poulet`

Recipe text remains untouched. The grocery list is cleaned up for shopping.

### Better Nutrition Signals

When CNF/provider data is available, recipes can get better nutrition estimates even when the source website did not publish nutrition facts.

The app may use this data to support:
- lower sodium search filters,
- lower sugar search filters,
- lower saturated fat search filters,
- better `IsHealthyChoice` decisions,
- better week-level balance information.

### Optional Health Guidance

Health guidance can be disabled. When disabled, core recipe capture, search, planning, and grocery list features continue to work without health-oriented nudges, warnings, or ranking changes.

### Family Health Warnings

Family health profiles own allergies, intolerances, preferences, and health conditions.

Warnings are informational and do not block planning. A meal can stay planned even when a warning exists, especially when the affected family member is not eating that meal:
- hard reminders for possible allergy matches,
- soft warnings for conditions or intolerances,
- info notes for preferences.

Allergy reminders use calm copy such as `Check ingredients for Shellfish: possible match in shrimp`. Absence of a warning does not mean a recipe is allergy-safe.

### Dietitian Phase 2

Later, the dietitian phase adds:
- HEFI weekly score,
- deeper week-level scoring and recommendation logic that reuses family-health ingredient checks,
- weekly recommendation cards for open planner slots.

The app does not replace a dietitian. It nudges meal choices and explains why.

---

## User-Facing Copy Principles

Use calm, specific language:
- `Lower sodium option`
- `Estimated high sodium from ingredients`
- `Vegetable-forward recipe`
- `Matched poulet to chicken`

Avoid moralizing language:
- no standalone `bad`,
- no `guilty`,
- no `junk`,
- no bare `unhealthy` label without a specific reason.

Every health nudge should explain:
- why it appears,
- what data source informed it,
- how confident the app is.

These details should not crowd the main screen. The default view should show one calm sentence. Users who want more detail can tap an information icon to open a tooltip, sheet, or popover with source, confidence, and limitations.

---

## Settings Behavior

### Recipe Language

`IMPORT_TARGET_LANGUAGE=NONE` preserves recipes in the language they were imported with.

### Grocery Display Language

Grocery cleanup follows the existing default UI language configuration.

No grocery-specific locale environment variable is introduced by this work.

If the default UI language is `NONE` or unset, grocery display falls back to English.

### Health Guidance

When health guidance is disabled:
- health warnings are hidden,
- nutrition search filters/boosts are not applied,
- dietitian recommendations are not shown,
- the health agent does not run and no LLM recommendation call is made,
- recipe capture/search/planning/grocery features continue.

---

## Information Details Pattern

Use an information icon for health justification details.

Default surface:
- short reason only,
- no dense nutrition/source blocks,
- no moralizing copy.

Information detail surface:
- reason,
- data source,
- confidence,
- whether nutrition was estimated,
- limitations such as allergy matching availability.

This keeps the app calm for one-thumb planning while still serving users who want to understand the decision.
