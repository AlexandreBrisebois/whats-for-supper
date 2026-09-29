# Tasks: Conservative ingredient normalization

> **Archived — historical reference only.** The tasks, status, and checks below
> are not an active work queue or current authority. See [archive guidance](../README.md).

> **Retired 2026-09-29 at owner request.** This planned package was archived
> without revalidation. Its recorded task status and scope are preserved as
> historical evidence; archive placement does not mark any task complete.

**Status:** Planned. These tasks authorize no implementation by themselves.

## Task 1 — Conservative lexical normalization

**Requirements:** CIN-1, CIN-2

**Outcome:** mechanical same-language spelling variants receive the same
normalized key without removing a purchase-significant descriptor or merging a
translation.

**Authorized files/effects:** `IngredientNormalizer`, its focused tests, and a
private legacy-normalization helper only if required for compatibility. Do not
change database schema, OpenAPI, generated clients, PWA locale behavior, recipe
content, generator prompts, or workflows.

**Tests first:**

1. Preserve current case/diacritic/whitespace cases.
2. Cover each approved apostrophe, hyphen, trademark, punctuation, and explicit
   optional-plural transform.
3. Prove no general singularization and no removal of freshness, frozen state,
   salt, fat, colour, cut, preparation, flavour, or alternatives.
4. Prove `apple` / `pomme` and `broccoli` / `brocoli` remain unequal.

**Checks:** focused normalizer tests and `git diff --check`.

## Task 2 — Deterministic aggregation and safe state transition

**Requirements:** CIN-3, CIN-4

**Dependency:** Task 1.

**Outcome:** equal conservative keys aggregate deterministically, existing
manual aisle classifications remain effective, and a newly merged line cannot
become checked unless every predecessor was checked.

**Authorized files/effects:** `GroceryRecomputeService`, narrowly related
schedule/SSE services, existing category lookup service only for the required
compatibility path, and focused API/integration tests. Do not add a registry,
schema migration, API contract change, PWA change, LLM call, or category UI.

**Tests first:**

1. An approved mechanical pair aggregates with compatible units; protected
   pairs (`blueberries` / `fresh blueberries`, salted / unsalted butter) do not.
2. Legacy manual category lookup remains effective after normalization changes.
3. Reordered source events yield identical display name, section, unit,
   recipe-ID order, and persisted line order.
4. Two predecessor states map to checked only when both are checked; obsolete
   keys are removed and the published `grocery_updated` payload matches storage.
5. Recompute has no `IChatClient` or network dependency.

**Checks:** focused API and integration tests, existing category-reclassification
regression test, and `git diff --check`.
